/* Avicularia Testing v221: camera-only gallery, 0–2 NEW JPEG snapshots (legacy third preserved) per product. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MAX_URL=170000;
const states={new:makeState(),edit:makeState()};
function makeState(){return {images:[null,null,null],no_data:false,visible:false,busy:0,stream:null,token:0,slot:-1,zoom:1,zoomMin:1,zoomMax:3,zoomStep:.25,zoomMode:'digital',shooting:false};}
function message(which,text=''){const node=$(which+'-gallery-message');if(node)node.textContent=text;}
function stop(which){const s=states[which];s.token++;s.slot=-1;try{s.stream?.getTracks().forEach(t=>t.stop());}catch(_){}s.stream=null;s.zoom=1;s.zoomMode='digital';s.shooting=false;}
function render(which){
 const s=states[which],no=$(which+'-gallery-no-data'),show=$(which+'-gallery-visible');
 no.checked=s.no_data;show.checked=s.visible;
 $(which+'-gallery-visible-text').textContent='Показати';
 // Both checkboxes keep independent values, but "Показати" disappears when no data exist.
 show.closest('.av-gallery-show-label').hidden=s.no_data;
 $(which+'-gallery-slots').hidden=s.no_data||!s.visible;
 $(which+'-gallery-slots').querySelectorAll('.av-gallery-slot').forEach((slot,i)=>{
  // Previously saved third photographs stay accessible only for review/deletion;
  // never offer a third capture slot for new or edited products.
  if(i===2)slot.hidden=!s.images[2];
  const video=slot.querySelector('video'),img=slot.querySelector('img'),hint=slot.querySelector('span');
  const shoot=slot.querySelector('.av-gallery-shoot'),remove=slot.querySelector('.av-gallery-remove');
  const active=!!s.stream&&s.slot===i;
  const zoomBar=slot.querySelector('.av-gallery-zoom');
  if(zoomBar){zoomBar.hidden=!active;zoomBar.querySelector('.av-gallery-zoom-value').textContent=Number(s.zoom.toFixed(2))+'×';
    zoomBar.querySelector('.av-gallery-zoom-out').disabled=!active||s.zoom<=s.zoomMin+.001;
    zoomBar.querySelector('.av-gallery-zoom-in').disabled=!active||s.zoom>=s.zoomMax-.001;}
  if(video)video.style.transform=active&&s.zoomMode==='digital'?`scale(${s.zoom})`:'';
  video.hidden=!active;img.hidden=active||!s.images[i];hint.hidden=active||!!s.images[i];
  if(s.images[i]&&!active)img.src=s.images[i];else img.removeAttribute('src');
  if(!active){try{video.pause();}catch(_){}video.srcObject=null;}
  shoot.hidden=!active;remove.hidden=active||!s.images[i];
  const preview=slot.querySelector('.av-gallery-preview');
  preview.setAttribute('aria-label',active?'Зупинити камеру':s.images[i]?`Фото ${i+1} збережене. Видаліть його перед повторною зйомкою.`:`Увімкнути камеру ${i+1}`);
 });
}
function reset(which){stop(which);const token=states[which].token;Object.assign(states[which],makeState(),{token});message(which);render(which);}
function load(which,g){stop(which);const s=states[which];s.images=(Array.isArray(g?.images)?g.images:[null,null,null]).slice(0,3);while(s.images.length<3)s.images.push(null);s.no_data=g?.no_data===true;s.visible=g?.visible===true;s.busy=0;message(which);render(which);}
function collect(which){
 const s=states[which];
 if(s.busy){message(which,'Дочекайтеся обробки фотографій.');return null;}
 if(s.images.some(x=>x!==null&&(typeof x!=='string'||x.length>MAX_URL))){message(which,'Фотографія завелика. Зробіть інший знімок.');return null;}
 return {no_data:s.no_data,visible:s.visible,images:s.no_data?[null,null,null]:[...s.images]};
}
function compressImage(file){return new Promise((resolve,reject)=>{
 if(!file||!String(file.type).startsWith('image/')){reject(Error('Очікується фотографія.'));return;}
 const url=URL.createObjectURL(file),img=new Image();
 img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Не вдалося обробити фотографію.'));};
 img.onload=()=>{
  URL.revokeObjectURL(url);
  const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h){reject(Error('Порожнє зображення.'));return;}
  let data='';
  try{
   for(const maxSide of [1280,1100,950,800,650]){
    const scale=Math.min(1,maxSide/Math.max(w,h)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
    const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas недоступний.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    for(const q of [.79,.65,.5,.37]){data=c.toDataURL('image/jpeg',q);if(data.length<=MAX_URL){resolve(data);return;}}
   }
   reject(Error('Фотографія завелика навіть після стиснення.'));
  }catch(e){reject(e);}
 };
 img.src=url;
});}
async function assign(which,index,file,token){
 const s=states[which];s.busy++;message(which,'Обробка фотографії…');
 try{
  const image=await compressImage(file);
  if(token!==s.token)return;
  s.images[index]=image;render(which);message(which);
 }catch(e){if(token===s.token)message(which,String(e.message||e));}
 finally{s.busy=Math.max(0,s.busy-1);}
}
async function start(which,index){
 if(index>=2)return;
 const s=states[which];if(s.images[index])return;
 stop(which);const token=s.token;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){message(which);return;}
 try{
  // If iOS already exposes device labels, pin one rear camera instead of asking
  // for a generic multi-lens environment stream; never restart an active preview.
  let videoConstraints={facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}};
  try{
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&d.deviceId);
    const rear=devices.filter(d=>/back|rear|задн|wide/i.test(d.label)&&!/front|ultra.?wide|tele|macro|передн/i.test(d.label));
    if(rear.length)videoConstraints={deviceId:{exact:rear[0].deviceId},width:{ideal:1920},height:{ideal:1080}};
  }catch(_){/* Device enumeration is optional. */}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});}
  catch(error){
    if(!videoConstraints.deviceId)throw error;
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  }
  if(token!==s.token||s.no_data||!s.visible||!(which==='new'?($('add-product-modal')?.classList.contains('active')):$('edit-product-modal')?.classList.contains('active'))){stream.getTracks().forEach(t=>t.stop());return;}
  s.stream=stream;s.slot=index;
  s.zoom=1;s.zoomMin=1;s.zoomMax=3;s.zoomStep=.25;s.zoomMode='digital';
  const track=stream.getVideoTracks()[0];
  let caps=null;try{if(typeof track?.getCapabilities==='function')caps=track.getCapabilities();}catch(_){/* Safari can omit camera capabilities. */}
  if(caps?.zoom&&Number.isFinite(caps.zoom.min)&&Number.isFinite(caps.zoom.max)&&caps.zoom.max>caps.zoom.min){
    s.zoomMin=Math.max(.1,caps.zoom.min);s.zoomMax=caps.zoom.max;
    s.zoomStep=Math.max(.05,caps.zoom.step||.25);s.zoom=Math.max(s.zoomMin,Math.min(s.zoomMax,track.getSettings?.().zoom||s.zoomMin));
    s.zoomMode='native';
  }
  render(which);
  const video=$(which+'-gallery-slots').querySelectorAll('video')[index];video.srcObject=stream;
  await video.play();if(token!==s.token)stop(which);
 }catch(e){stop(which);message(which);}
}
async function shoot(which,index){
 const s=states[which];if(!s.stream||s.slot!==index||s.shooting)return;
 const video=$(which+'-gallery-slots').querySelectorAll('video')[index];
 if(!video.videoWidth||!video.videoHeight){message(which,'Камера ще не готова.');return;}
 const shootButton=$(which+'-gallery-slots').querySelectorAll('.av-gallery-shoot')[index];
 const captureToken=s.token;
 s.shooting=true;
 shootButton?.classList.add('av-shoot-success');
 const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;
 const ctx=c.getContext('2d');
 if(s.zoomMode==='digital'&&s.zoom>1){
  const width=video.videoWidth/s.zoom,height=video.videoHeight/s.zoom;
  ctx.drawImage(video,(video.videoWidth-width)/2,(video.videoHeight-height)/2,width,height,0,0,c.width,c.height);
 }else ctx.drawImage(video,0,0,c.width,c.height);
 // Capture before stopping the stream; stale capture is discarded on later cancellation.
 try{
   // Show the confirmation before the shutter disappears; capture only once.
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.92));
   await new Promise(resolve=>setTimeout(resolve,550));
   if(captureToken!==s.token)return; // Camera may have been closed while encoding.
   stop(which);const token=s.token;render(which);
   if(blob)await assign(which,index,blob,token);
   else message(which,'Не вдалося зробити фото.');
 }finally{
   shootButton?.classList.remove('av-shoot-success');
   s.shooting=false;
 }
}
for(const which of ['new','edit']){
 const s=states[which];
 $(which+'-gallery-no-data').addEventListener('change',e=>{
  const checked=e.target.checked;
  if(checked&&s.images.some(Boolean)&&!window.confirm('У галереї є фотографії. Позначити «Немає даних» і видалити їх під час збереження?')){e.target.checked=false;return;}
  s.no_data=checked;stop(which);render(which);message(which);
 });
 $(which+'-gallery-visible').addEventListener('change',e=>{s.visible=e.target.checked;stop(which);render(which);message(which);});
 $(which+'-gallery-slots').querySelectorAll('.av-gallery-slot').forEach((slot,i)=>{
  slot.querySelector('.av-gallery-preview').addEventListener('click',()=>{
   if(s.images[i]){window.AvPhotoLightbox?.open(s.images[i],slot.querySelector('.av-slot-caption')?.textContent||`Фото ${i+1}`);return;}
   if(i>=2)return;
   if(s.stream&&s.slot===i){stop(which);render(which);}else start(which,i);
  });
  const zoomTo=async(direction,button)=>{
    if(!s.stream||s.slot!==i){return;}
    const next=Math.max(s.zoomMin,Math.min(s.zoomMax,Number((s.zoom+direction*s.zoomStep).toFixed(3))));
    if(next===s.zoom)return;
    if(s.zoomMode==='native'){
      try{await s.stream.getVideoTracks()[0].applyConstraints({advanced:[{zoom:next}]});}
      catch(_){message(which,'Камера не дозволила змінити масштаб.');return;}
    }
    s.zoom=next;render(which);
    button.classList.add('av-feedback-pressed');setTimeout(()=>button.classList.remove('av-feedback-pressed'),200);
  };
  slot.querySelector('.av-gallery-zoom-out')?.addEventListener('click',e=>void zoomTo(-1,e.currentTarget));
  slot.querySelector('.av-gallery-zoom-in')?.addEventListener('click',e=>void zoomTo(1,e.currentTarget));
  slot.querySelector('.av-gallery-shoot').addEventListener('click',()=>shoot(which,i));
  slot.querySelector('.av-gallery-remove').addEventListener('click',async event=>{
   const button=event.currentTarget;
   if(button.disabled||!window.confirm('Дійсно хочете видалити фото?'))return;
   const token=s.token;
   button.disabled=true;
   button.classList.add('av-remove-flash');
   try{
     await new Promise(resolve=>setTimeout(resolve,420));
     if(token!==s.token)return; // Closed or reset while feedback was visible.
     stop(which);s.images[i]=null;render(which);message(which);
   }finally{
     button.classList.remove('av-remove-flash');
     button.disabled=false;
   }
  });
 });
 reset(which);
}
window.AvProductGallery={collect,load,reset,stopAll(){stop('new');stop('edit');render('new');render('edit');}};
window.addEventListener('pagehide',()=>window.AvProductGallery.stopAll());
$('add-product-cancel')?.addEventListener('click',()=>window.AvProductGallery.stopAll());
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.AvProductGallery.stopAll();});
})();
