/* Avicularia v241 — six-file powerlifting archive, own IndexedDB + independent D1.
 * The original six UTF-8 JSON files are retained byte-for-byte until replaced.
 * Day comments are stored separately; completed ZIP is a derived view. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const NAMES=['00_manifest.json','01_profile.json','02_current_state.json','03_history.json','04_plan.json','05_completed_plan.json'];
const API='https://avicularia-api-testing.anthonybatyk.workers.dev';
const DB_NAME='avicularia_testing_training_storage_v1', STORE='archives', MAX_FILE=16*1024*1024, MAX_PACKAGE=48*1024*1024, MAX_ZIP=48*1024*1024;
let user='',record=null,revision=null,dirty=false,dbPromise=null,waiting=false,conflict=false,queue=Promise.resolve(),timer=0,epoch=0,selected='',mode='',editing=null,lastServerConfirmedAt=0;
const feedback=(button,message,tone='success')=>button&&window.kbjvButtonFeedback?.show(button,message,tone,1600);
const status=(message,tone='')=>{const el=$('training-status');el.textContent=message;el.dataset.tone=tone;notify();};
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const emptyFiles=()=>Object.fromEntries(NAMES.map(k=>[k,null]));
const safeName=n=>NAMES.includes(n);
const versionName=(name,v)=>name.replace(/\.json$/,`_v${Math.max(1,Math.floor(Number(v)||1))}.json`);
const canonicalName=(name)=>NAMES.find(n=>n===name||new RegExp(`^${n.replace(/\.json$/,'')}(?:_v\\d+|-version-\\d+)\\.json$`,'i').test(name))||null;
let selectedButton=null;

const bytes=s=>new TextEncoder().encode(s).length;
const now=()=>new Date().toISOString();
const version=()=>record?.version||0;
const timestamp=()=>record?.updatedAt||'';
const view=()=>({version:version(),updatedAt:timestamp(),importedAt:record?.lastImportedAt||null,loaded:Boolean(user),sync:!navigator.onLine?'Офлайн':conflict?'Конфлікт':dirty?'Очікує синхронізації':revision===null?'Очікування':Date.now()-lastServerConfirmedAt<120000?'Синхронізовано':'Очікування перевірки',planBytes:record?bytes(JSON.stringify(record)):0,pdfBytes:0});
window.kbjvTrainingInfo={snapshot:view};
const notify=()=>window.dispatchEvent(new Event('training:stats'));
const log=kind=>window.dispatchEvent(new CustomEvent('training:action',{detail:{type:kind,archiveVersion:version()}}));
function fileJSON(name,text){
 if(typeof text!=='string'||bytes(text)>MAX_FILE)throw Error(`${name}: перевищено допустимий розмір файлу.`);
 let data;try{data=JSON.parse(text);}catch(_){throw Error(`${name}: некоректний JSON.`);}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error(`${name}: очікувався JSON-об'єкт.`);
 if(name==='00_manifest.json'&&(data.format!=='monderight-powerlifting-archive'||data.archive_format_version!==1))throw Error('Формат архіву в маніфесті не підтримується.');
 if(name==='04_plan.json'&&(data.format!=='kbjv-training-plan'||!Array.isArray(data.days)||data.days.length>80))throw Error('У 04_plan.json відсутня структура плану.');
 return data;
}
const present=r=>r&&NAMES.some(k=>r.files?.[k]!=null);
function validateRecord(r){if(!r||!r.files||!r.notes||!Number.isSafeInteger(r.version))throw Error('Пошкоджений запис архіву.');let total=0;for(const n of NAMES)if(r.files[n]!=null){fileJSON(n,r.files[n]);total+=bytes(r.files[n]);}if(total>MAX_PACKAGE||bytes(JSON.stringify(r))>MAX_PACKAGE)throw Error('Архів перевищує 48 МіБ. Збережіть резервний ZIP та зменште окремі файли.');}
async function digest(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function checkManifest(files,sourceNames={}){
 const manifest=fileJSON('00_manifest.json',files['00_manifest.json']);
 for(const n of NAMES.slice(1)){
  if(!files[n])throw Error(`В архіві немає файлу ${n}.`);
  fileJSON(n,files[n]);
  // Archive handoffs may contain both legacy canonical and updated versioned
  // checksums. Verify against the entry matching the ACTUAL ZIP filename.
  const declared=sourceNames[n]||n;
  const expected=(manifest.files?.[declared]||manifest.files?.[n])?.sha256;
  if(expected&&expected!==await digest(files[n]))throw Error(`SHA-256 файлу ${n} не збігається з 00_manifest.json.`);
 }
 return manifest;
}
function saveFile(name,text){const b=new Blob([text],{type:'application/json;charset=utf-8'});saveBlob(b,versionName(name,version()));}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4500);}
function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IndexedDB недоступна'));req.onblocked=()=>reject(Error('Закрийте інші вкладки сайту.'));});return dbPromise;}
async function localGet(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const q=tx.objectStore(STORE).get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});}
async function localPut(id,value){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
function token(){for(const st of [localStorage,sessionStorage])for(const key of ['avicularia_testing_auth_session','avicularia_testing_auth_session_temp']){try{const s=JSON.parse(st.getItem(key)||'null');if(s?.token&&String(s.user?.id)===user)return s.token;}catch(_){}}return '';}
async function archiveApi(path,method='GET',body){
 const jwt=token();if(!jwt)throw Error('Необхідний активний акаунт.');
 const res=await fetch(`${API}${path}`,{method,headers:{Authorization:`Bearer ${jwt}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 let j={};try{j=await res.json();}catch(_){}
 if(!res.ok){const e=Error(j.error||`HTTP ${res.status}; перевірте Worker v110`);e.status=res.status;throw e;}
 return j;
}
function archiveChunkText(text){
 const out=[];let i=0;
 while(i<text.length){let end=Math.min(text.length,i+190000);
  if(end<text.length){const last=text.charCodeAt(end-1);if(last>=0xD800&&last<=0xDBFF)end--;}
  const part=text.slice(i,end);if(!part)throw Error('Не вдалося розділити архів.');
  if(bytes(part)>850*1024)throw Error('Одна частина архіву перевищила ліміт Worker.');
  out.push(part);i=end;
 }
 return out;
}
async function remote(method='GET',body){
 if(method==='META'||method==='GET'){
  let info;
  try{info=await archiveApi('/avicularia/archive/v2');}
  catch(err){if(err.status===404)throw Error('Спочатку оновіть тестовий Worker до v109.');throw err;}
  if(method==='META')return {revision:info.revision,present:info.present};
  if(info.mode==='legacy')return archiveApi('/avicularia/archive');
  if(info.mode!=='chunks'||!Number.isSafeInteger(info.chunk_count)||info.chunk_count<1||info.chunk_count>320)
   throw Error('Некоректний індекс серверного архіву.');
  let parts=[];let length=0;
  for(let i=0;i<info.chunk_count;i++){
   const part=await archiveApi(`/avicularia/archive/v2/chunk/${i}?generation=${encodeURIComponent(info.generation)}`);
   if(part.index!==i||typeof part.payload!=='string'||part.byte_size!==bytes(part.payload)||
      part.digest!==await digest(part.payload))throw Error('Не збігається контрольна сума частини серверного архіву.');
   parts.push(part.payload);length+=part.byte_size;
  }
  if(length!==info.byte_size)throw Error('Розмір серверного архіву не збігається.');
  const raw=parts.join('');parts=null;
  if(await digest(raw)!==info.digest)throw Error('SHA-256 серверного архіву не збігається. Локальні дані збережено.');
  let value;try{value=JSON.parse(raw);}catch(_){throw Error('Серверний архів має пошкоджений JSON.');}
  if(value!==null)validateRecord(value);
  return {revision:info.revision,value,updated_at:info.updated_at};
 }
 if(method==='POST'){
  const {base_revision,value}=body;
  if(value!==null)validateRecord(value);
  const serialized=JSON.stringify(value);
  if(bytes(serialized)>MAX_PACKAGE)throw Error('Архів перевищує 48 МіБ.');
  const pieces=archiveChunkText(serialized);
  const started=await archiveApi('/avicularia/archive/v2/start','POST',{
   base_revision,byte_size:bytes(serialized),chunk_count:pieces.length,digest:await digest(serialized)
  });
  for(let index=0;index<pieces.length;index++){
   await archiveApi('/avicularia/archive/v2/chunk','POST',{
    upload_id:started.upload_id,index,payload:pieces[index]
   });
  }
  // Failed/interrupted uploads remain staged; they NEVER replace active data.
  return archiveApi('/avicularia/archive/v2/commit','POST',{upload_id:started.upload_id});
 }
 throw Error('Невідома дія синхронізації тренувань.');
}

// A presentation-only interpretation; original JSON bytes remain untouched.
const PREVIEW_LABELS={
 format:'Формат',archive_format_version:'Версія формату',file_version:'Версія файлу',
 version:'Версія',generated_at:'Створено',exported_at:'Вивантажено',purpose:'Призначення',
 files:'Файли архіву',website_state:'Стан сайту',sha256:'Контрольна сума SHA-256',
 athlete:'Спортсмен',display_name:'Ім’я',sport:'Вид спорту',schedule:'Графік тренувань',
 training_days:'Дні тренувань',snapshot_date:'Дата актуального стану',
 health:'Здоров’я',recovery:'Відновлення',status:'Статус',note:'Примітка',
 history_policy:'Правила історії',events:'Події',title:'Назва плану',period:'Період',
 plan_id:'Ідентифікатор плану',source_plan_id:'План-джерело',days:'Тренувальні дні',
 day:'Номер дня',exercises:'Вправи',name:'Назва',sets:'Підходи',reps:'Повторення',
 weight:'Вага',comment:'Коментар',last_updated:'Останнє оновлення',
 archive_version:'Версія архіву',file_versions:'Версії файлів',file_names:'Назви файлів',
 mode:'Режим',date:'Дата',description:'Опис',result:'Результат',
 weight_kg:'Вага (кг)',bodyweight:'Вага тіла',sleep:'Сон',rpe:'RPE'
};
const previewLabel=key=>PREVIEW_LABELS[key]||String(key).replaceAll('_',' ');
// Keep the original compact slash-separated visual format. Units come from
// source values: do not label a duration or clock time as a weight.
function trainingSetText(entry){
 const parts=[];
 const value=(v)=>v===null||v===undefined?'':String(v).trim();
 const sets=value(entry.sets),reps=value(entry.reps),weight=value(entry.weight);
 const missing=v=>!v||v==='—';
 const isDuration=v=>/^\d+(?:[.,]\d+)?\s*(?:с|сек(?:унд[аи]?)?|хв(?:илин[аи]?)?|год(?:ин[аи]?)?|s|sec|min|h)$/iu.test(v);
 const isClock=v=>/^\d{1,2}:\d{2}(?::\d{2})?$/.test(v);
 if(!missing(sets))parts.push(`Підходи: ${sets}`);
 if(!missing(reps))parts.push(`${isDuration(reps)?'Час':'Повторення'}: ${reps}`);
 if(!missing(weight))parts.push(`${isDuration(weight)||isClock(weight)?'Час':'Вага'}: ${weight}`);
 return parts.join(' / ')||'Не вказано';
}
// Display warmups in ascending kg order without modifying uploaded plan JSON.
// For nonnumeric weights (e.g. time, bodyweight or ranges), preserve source order.
function orderedTrainingWarmups(sets){
 const ordered=[...sets];
 const numericKg=entry=>{
  const raw=String(entry?.weight??'').trim();
  const match=raw.match(/^(\d+(?:[.,]\d+)?)\s*(?:кг|kg)?$/iu);
  return match?Number(match[1].replace(',','.')):null;
 };
 if(ordered.every(item=>numericKg(item)!==null))
  ordered.sort((a,b)=>numericKg(a)-numericKg(b));
 return ordered;
}
function trainingSetBlock(parent,exercise){
 // Non-exercise entries (e.g. scheduled massage with zero sets) are events,
 // not training work sets. Keep their source data visible without inventing sets.
 if(Number(exercise.sets)===0&&!exercise.warmup_sets?.length){
  const item=document.createElement('div');item.className='av-exercise-set-group';
  previewText(item,/^\d{1,2}:\d{2}(?::\d{2})?$/.test(String(exercise.weight||''))?'Час:':'Деталі:','av-exercise-set-label');
  previewText(item,String(exercise.weight||exercise.reps||'Не вказано'),'av-exercise-set-value');
  parent.append(item);return;
 }
 if(Array.isArray(exercise.warmup_sets)&&exercise.warmup_sets.length){
  const warmup=document.createElement('div');warmup.className='av-exercise-set-group av-exercise-warmups';
  previewText(warmup,'Розминочні підходи:','av-exercise-set-label');
  orderedTrainingWarmups(exercise.warmup_sets).forEach(set=>previewText(warmup,trainingSetText(set),'av-exercise-set-value'));
  parent.append(warmup);
 }
 const work=document.createElement('div');work.className='av-exercise-set-group';
 previewText(work,'Робочий підхід:','av-exercise-set-label');
 previewText(work,trainingSetText(exercise),'av-exercise-set-value');parent.append(work);
}

function previewText(target,content,css='av-preview-value'){
 const el=document.createElement('div');el.className=css;el.textContent=String(content??'—');target.append(el);return el;
}
function renderPreviewValue(parent,label,value,depth=0){
 if(depth>9)return;
 const section=document.createElement('section');section.className='av-preview-section';
 if(/(?:коментар|comment|comments|notes)/iu.test(String(label)))section.classList.add('av-readonly-comment');
 previewText(section,label,'av-preview-caption');
 if(value===null||value===undefined){previewText(section,'—');}
 else if(Array.isArray(value)){
  if(!value.length)previewText(section,'Записів немає.');
  else for(const [i,v] of value.entries()){
   if(i>=250){previewText(section,`Решту ${value.length-i} записів приховано.`, 'av-preview-meta');break;}
   const row=document.createElement('div');row.className='av-preview-item';
   if(v!==null&&typeof v==='object'){const nest=document.createElement('div');nest.className='av-preview-nested';
    for(const [k,x] of Object.entries(v))renderPreviewValue(nest,previewLabel(k),x,depth+1);
    row.append(nest);
   }else previewText(row,v,'av-preview-value');section.append(row);
  }
 }else if(typeof value==='object'){
  const nested=document.createElement('div');nested.className='av-preview-nested';
  for(const [k,v] of Object.entries(value))renderPreviewValue(nested,previewLabel(k),v,depth+1);
  section.append(nested);
 }else previewText(section,String(value));
 parent.append(section);
}
function renderReadableFile(target,name,data){
 target.replaceChildren();
 const labels={'00_manifest.json':'Склад та контроль цілісності архіву',
 '01_profile.json':'Профіль спортсмена', '02_current_state.json':'Поточний стан',
 '03_history.json':'Історія тренувань','04_plan.json':'План тренувань',
 '05_completed_plan.json':'Виконаний план'};
 previewText(target,labels[name]||'Дані файлу','av-preview-top');
 if(name==='04_plan.json'&&Array.isArray(data.days)){
  for(const key of ['title','period','status','plan_id'])if(data[key]!=null)renderPreviewValue(target,previewLabel(key),data[key]);
  for(const [i,d] of data.days.entries()){
   const card=document.createElement('section');card.className='av-preview-day';
   previewText(card,d.title||`День ${d.day??i+1}`,'av-preview-caption');
   for(const e of d.exercises||[]){const row=document.createElement('div');row.className='av-preview-exercise';
    previewText(row,[e.name,e.note].filter(Boolean).join(' — '),'av-preview-caption');
    trainingSetBlock(row,e);card.append(row);
   }
   if(d.comment){const sec=document.createElement('div');sec.className='av-readonly-comment';renderPreviewValue(sec,'Коментар',d.comment);card.append(sec);}
   target.append(card);
  }
  return;
 }
 if(name==='00_manifest.json'){
  for(const [k,v] of Object.entries(data)){
   if(k==='files'){
    const friendly=Object.fromEntries(Object.entries(v).map(([file,x])=>[file,typeof x==='object'&&x?.sha256?'Контрольна сума записана':'Зареєстрований файл']));
    renderPreviewValue(target,'Перелік файлів',friendly);
   }else renderPreviewValue(target,previewLabel(k),v);
  }
  return;
 }
 for(const [k,v] of Object.entries(data))renderPreviewValue(target,previewLabel(k),v);
}

// Visible UI preference only: kept per signed-in account on this device.
// Original plans, day comments and their D1 synchronization are NOT modified.
let allCommentsHidden=false;
const commentsVisibilityKey=id=>`avicularia_testing_training_${id}_comments_hidden_v197`;
function loadCommentsVisibility(id){
 allCommentsHidden=false;
 if(!id)return;
 try{allCommentsHidden=localStorage.getItem(commentsVisibilityKey(id))==='1';}
 catch(error){console.warn('Налаштування видимості тренувань недоступне',error);}
}
function saveCommentsVisibility(next){
 if(!user)return false;
 try{localStorage.setItem(commentsVisibilityKey(user),next?'1':'0');return true;}
 catch(error){console.error('Не вдалося зберегти видимість коментарів',error);return false;}
}

// Unsaved comment text is kept only as a per-account local draft. It is not
// silently committed to D1; Save still explicitly commits the training record.
const commentDraftsKey=()=>user?`avicularia_testing_training_${user}_comment_drafts_v197`:null;
function getCommentDrafts(){
 const key=commentDraftsKey();if(!key)return {};
 try{const obj=JSON.parse(localStorage.getItem(key)||'{}');return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};}
 catch(_){return {};}
}
function readCommentDraft(key,original){
 const item=getCommentDrafts()[key];
 return item&&item.base===String(original)&&typeof item.value==='string'&&item.value.length<=5000?item.value:null;
}
function updateCommentDraft(key,original,value){
 const storageKey=commentDraftsKey();if(!storageKey)return false;
 try{
  const drafts=getCommentDrafts(),text=String(value).slice(0,5000);
  if(text===String(original))delete drafts[key];
  else drafts[key]={base:String(original),value:text};
  if(Object.keys(drafts).length)localStorage.setItem(storageKey,JSON.stringify(drafts));
  else localStorage.removeItem(storageKey);
  return true;
 }catch(error){console.error('Не вдалося зберегти чернетку коментаря',error);return false;}
}
// Keep the label, accessibility state and every rendered comment in sync.
// Archive data is never changed by this display-only toggle.
function syncAllComments(resetFeedback=false){
 const b=$('av-all-comments-toggle');
 if(resetFeedback)window.kbjvButtonFeedback?.clear(b);
 document.body.classList.toggle('training-comments-hidden',allCommentsHidden);
 document.querySelectorAll('#training .av-inline-comment, #av-position-comment-panel, #av-json-viewer-modal .av-readonly-comment, .av-context-comment-section')
  .forEach(pane=>{pane.hidden=allCommentsHidden;});
 if(b){
  b.setAttribute('aria-pressed',String(allCommentsHidden));
  b.dataset.originalText=allCommentsHidden?'Показати коментарі':'Сховати коментарі';
  if(resetFeedback||!b.classList.contains('button-status-entering'))b.textContent=b.dataset.originalText;
 }
 renderPositionComment();
}
$('av-all-comments-toggle')?.addEventListener('click',e=>{
 const b=e.currentTarget;
 window.kbjvButtonFeedback?.clear(b);
 if(!user){feedback(b,'Спочатку увійдіть','error');return;}
 const next=!allCommentsHidden;
 const saved=saveCommentsVisibility(next);
 // A local storage failure must not make the button appear unresponsive:
 // apply the requested view immediately, but report that it will not persist.
 allCommentsHidden=next;
 syncAllComments();
 feedback(b,saved?(allCommentsHidden?'Сховано':'Показано'):'Не збережено',saved?(allCommentsHidden?'error':'success'):'error');
});
// Keep a second open site tab in sync with this device's stored preference.
window.addEventListener('storage',event=>{
 if(user&&event.key===commentsVisibilityKey(user)){
  allCommentsHidden=event.newValue==='1';
  syncAllComments(true);
 }
});
// Interpret dates from 04_plan.json in the device's LOCAL calendar. Parsing an
// ISO date with Date.parse() would shift it back a day in some time zones.
function trainingSourceDate(value){
 const match=typeof value==='string'&&value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const parsed=new Date(year,month-1,day);
 if(parsed.getFullYear()!==year||parsed.getMonth()!==month-1||parsed.getDate()!==day)return null;
 parsed.setHours(0,0,0,0);
 return parsed;
}
const trainingWeekdayIndex=date=>(date.getDay()+6)%7;
// Preserve the exact date of each scheduled workout. Fill visual rest days
// from the same seven-day period beginning with the earliest dated plan day.
// Older plans without any dates retain their previous current-week fallback.
function trainingDisplayDates(mapped,today){
 const dated=[...mapped.values()].map(item=>item.sourceDate).filter(Boolean);
 const first=dated.length?new Date(Math.min(...dated.map(date=>date.getTime()))):null;
 const currentMonday=new Date(today);
 currentMonday.setDate(today.getDate()-trainingWeekdayIndex(today));
 const anchor=first||currentMonday;
 const anchorWeekday=trainingWeekdayIndex(anchor);
 return Array.from({length:7},(_,weekdayIndex)=>{
  const fromPlan=mapped.get(weekdayIndex)?.sourceDate;
  if(fromPlan)return new Date(fromPlan);
  const offset=first?(weekdayIndex-anchorWeekday+7)%7:weekdayIndex;
  const date=new Date(anchor);date.setDate(anchor.getDate()+offset);
  return date;
 });
}
function render(){
 const root=$('training-content'),list=$('av-files-list');root.replaceChildren();list.replaceChildren();
 if(!present(record)){
  const p=document.createElement('section');p.className='tracker training-panel';p.textContent='Архів ще не завантажено. Використайте «Завантажити на сайт» та виберіть ZIP із шести JSON-файлів';root.append(p);
 }else{
  let p=null;try{if(record.files['04_plan.json'])p=fileJSON('04_plan.json',record.files['04_plan.json']);}catch(e){status(e.message,'error');}
  if(p){
   // One week card: source archive and imported JSON remain unchanged.
   const week=document.createElement('section');week.className='tracker training-week';
   const overview=document.createElement('div');overview.className='training-plan-overview';
   const title=document.createElement('h2');title.textContent=p.title||'План тренувань';overview.append(title);
   if(p.period){const interval=document.createElement('p');interval.textContent=p.period;overview.append(interval);}
   const rev=document.createElement('p');rev.className='training-plan-version';rev.textContent=`Версія тренувального архіву: v${version()} · Остання зміна: ${timestamp()?new Date(timestamp()).toLocaleString('uk-UA'):'—'}`;overview.append(rev);
   if(p.status==='example_not_for_execution'){const w=document.createElement('p');w.className='training-demo-notice';w.textContent='Демонстраційний план завантажено успішно. Це приклад для перевірки, не програма для виконання';overview.append(w);}
   week.append(overview);
   // Keep the source's original exercise days and their comment keys.
   // Missing Wed/Sat/Sun are visual rest days, NOT fabricated source records.
   const weekdays=[['Понеділок','понеділ'],['Вівторок','вівтор'],['Середа','серед'],['Четвер','четвер'],['П’ятниця','пятниц'],['Субота','субот'],['Неділя','неділ']];
   const clean=x=>String(x||'').toLocaleLowerCase('uk-UA').replace(/[’'`ʼ]/g,'');
   let scheduled=['Понеділок','Вівторок','Четвер','П’ятниця'];
   try{const cfg=fileJSON('01_profile.json',record.files['01_profile.json']);
       if(Array.isArray(cfg.schedule?.training_days)&&cfg.schedule.training_days.length)scheduled=cfg.schedule.training_days;
   }catch(_){}
   const mapped=new Map(),extra=[];
   for(let i=0;i<p.days.length;i++){
    const d=p.days[i],text=clean(d.title);
    const sourceDate=trainingSourceDate(d.date);
    const found=weekdays.find(([,stem])=>text.includes(stem));
    const fallback=weekdays.find(([label])=>clean(label)===clean(scheduled[i]));
    // A valid date from the imported plan is authoritative, not today's week.
    const index=sourceDate?trainingWeekdayIndex(sourceDate):found?weekdays.indexOf(found):fallback?weekdays.indexOf(fallback):-1;
    if(index>=0&&!mapped.has(index))mapped.set(index,{day:d,index:i,weekdayIndex:index,sourceDate});
    else extra.push({day:d,index:i,weekdayIndex:index,sourceDate});
   }
   // Only the DISPLAY ORDER follows today's local weekday. The training
   // dates themselves remain fixed to the archived plan, across midnight.
   const today=new Date();today.setHours(0,0,0,0);
   const firstDayIndex=trainingWeekdayIndex(today);
   const dayDates=trainingDisplayDates(mapped,today);
   const sequence=Array.from({length:7},(_,offset)=>{
    const idx=(firstDayIndex+offset)%7;
    return mapped.get(idx)||{rest:weekdays[idx][0],restIndex:idx};
   });
   sequence.push(...extra);
   for(const entry of sequence){
    const generatedRest=Boolean(entry.rest);
    // A source plan can explicitly record recovery/rest days as entries with
    // a zero-set "Відпочинок / відновлення" item. Do not label them training.
    // Use the SOURCE values; never infer rest from weekday or a fixed schedule.
    const recordedRest=!generatedRest && Array.isArray(entry.day?.exercises)
      && entry.day.exercises.length>0
      && entry.day.exercises.every(ex=>Number(ex.sets)===0
        && /^(?:відпочинок|відновлення)(?:\b|\s|\/|$)/iu.test(String(ex.name||'').trim()));
    const isRest=generatedRest||recordedRest;
    const d=generatedRest?{title:`${entry.rest} — Відпочинок`,exercises:[]}:entry.day;
    const i=generatedRest?entry.restIndex:entry.index;
    const dayKey=generatedRest?`rest-${i}`:String(d.day??i+1);
    const defaultComment=generatedRest?String(p.rest_day_comments?.[dayKey]||''):String(d.comment||'');
    const card=document.createElement('section');card.className=isRest?'training-day training-rest-day':'training-day';
    const weekdayIndex=isRest?entry.restIndex:Number.isInteger(entry.weekdayIndex)?entry.weekdayIndex:weekdays.findIndex(([,stem])=>clean(d.title).includes(stem));
    const weekdayName=weekdayIndex>=0?weekdays[weekdayIndex][0]:String(d.title||'').replace(/^День\s*\d+\s*[—–:-]?\s*/iu,'').trim()||'День не вказано';
    const h=document.createElement('h2');
    let heading=`${weekdayName} — ${isRest?'Відпочинок':'Тренування'}`;
    if(weekdayIndex>=0){
     const calendarDate=entry.sourceDate||dayDates[weekdayIndex];
     const formattedDate=`${String(calendarDate.getDate()).padStart(2,'0')}.${String(calendarDate.getMonth()+1).padStart(2,'0')}.${calendarDate.getFullYear()}`;
     const dayHasPassed=calendarDate.getTime()<today.getTime();
     // A text cross marks only past dates. Today's and future dates have no mark.
     // This is calendar context, never confirmation of completed exercise sets.
     heading+=` — ${formattedDate}${dayHasPassed?' — ×':''}`;
     h.title=dayHasPassed?'Календарний день минув':'Поточний або майбутній календарний день';
    }
    h.textContent=heading;card.append(h);
    const ex=document.createElement('div');ex.className='training-exercises';
    if(Array.isArray(d.exercises))for(const e of d.exercises){
     const item=document.createElement('div');item.className='training-exercise';
     const n=document.createElement('div');n.className='training-exercise-title';n.textContent=[e.name,e.note].filter(Boolean).join(' — ');item.append(n);
     trainingSetBlock(item,e);ex.append(item);
    }
    if(!isRest)card.append(ex);const cont=document.createElement('div');cont.className='av-inline-comment';
    const label=document.createElement('div');label.className='training-comment-heading';label.textContent='Коментар до дня:';cont.append(label);
    const previous=record.notes?.[dayKey]??defaultComment;
    const display=document.createElement('div');display.className='av-comment-view';display.tabIndex=0;display.textContent=previous||'Немає коментаря';if(!previous)display.classList.add('is-empty');cont.append(display);
    const editor=document.createElement('textarea');editor.className='av-comment-editor';editor.maxLength=5000;
    const pendingText=readCommentDraft(dayKey,previous);
    editor.value=pendingText??previous;editor.hidden=pendingText===null;
    if(pendingText!==null)display.hidden=true;
    editor.addEventListener('input',()=>{if(!updateCommentDraft(dayKey,previous,editor.value))status('Не вдалося зберегти чернетку коментаря на цьому пристрої.','error');});
    cont.append(editor);
    const row=document.createElement('div');row.className='av-comment-buttons';
    for(const action of ['Редагувати','Вставити','Скопіювати','Очистити']){const b=document.createElement('button');b.type='button';b.textContent=action;row.append(b);
      if(action==='Редагувати'){if(pendingText!==null){b.textContent='Зберегти дані';b.dataset.originalText='Зберегти дані';b.setAttribute('aria-pressed','true');}
       b.addEventListener('click',()=>{const isEditing=!editor.hidden;const key=dayKey;if(!isEditing){editor.hidden=false;display.hidden=true;editor.value=readCommentDraft(key,record.notes?.[key]??defaultComment)??(record.notes?.[key]??defaultComment);b.textContent='Зберегти дані';b.dataset.originalText='Зберегти дані';b.setAttribute('aria-pressed','true');window.kbjvButtonFeedback?.show(b,'Зберегти дані','info',0);editor.focus({preventScroll:true});editing={day:key,editor,b};return;}
       const updated=editor.value.trim(),old=record.notes?.[key]??defaultComment;editor.hidden=true;display.hidden=false;editing=null;b.dataset.originalText='Редагувати';b.textContent='Редагувати';b.setAttribute('aria-pressed','false');window.kbjvButtonFeedback?.clear(b);
       if(updated===old){updateCommentDraft(key,old,old);feedback(b,'Без змін','error');return;}
       // Capture the edit synchronously before any re-render from commit/reconcile.
       updateCommentDraft(key,old,updated);
       const next=clone(record);next.notes[key]=updated;void commit(next,'reference_comment').then(()=>{updateCommentDraft(key,old,old);display.textContent=updated||'Немає коментаря';display.classList.toggle('is-empty',!updated);feedback(b,'Збережено');}).catch(err=>{status(err.message,'error');});
      });}
      if(action==='Вставити')b.addEventListener('click',async()=>{
        if(editor.hidden){feedback(b,'Спочатку редагуйте','error');return;}
        try{
          const text=await navigator.clipboard.readText();
          if(!text){feedback(b,'Немає що вставити','error');return;}
          editor.setRangeText(text,editor.selectionStart,editor.selectionEnd,'end');
          editor.dispatchEvent(new Event('input',{bubbles:true}));
          feedback(b,'Вставлено');
        }catch(_){feedback(b,'Не вдалося вставити','error');}
      });
      if(action==='Очистити')b.addEventListener('click',()=>{const key=dayKey;if(!(record.notes?.[key]??defaultComment)){feedback(b,'Немає що очищати','error');return;}if(!confirm('Очистити коментар до цього дня?'))return;const oldText=record.notes?.[key]??defaultComment;const next=clone(record);next.notes[key]='';void commit(next,'reference_comment').then(()=>{updateCommentDraft(key,oldText,oldText);render();}).catch(err=>status(err.message,'error'));});
      if(action==='Скопіювати')b.addEventListener('click',()=>{const text=record.notes?.[dayKey]??defaultComment;if(!text){feedback(b,'Немає що копіювати','error');return;}void navigator.clipboard.writeText(text).then(()=>feedback(b,'Скопійовано')).catch(()=>feedback(b,'Не вдалося','error'));});
    }
    cont.append(row);cont.hidden=allCommentsHidden;card.append(cont);week.append(card);
   }
   root.append(week);
  }else{const box=document.createElement('div');box.className='tracker training-panel';box.textContent='04_plan.json поки не додано. Інші файли збережено';root.append(box);}
 }
 for(const name of NAMES){
  const row=document.createElement('div');row.className='av-file';
  const info=document.createElement('div');info.className='av-file-info';
  const a=document.createElement('span');a.textContent=versionName(name,version());
  const b=document.createElement('small');b.textContent=record?.files?.[name]!=null?`${bytes(record.files[name])} Б · збережено`:'Немає';
  info.append(a,b);row.append(info);
  const viewButton=document.createElement('button');viewButton.type='button';viewButton.className='av-file-view';viewButton.textContent='Переглянути';
  viewButton.addEventListener('click',()=>{
   if(!record?.files?.[name]){feedback(viewButton,'Немає файлу','error');return;}
   const viewer=$('av-json-viewer');renderReadableFile(viewer,name,fileJSON(name,record.files[name]));
   $('av-json-viewer-title').textContent=versionName(name,version());
   $('av-json-viewer-modal').hidden=false;$('av-json-viewer-modal').classList.add('active','modal-topmost');
   document.body.classList.add('edit-modal-open');feedback(viewButton,'Відкрито');
  });
  row.append(viewButton);list.append(row);
 }
 syncAllComments(true);
 notify();
}
// Context panels read existing archive data, never alter the six imported JSONs.
const CONTEXT_LABELS={
 back:'Спина',knees:'Коліна',treatment:'Лікування',recovery:'Відновлення',
 physical_state:'Фізичний стан',sleep:'Сон',training:'Тренування',health:'Здоров’я',
 weight:'Маса тіла',competition:'Змагання',coach:'Тренер',next_action:'Наступний крок',
 current:'Поточний стан',bodyweight:'Вага тіла',snapshot_date:'Дата звіту',
 pain_at_rest_0_10:'Біль у спокої (0–10)',pain_with_bracing_0_10:'Біль при напруженні преса (0–10)',
 pain_with_forward_bend_0_10:'Біль при нахилі (0–10)',neurological_symptoms:'Неврологічні симптоми',
 neurological_details:'Опис',current_discomfort:'Поточний дискомфорт',
 important_uncertainty:'Що залишається невідомим',status:'Статус',
 latest_reported_morning_kg:'Остання ранкова вага (кг)',measurement_date:'Дата вимірювання',
 weigh_in_date:'Дата зважування',competition_date:'Дата змагань',
 estimated_squat_start_local:'Орієнтовний початок присідань',current_week:'Тиждень',
 gym_status:'Відвідування залу',last_gym_date:'Останній зал',
 strength_readiness:'Готовність у вправах',squat:'Присідання',bench:'Жим лежачи',deadlift:'Станова тяга',
 global:'Загальна оцінка',load_test_after_recovery:'Перевірка після відновлення'
};
function contextSection(parent,title,content){
 // Shared archive renderer: same titles, value layout, nested fields and font.
 renderPreviewValue(parent,title,content);
 const section=parent.lastElementChild;
 if(/коментар/iu.test(title))section?.classList.add('av-context-comment-section');
 return section;
}
function isoDate(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(s||'—');}
function contextData(name){try{return record?.files?.[name]?fileJSON(name,record.files[name]):null;}catch(_){return null;}}
function openContext(kind){
 const modal=$('av-context-modal'),outer=$('av-context-modal-body');outer.replaceChildren();
 const body=outer;previewText(body,kind==='health'?'Стан здоров’я':kind==='timeline'?'Хронологія':'Поточна позиція','av-preview-top');
 if(!present(record)){
  contextSection(body,'Архів не завантажено','Спочатку завантажте ZIP із шести JSON-файлів.');
 }else{
  const snapshot=contextData('02_current_state.json')||{},plan=contextData('04_plan.json')||{},profile=contextData('01_profile.json')||{};
  contextSection(body,'Актуальність даних',`Дані з архіву станом на ${isoDate(snapshot.snapshot_date||snapshot.current_status_as_of_archive_generation?.date)}. Це останній ЗАПИСАНИЙ стан, а не автоматична оцінка здоров’я.`);
  if(kind==='position'){
   contextSection(body,'Поточна позиція',snapshot.current_status_as_of_archive_generation||snapshot.current_context_status||'Немає даних у файлі.');
   contextSection(body,'Період програми',plan.period||'Не вказано');
   contextSection(body,'Статус плану',plan.status||'Не вказано');
   contextSection(body,'Наступний крок',snapshot.next_action_for_assistant?.current_missing_items||[]);
  }else if(kind==='timeline'){
   const today=new Date();today.setHours(0,0,0,0);
   const point=(str)=>{const d=new Date(`${str}T00:00:00`);return Number.isFinite(d.getTime())?Math.round((d-today)/86400000):null;};
   const event=(date,label,time)=>{
    if(!date)return;const n=point(date);const rel=n===null?'':n>0?`Через ${n} дн.`:n===0?'Сьогодні':`${-n} дн. тому`;
    contextSection(body,`${label} · ${isoDate(date)}`,`${time||''}${time&&rel?' · ':''}${rel}`);
   };
   contextSection(body,'Поточний тренувальний план',`${plan.title||'Немає плану'} · ${plan.period||'період не вказаний'}`);
   event(snapshot.competition?.weigh_in_date,'Офіційне зважування',snapshot.competition?.weigh_in_time_local);
   event(snapshot.competition?.competition_date,'Змагання',snapshot.competition?.estimated_squat_start_local);
   contextSection(body,'Етап згідно з архівом',snapshot.recovery?.current_week||'Не вказано');
   contextSection(body,'Примітка',snapshot.competition?.start_note||snapshot.competition?.weigh_in_window_note);
  }else if(kind==='health'){
   const labels={back:'Спина',knees:'Коліна',treatment:'Лікування'};
   const h=snapshot.health||{};
   for(const [key,label] of Object.entries(labels)){
    const val=h[key];if(val&&typeof val==='object'){
     const normalized=Object.fromEntries(Object.entries(val).map(([key,value])=>[CONTEXT_LABELS[key]||key.replaceAll('_',' '),value]));
     contextSection(body,label,normalized);
    }else contextSection(body,label,val);
   }
   contextSection(body,'Фізичне відновлення',snapshot.recovery?.physical_state||'Не вказано');
   contextSection(body,'Перевірка силової готовності',snapshot.strength_readiness?.global||'Немає оцінки');
  }
 }
 $('av-context-modal-title').textContent=kind==='health'?'Стан здоров’я':kind==='timeline'?'Хронологія':'Поточна позиція';
 modal.hidden=false;modal.classList.add('active','modal-topmost');document.body.classList.add('edit-modal-open');
}
for(const [id,kind] of [['av-context-position','position'],['av-context-timeline','timeline'],['av-context-health','health']])
 $(id)?.addEventListener('click',event=>{openContext(kind);feedback(event.currentTarget,'Відкрито');});
const positionCommentKey='context-position';
function positionCommentValue(){
 if(!record)return '';
 return String(record.notes?.[positionCommentKey]??contextData('02_current_state.json')?.website_position_comment??'');
}
function renderPositionComment(){
 const pane=$('av-position-comment-panel'),view=$('av-position-comment-view');
 const editor=$('av-position-comment-editor'),edit=$('av-position-comment-edit'),state=$('av-position-comment-state');
 if(!pane||!view||!editor||!edit||!state)return;
 pane.hidden=allCommentsHidden;
 const current=positionCommentValue();
 view.textContent=current||'Немає коментаря';
 view.classList.toggle('is-empty',!current);
 const positionDraft=readCommentDraft(positionCommentKey,current);
 if(positionDraft!==null){
  editor.value=positionDraft;editor.hidden=false;view.hidden=true;
  edit.textContent='Зберегти дані';edit.dataset.originalText='Зберегти дані';edit.setAttribute('aria-pressed','true');
 }else if(document.activeElement!==editor&&editor.hidden)editor.value=current;
 state.textContent=current?'Коментар збережено у тренувальному архіві.':'Немає коментаря';
}
$('av-position-comment-editor')?.addEventListener('input',event=>{
 if(!updateCommentDraft(positionCommentKey,positionCommentValue(),event.target.value))status('Не вдалося зберегти чернетку коментаря.','error');
});
$('av-position-comment-edit')?.addEventListener('click',async event=>{
 const btn=event.currentTarget,editor=$('av-position-comment-editor'),view=$('av-position-comment-view');
 if(!user||!record){feedback(btn,'Немає архіву','error');return;}
 if(editor.hidden){
  editor.value=readCommentDraft(positionCommentKey,positionCommentValue())??positionCommentValue();editor.hidden=false;view.hidden=true;
  btn.textContent='Зберегти дані';btn.dataset.originalText='Зберегти дані';
  btn.setAttribute('aria-pressed','true');editor.focus({preventScroll:true});return;
 }
 const nextText=String(editor.value||'').trim().slice(0,5000),old=positionCommentValue();
 if(nextText===old){updateCommentDraft(positionCommentKey,old,old);feedback(btn,'Без змін','error');return;}
 updateCommentDraft(positionCommentKey,old,nextText);
 const next=clone(record);next.notes={...(next.notes||{}),[positionCommentKey]:nextText};
 btn.disabled=true;
 try{await commit(next,'reference_comment');updateCommentDraft(positionCommentKey,old,old);editor.hidden=true;view.hidden=false;
  btn.dataset.originalText='Редагувати';btn.textContent='Редагувати';btn.setAttribute('aria-pressed','false');
  renderPositionComment();feedback(btn,'Збережено');
 }catch(error){status(error.message,'error');feedback(btn,'Не збережено','error');}
 finally{btn.disabled=false;}
});
$('av-position-comment-clear')?.addEventListener('click',async event=>{
 const btn=event.currentTarget;
 if(!user||!record){feedback(btn,'Немає архіву','error');return;}
 if(!positionCommentValue()){feedback(btn,'Немає що очищати','error');return;}
 if(!confirm('Очистити коментар до поточної позиції?')){feedback(btn,'Скасовано','error');return;}
 const oldValue=positionCommentValue();const next=clone(record);next.notes={...(next.notes||{}),[positionCommentKey]:''};
 try{await commit(next,'reference_comment');updateCommentDraft(positionCommentKey,oldValue,oldValue);const ed=$('av-position-comment-editor');ed.hidden=true;
  const b=$('av-position-comment-edit');b.dataset.originalText='Редагувати';b.textContent='Редагувати';
  $('av-position-comment-view').hidden=false;renderPositionComment();feedback(btn,'Очищено');
 }catch(error){status(error.message,'error');feedback(btn,'Не очищено','error');}
});
$('av-position-comment-copy')?.addEventListener('click',event=>{
 const btn=event.currentTarget,text=positionCommentValue();
 if(!text){feedback(btn,'Немає що копіювати','error');return;}
 void navigator.clipboard.writeText(text).then(()=>feedback(btn,'Скопійовано')).catch(()=>feedback(btn,'Не вдалося','error'));
});
function closeContext(){const modal=$('av-context-modal');modal.hidden=true;modal.classList.remove('active','modal-topmost');if(!document.querySelector('.product-modal.active'))document.body.classList.remove('edit-modal-open');}
$('av-context-close')?.addEventListener('click',event=>{feedback(event.currentTarget,'Закрито','success');setTimeout(closeContext,270);});
$('av-context-modal')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeContext();});
async function persist(){if(!user)throw Error('Спочатку увійдіть в акаунт.');const stored={record:clone(record),revision,dirty};await localPut(user,stored);}
function bump(next){next.version=version()?Math.max(Number(next.version)||0,version()+1):Math.max(1,Number(next.version)||0);next.updatedAt=now();next.createdAt=next.createdAt||record?.createdAt||next.updatedAt;return next;}
async function commit(next,action){if(!user)throw Error('Необхідна авторизація.');// An automatic background sync must never randomly reject a user import.
 const started=Date.now();while(waiting && Date.now()-started<15000)await new Promise(done=>setTimeout(done,80));
 if(waiting)throw Error('Синхронізація ще триває. Повторіть дію за кілька секунд.');
 waiting=true;const before=record,wasDirty=dirty;
 try{record=next?bump(next):null;
  if(record&&action==='reference_imported'){record.lastImportedAt=now();}
  if(record)validateRecord(record);
  dirty=true;await persist();render();status('Збережено локально. Очікування синхронізації...','');if(action)log(action);schedule(80);}
 catch(err){record=before;dirty=wasDirty;render();throw err;}finally{waiting=false;}}
function schedule(ms=1200){clearTimeout(timer);if(user)timer=setTimeout(()=>void reconcile(),ms);}
function showConflict(show){conflict=show;$('av-conflict').hidden=!show;notify();}
async function reconcile(){if(!user||waiting||!navigator.onLine)return;waiting=true;const thisUser=user,oldEpoch=epoch;let serverConfirmed=false;
 try{const cloud=await remote('META');if(thisUser!==user||oldEpoch!==epoch)return;
  const remoteRev=cloud.revision;
  if(dirty){if(revision!==null&&revision!==remoteRev){showConflict(true);status('Конфлікт між пристроями: виберіть копію.','error');return;}
   if(revision===null&&remoteRev>0&&cloud.present){showConflict(true);status('У D1 уже є архів. Виберіть копію.','error');return;}
   const done=await remote('POST',{base_revision:remoteRev,value:record});if(thisUser!==user||oldEpoch!==epoch)return;
   revision=done.revision;dirty=false;showConflict(false);await persist();serverConfirmed=true;status('Синхронізовано з Avicularia D1.');
  }else if(revision===null||remoteRev!==revision){const full=await remote('GET');if(thisUser!==user||oldEpoch!==epoch)return;
   if(record&&revision===null&&full.value){showConflict(true);status('Є дві копії. Оберіть потрібну.','error');return;}
   if(full.value)validateRecord(full.value);record=full.value;revision=full.revision;dirty=false;await persist();render();serverConfirmed=true;status('Отримано поточні дані з Cloudflare D1.');
  }else{serverConfirmed=true;status('Синхронізовано з Avicularia D1.');}
 }catch(err){if(thisUser===user&&oldEpoch===epoch)status(`Синхронізація не завершена: ${err.message}`,'error');}
 finally{if(serverConfirmed&&thisUser===user&&oldEpoch===epoch)lastServerConfirmedAt=Date.now();waiting=false;notify();}}
async function switchUser(id){clearTimeout(timer);user='';record=null;revision=null;dirty=false;lastServerConfirmedAt=0;loadCommentsVisibility('');showConflict(false);epoch++;
 // Never leave the previous account's visible unsaved editor in the shared DOM.
 const positionEditor=$('av-position-comment-editor'),positionView=$('av-position-comment-view'),positionEdit=$('av-position-comment-edit');
 if(positionEditor){positionEditor.hidden=true;positionEditor.value='';}
 if(positionView)positionView.hidden=false;
 if(positionEdit){positionEdit.textContent='Редагувати';positionEdit.dataset.originalText='Редагувати';positionEdit.setAttribute('aria-pressed','false');}
 const thisEpoch=epoch;render();
 if(!id){status('Увійдіть у свій акаунт.');return;}
 try{const local=await localGet(id);if(thisEpoch!==epoch)return;user=id;loadCommentsVisibility(id);record=local?.record||null;revision=Number.isInteger(local?.revision)?local.revision:null;dirty=Boolean(local?.dirty);render();status('Перевірка серверного архіву...');schedule(30);
 }catch(e){status('Локальне сховище недоступне: '+e.message,'error');}
}
async function parseZip(file){
 if(file.size>MAX_ZIP)throw Error('ZIP перевищує 48 МіБ.');
 if(!window.JSZip)throw Error('Модуль ZIP недоступний. Оновіть сайт і повторіть спробу.');
 let zip;try{zip=await JSZip.loadAsync(file);}catch(_){throw Error('Файл не є коректним ZIP-архівом.');}
 const entries=Object.values(zip.files).filter(f=>!f.dir);
 const files=emptyFiles(),selectedNames=new Set(),sourceNames={};let unpackedBytes=0;
 for(const item of entries){
  const path=item.name.replace(/\\/g,'/');
  if(path.includes('..')||path.startsWith('/'))throw Error('ZIP містить небезпечний шлях файлу.');
  const basename=path.split('/').pop();
  // macOS Finder may insert resource forks, .DS_Store or one packaging directory.
  if(path.startsWith('__MACOSX/')||basename==='.DS_Store'||basename.startsWith('._'))continue;
  if(path.split('/').length>2)throw Error('ZIP містить забагато вкладених папок.');
  const canonical=canonicalName(basename);
  if(!canonical)throw Error(`Невідомий файл у ZIP: ${path}. Потрібні шість JSON із шаблону.`);
  if(selectedNames.has(canonical))throw Error(`Повторюється файл ${canonical}.`);
  selectedNames.add(canonical);sourceNames[canonical]=basename;
  // A one-folder ZIP from Finder is fine, but all six canonical files are required.
  const content=await item.async('string');unpackedBytes+=bytes(content);
  if(bytes(content)>MAX_FILE||unpackedBytes>MAX_PACKAGE)throw Error('ZIP містить завеликий розпакований JSON.');
  files[canonical]=content;
 }
 for(const name of NAMES)if(!files[name])throw Error(`ZIP не містить ${name} (або його версійної назви).`);
 await checkManifest(files,sourceNames);return files;
}
async function archiveZip(completed){if(!record||NAMES.some(n=>!record.files[n]))throw Error('Для ZIP потрібні всі шість файлів.');
 const raw=clone(record.files);if(!completed){
  const manifest=fileJSON('00_manifest.json',raw['00_manifest.json']);let changed=false;
  for(const n of NAMES.slice(1)){const hash=await digest(raw[n]);if(manifest.files?.[n] && manifest.files[n].sha256!==hash){manifest.files[n].sha256=hash;changed=true;}}
  if(changed)raw['00_manifest.json']=JSON.stringify(manifest,null,2)+'\n';
 }if(completed){
  let p=fileJSON('04_plan.json',raw['04_plan.json']);
  p.days=p.days.map((d,i)=>({...d,comment:record.notes?.[String(d.day??i+1)]??String(d.comment||'')}));
  // Rest-day comments live only in the derived completed ZIP, never in the original source files.
  const restDayComments={...(p.rest_day_comments||{})};
  for(const [key,value] of Object.entries(record.notes||{})){
   if(/^rest-[0-6]$/.test(key))restDayComments[key]=String(value||'');
  }
  if(Object.keys(restDayComments).length)p.rest_day_comments=restDayComments;
  raw['04_plan.json']=JSON.stringify(p,null,2)+'\n';
  // Position comments are part of the completed training extract only, in the
  // current-state file (not the original source and not a seventh file).
  const currentState=fileJSON('02_current_state.json',raw['02_current_state.json']);
  currentState.website_position_comment=String(record.notes?.['context-position']||'').slice(0,5000);
  raw['02_current_state.json']=JSON.stringify(currentState,null,2)+'\n';
  const manifest=fileJSON('00_manifest.json',raw['00_manifest.json']);for(const n of NAMES.slice(1))if(manifest.files?.[n])manifest.files[n].sha256=await digest(raw[n]);
  manifest.website_state={archive_version:version(),completed_extract:true,exported_at:now()};raw['00_manifest.json']=JSON.stringify(manifest,null,2)+'\n';
 }
 // The six source JSON slots remain canonical in D1. Version numbers
 // appear in exported filenames and manifest metadata, not in schema version fields.
 const mf=fileJSON('00_manifest.json',raw['00_manifest.json']);
 mf.website_state={...(mf.website_state||{}),archive_version:version(),exported_at:now(),completed_extract:Boolean(completed),
   file_versions:Object.fromEntries(NAMES.map(n=>[n,version()])),
   file_names:Object.fromEntries(NAMES.map(n=>[n,versionName(n,version())]))};
 for(const n of NAMES.slice(1)){
  mf.files=mf.files||{};
  mf.files[n]={...(mf.files[n]||{}),sha256:await digest(raw[n])};
 }
 raw['00_manifest.json']=JSON.stringify(mf,null,2)+'\n';
 const zip=new JSZip();for(const name of NAMES)zip.file(versionName(name,version()),raw[name]);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
function notesFromPlan(p,currentState=null){
 const notes={};
 if(typeof currentState?.website_position_comment==='string')notes['context-position']=currentState.website_position_comment.slice(0,5000);
 p.days.forEach((d,i)=>{if(d.comment)notes[String(d.day??i+1)]=String(d.comment).slice(0,5000);});
 for(const [key,value] of Object.entries(p.rest_day_comments||{})){
  if(/^rest-[0-6]$/.test(key)&&typeof value==='string')notes[key]=value.slice(0,5000);
 }
 return notes;
}
function actionRow(title,fn,actionLabel='Вибрати'){const row=document.createElement('div');row.className='av-file-action';const label=document.createElement('span');label.textContent=title;const btn=document.createElement('button');btn.type='button';btn.textContent=actionLabel;btn.addEventListener('click',async()=>{try{await fn(btn);}catch(err){status(err.message,'error');feedback(btn,'Помилка','error');}});row.append(label,btn);return row;}
function section(label){const s=document.createElement('div');s.className='av-modal-section';const h=document.createElement('h3');h.textContent=label;s.append(h);return s;}
function addButton(parent,title,fn){const b=document.createElement('button');b.type='button';b.textContent=title;b.addEventListener('click',async()=>{try{await fn(b);}catch(e){status(e.message,'error');feedback(b,'Помилка','error');}});parent.append(b);return b;}
function modal(which){mode=which;const root=$('av-transfer-actions');root.replaceChildren();const title=which==='upload'?'Завантажити на сайт':which==='download'?'Вивантажити з сайту':'Очистити вкладку';$('av-transfer-title').textContent=title;
 if(which==='upload'){
  const all=section('Усі файли одним архівом:');addButton(all,'Завантажити ZIP на сайт',b=>choose('zip',b));root.append(all);
  const one=section('Завантажити файли по черзі:');for(const n of NAMES)one.append(actionRow(versionName(n,version()),b=>choose(n,b),'Завантажити'));root.append(one);
 }else if(which==='download'){
  const all=section('Увесь архів:');addButton(all,'Вивантажити початковий ZIP з сайту',async b=>{if(!present(record))throw Error('Немає що вивантажити.');saveBlob(await archiveZip(false),`avicularia_testing_v${version()}_original.zip`);log('reference_exported');feedback(b,'Завантажено');});root.append(all);
  const filled=section('Архів із коментарями до днів:');addButton(filled,'Вивантажити виконаний ZIP з сайту',async b=>{if(!present(record))throw Error('Немає що вивантажити.');await commit(clone(record),'reference_completed');const blob=await archiveZip(true);saveBlob(blob,`avicularia_testing_v${version()}_completed.zip`);feedback(b,'Завантажено');});root.append(filled);
  const one=section('Вивантажити по черзі:');for(const n of NAMES)one.append(actionRow(versionName(n,version()),b=>{if(!record?.files?.[n])throw Error('Немає що вивантажити.');saveFile(n,record.files[n]);feedback(b,'Завантажено');log('reference_json');},'Вивантажити'));root.append(one);
 }else{
  const all=section('Усю вкладку:');addButton(all,'Очистити всі шість файлів і коментарі',async b=>{if(!present(record))throw Error('Немає що очищати.');if(!confirm('Видалити всі шість файлів і всі коментарі? Цю дію буде синхронізовано між пристроями.')){feedback(b,'Скасовано','error');return;}await commit(null,'reference_cleared');feedback(b,'Очищено');closeModal();});root.append(all);
  const one=section('Видалити окремий файл:');for(const n of NAMES)one.append(actionRow(versionName(n,version()),async b=>{if(!record?.files?.[n])throw Error('Немає що очищати.');if(!confirm(`Видалити ${n} із сайту?`)){feedback(b,'Скасовано','error');return;}const next=clone(record);next.files[n]=null;if(n==='04_plan.json')next.notes={};await commit(next,'reference_deleted');feedback(b,'Видалено');closeModal();},'Очистити'));root.append(one);
 }
 $('av-transfer-modal').hidden=false;$('av-transfer-modal').classList.add('active','modal-topmost');document.body.classList.add('edit-modal-open');
}
function closeModal(){$('av-transfer-modal').hidden=true;$('av-transfer-modal').classList.remove('active','modal-topmost');document.body.classList.remove('edit-modal-open');mode='';}
function choose(what,button){selected=what;selectedButton=button;const picker=$('av-import-file');picker.accept=what==='zip'?'.zip,application/zip':'.json,application/json';picker.value='';picker.click();}
$('av-import-file').addEventListener('cancel',()=>feedback(selectedButton,'Скасовано','error'));
$('av-import-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const picked=selected;
 try{if(picked==='zip'){
   const files=await parseZip(f);if(!confirm('Замінити поточні шість файлів архівом ZIP? Коментарі поточного плану буде замінено вмістом ZIP.')){feedback(selectedButton,'Скасовано','error');return;}
   const p=fileJSON('04_plan.json',files['04_plan.json']);const s=fileJSON('02_current_state.json',files['02_current_state.json']);const notes=notesFromPlan(p,s);
   const declared=Number(fileJSON('00_manifest.json',files['00_manifest.json']).website_state?.archive_version)||0;const next={files,notes,version:Math.max(record?.version||0,declared),createdAt:record?.createdAt||now(),updatedAt:now()};
   if(record&&NAMES.every(n=>record.files[n]===files[n])&&JSON.stringify(record.notes)===JSON.stringify(notes)){status('Без змін.','error');feedback(selectedButton,'Без змін','error');return;}
   await commit(next,'reference_imported');feedback(selectedButton,'Завантажено');setTimeout(closeModal,350);
  }else if(safeName(picked)){
   if(canonicalName(f.name)!==picked)throw Error(`Потрібний файл ${picked} або його версійна назва.`);
   const contents=await f.text();fileJSON(picked,contents);
   if(record?.files?.[picked]===contents){status('Без змін.','error');feedback(selectedButton,'Без змін','error');return;}
   if(!confirm(`Замінити ${picked} у сховищі?`)){feedback(selectedButton,'Скасовано','error');return;}
   const next=clone(record)||{files:emptyFiles(),notes:{},version:0,createdAt:now(),updatedAt:now()};next.files[picked]=contents;   if(picked==='04_plan.json'){next.notes={...next.notes};const d=fileJSON(picked,contents);const comments=notesFromPlan(d);for(const key of Object.keys(next.notes))if(/^(\d+|rest-[0-6])$/.test(key))delete next.notes[key];Object.assign(next.notes,comments);}
   if(picked==='02_current_state.json'){const d=fileJSON(picked,contents);if(typeof d.website_position_comment==='string')next.notes['context-position']=d.website_position_comment.slice(0,5000);}
   await commit(next,'reference_imported');feedback(selectedButton,'Завантажено');setTimeout(closeModal,350);
  }
 }catch(err){status(err.message,'error');feedback(selectedButton,'Помилка','error');}finally{e.target.value='';}
});
$('av-refresh-open').addEventListener('click',async e=>{
 const button=e.currentTarget;
 if(!user){status('Спочатку увійдіть в акаунт.','error');feedback(button,'Немає акаунта','error');return;}
 if(!navigator.onLine){status('Немає мережі. Локальні дані залишилися без змін.','error');feedback(button,'Немає мережі','error');return;}
 button.disabled=true;window.kbjvButtonFeedback?.show(button,'Оновлення...','info',0);
 try{
  const started=Date.now();while(waiting&&Date.now()-started<15000)await new Promise(done=>setTimeout(done,80));
  if(waiting)throw Error('Попередня синхронізація ще триває.');
  const before=record?.updatedAt||'';
  await reconcile();
  const s=$('training-status');
  if(conflict||s.dataset.tone==='error'||dirty)throw Error(s.textContent||'Оновлення не завершено.');
  feedback(button,'Оновлено');log('reference_refreshed');
 }catch(err){status(err.message,'error');feedback(button,'Не оновлено','error');}
 finally{button.disabled=false;}
});
for(const [key,kind] of [['av-upload-open','upload'],['av-download-open','download'],['av-clear-open','clear']])$(key).addEventListener('click',e=>{modal(kind);feedback(e.currentTarget,'Відкрито');});
$('av-transfer-close').addEventListener('click',e=>{feedback(e.currentTarget,'Закрито','success');setTimeout(closeModal,300);});
$('av-transfer-modal').addEventListener('click',e=>{if(e.target===$('av-transfer-modal'))closeModal();});
$('av-conflict-local').addEventListener('click',async()=>{if(!confirm('Замінити серверну копію локальною?'))return;revision=(await remote()).revision;dirty=true;await persist();showConflict(false);schedule(30);});
$('av-conflict-remote').addEventListener('click',async()=>{if(!confirm('Замінити локальну копію серверною? Незбережені зміни на цьому пристрої будуть втрачені.'))return;const r=await remote();if(r.value)validateRecord(r.value);record=r.value;revision=r.revision;dirty=false;await persist();showConflict(false);render();status('Серверну копію відновлено.');});
function closeArchiveFileViewer(){
 const modal=$('av-json-viewer-modal');
 if(modal.hidden)return;
 modal.hidden=true;modal.classList.remove('active','modal-topmost');
 // Other open dialogs must retain the page scroll lock.
 if(!document.querySelector('.product-modal.active'))document.body.classList.remove('edit-modal-open');
}
$('av-json-viewer-close').addEventListener('click',e=>{
 feedback(e.currentTarget,'Закрито','success');setTimeout(closeArchiveFileViewer,250);
});
// Same backdrop-click semantics as the three training context dialogs.
$('av-json-viewer-modal').addEventListener('click',event=>{
 if(event.target===event.currentTarget)closeArchiveFileViewer();
});
window.addEventListener('training:user',e=>void switchUser(String(e.detail?.id||'')));
window.addEventListener('online',()=>schedule(100));
// A tab left open across midnight must show the new today-first order.
let lastCalendarDay=new Date().toDateString();
function refreshCalendarOrder(){
 const day=new Date().toDateString();
 if(day===lastCalendarDay)return;
 if(document.activeElement?.matches?.('#training textarea, #training input, #training [contenteditable="true"]'))return;
 lastCalendarDay=day;
 if(user&&record)render();
}
// Refresh at the next local midnight, with the minute timer as a fallback.
// Safari can defer background timers; visibilitychange catches that case.
function scheduleCalendarMidnightRefresh(){
 const next=new Date();next.setHours(24,0,0,200);
 setTimeout(()=>{refreshCalendarOrder();scheduleCalendarMidnightRefresh();},Math.max(200,next.getTime()-Date.now()));
}
scheduleCalendarMidnightRefresh();
setInterval(refreshCalendarOrder,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCalendarOrder();});
document.addEventListener('focusout',()=>{
 if(new Date().toDateString()!==lastCalendarDay)setTimeout(refreshCalendarOrder,0);
});
setInterval(()=>{if(user)void reconcile();},20000);
render();
})();
