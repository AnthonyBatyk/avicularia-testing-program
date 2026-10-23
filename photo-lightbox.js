/* Avicularia Testing v223: read-only photo lightbox, zoom/pinch/pan only after tapping the preview. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('av-gallery-lightbox'),stage=$('av-gallery-lightbox-stage'),frame=$('av-gallery-lightbox-frame'),img=$('av-gallery-lightbox-image');
if(!root||!stage||!frame||!img)return;
const controls={close:$('av-gallery-lightbox-close'),plus:$('av-gallery-lightbox-plus'),minus:$('av-gallery-lightbox-minus'),reset:$('av-gallery-lightbox-reset')};
let scale=1,dx=0,dy=0,focusBefore=null,lastPinch=null,closeTimer=null;
const pointers=new Map();
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
// The stationary clipping frame matches the unzoomed image's actual dimensions.
// Only the image INSIDE is transformed; the 11px border radius never scales away.
function fitFrame(){
 const iw=img.naturalWidth, ih=img.naturalHeight;
 const sw=stage.clientWidth, sh=stage.clientHeight;
 if(!iw||!ih||!sw||!sh||root.hidden)return;
 const fit=Math.min(1,sw/iw,sh/ih);
 frame.style.width=`${iw*fit}px`;
 frame.style.height=`${ih*fit}px`;
 view();
}
function view(){scale=clamp(scale,1,6);if(scale===1){dx=0;dy=0;}
 const maxX=frame.clientWidth*(scale-1)/2,maxY=frame.clientHeight*(scale-1)/2;
 dx=clamp(dx,-maxX,maxX);dy=clamp(dy,-maxY,maxY);
 img.style.transform=`translate(${dx}px,${dy}px) scale(${scale})`;
 if(controls.reset)controls.reset.textContent=`${Math.round(scale*100)}%`;
}
function zoom(k){scale=clamp(scale*k,1,6);view();}
function close(){if(root.hidden)return;
 if(closeTimer){clearTimeout(closeTimer);closeTimer=null;}
 controls.close?.classList.remove('av-ui-pressed','button-status-error','button-status-entering');
 if(controls.close){controls.close.textContent='Закрити';controls.close.disabled=false;}
 window.dispatchEvent(new CustomEvent('av:lightbox-close'));root.hidden=true;document.body.classList.remove('av-photo-lightbox-open');img.removeAttribute('src');img.style.transform='';frame.style.width='';frame.style.height='';pointers.clear();lastPinch=null;
 if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});focusBefore=null;}
function open(src,label,context=''){if(typeof src!=='string'||!src.startsWith('data:image/'))return;
 window.dispatchEvent(new CustomEvent('av:lightbox-open',{detail:{context}}));
 focusBefore=document.activeElement;root.hidden=false;document.body.classList.add('av-photo-lightbox-open');img.src=src;$('av-gallery-lightbox-label').textContent=label||'Фото продукту';
 scale=1;dx=0;dy=0;pointers.clear();lastPinch=null;view();if(img.complete&&img.naturalWidth)fitFrame();stage.focus({preventScroll:true});}
img.addEventListener('load',fitFrame);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitFrame).observe(stage);
else window.addEventListener('resize',fitFrame);
function animatedButton(button){if(!button)return;button.classList.add('av-ui-pressed');
 setTimeout(()=>button.classList.remove('av-ui-pressed'),200);}
controls.close?.addEventListener('click',()=>{
 if(controls.close.disabled)return;
 controls.close.disabled=true;
 controls.close.textContent='Закрито';
 void controls.close.offsetWidth;
 controls.close.classList.add('button-status-error','button-status-entering');
 closeTimer=setTimeout(close,720);
});
controls.plus?.addEventListener('click',()=>{animatedButton(controls.plus);zoom(1.4);});
controls.minus?.addEventListener('click',()=>{animatedButton(controls.minus);zoom(1/1.4);});
controls.reset?.addEventListener('click',()=>{animatedButton(controls.reset);scale=1;view();});
document.addEventListener('keydown',event=>{if(root.hidden)return;
 if(event.key==='Escape'){event.stopPropagation();close();}
 else if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.4);}
 else if(event.key==='-'){event.preventDefault();zoom(1/1.4);}
},{capture:true});
stage.addEventListener('wheel',event=>{if(root.hidden)return;event.preventDefault();zoom(event.deltaY<0?1.15:1/1.15);},{passive:false});
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
stage.addEventListener('pointerdown',event=>{if(root.hidden)return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});stage.setPointerCapture(event.pointerId);
 if(pointers.size>=2){const [a,b]=[...pointers.values()];lastPinch=distance(a,b);}
});
stage.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;
 const old=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size>=2){const [a,b]=[...pointers.values()],d=distance(a,b);
 if(lastPinch&&lastPinch>1){scale*=d/lastPinch;view();}lastPinch=d;
 }else if(scale>1){dx+=event.clientX-old.x;dy+=event.clientY-old.y;view();}
});
for(const end of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(end,event=>{
 pointers.delete(event.pointerId);lastPinch=null;
});
stage.addEventListener('dblclick',()=>zoom(scale>1?1/scale:2));
window.AvPhotoLightbox={open,close};
})();
