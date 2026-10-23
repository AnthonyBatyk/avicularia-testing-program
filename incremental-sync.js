/* Avicularia Testing v236: opt-in record-level sync. Legacy snapshot is retained.
 * No automatic migration, no silent conflict resolution, no destructive fallbacks.
 */
(function(){
'use strict';
const ROOTS=['schema_version','profile','daily_goal','calculator_draft','settings'];
const LISTS=['products','calculator','archive','calculator_quick_presets'];
const PREFIX={products:'p:',calculator:'c:',archive:'a:',calculator_quick_presets:'q:'};
const BATCH=10;
// Keep v2 baselines isolated between RELEASE and TESTING, even on the same GitHub Pages origin.
const BASELINE_NAMESPACE='avicularia-testing';
function baselineKey(userId){return BASELINE_NAMESPACE+'|'+String(userId);}
const encoder=new TextEncoder();
function bytes(s){return encoder.encode(s).length;}
function keyFor(prefix,id){return prefix+encodeURIComponent(String(id));}
function escapeId(id){return String(id).trim();}
function asEntries(snapshot){
  if(!snapshot||snapshot.schema_version!==1)throw new Error('Пошкоджено структуру даних.');
  const map=new Map();
  for(const root of ROOTS){
    if(snapshot[root]===undefined)throw new Error('Відсутнє системне поле '+root);
    map.set('s:'+root,snapshot[root]);
  }
  for(const name of LISTS){
    if(!Array.isArray(snapshot[name]))throw new Error('Неправильний список '+name);
    const keys=[];
    for(const row of snapshot[name]){
      if(!row||typeof row!=='object'||!escapeId(row.id))throw new Error('Немає ID у '+name);
      const key=keyFor(PREFIX[name],row.id);
      if(map.has(key))throw new Error('Повторний ID запису '+name);
      keys.push(key);map.set(key,row);
    }
    map.set('s:order:'+name,keys);
  }
  return map;
}
function fromEntries(map){
  const value={};
  for(const root of ROOTS){
    if(!map.has('s:'+root))throw new Error('Відсутній системний запис '+root);
    value[root]=map.get('s:'+root);
  }
  for(const name of LISTS){
    const prefix=PREFIX[name];
    const order=map.get('s:order:'+name);
    if(!Array.isArray(order))throw new Error('Неправильний порядок '+name);
    const unique=new Set(order);
    if(unique.size!==order.length)throw new Error('Пошкоджено порядок '+name);
    const extra=[...map.keys()].filter(k=>k.startsWith(prefix)&&!unique.has(k));
    // The order index is authoritative. Missing references indicate corruption.
    if(extra.length)throw new Error('Зайві записи поза індексом '+name);
    value[name]=order.map(k=>{
      if(!map.has(k))throw new Error('Не вистачає елемента '+k);
      return map.get(k);
    });
  }
  return value;
}
async function sha(value){
  const data=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)));
  return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function localHashes(entries){
  const map={};
  for(const [key,val] of entries)map[key]=await sha(val);
  return map;
}
let dbPromise=null;
function database(){
  if(!indexedDB)throw new Error('IndexedDB недоступна для надійного журналу синхронізації.');
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open('avicularia-v2-baselines',1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('baselines'))r.result.createObjectStore('baselines');};
    r.onerror=()=>reject(r.error||new Error('Не вдається відкрити IndexedDB'));
    r.onsuccess=()=>resolve(r.result);
  });
  return dbPromise;
}
async function baselineGet(userId,expectedEpoch){
  const db=await database();return new Promise((res,rej)=>{
    const tx=db.transaction('baselines','readonly'),store=tx.objectStore('baselines');
    const scoped=store.get(baselineKey(userId));
    scoped.onerror=()=>rej(scoped.error);
    scoped.onsuccess=()=>{
      if(scoped.result){res(scoped.result);return;}
      // Old releases used userId alone. Reuse it only when the server epoch
      // proves it belongs to this environment, never for a different D1.
      const legacy=store.get(String(userId));
      legacy.onerror=()=>rej(legacy.error);
      legacy.onsuccess=()=>res(legacy.result?.epoch===expectedEpoch?legacy.result:null);
    };
  });
}
async function baselineSave(userId,baseline){
  const db=await database();return new Promise((res,rej)=>{
    const tx=db.transaction('baselines','readwrite');
    tx.objectStore('baselines').put(baseline,baselineKey(userId));
    tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error||new Error('Помилка запису базової ревізії'));
    tx.onabort=()=>rej(tx.error||new Error('Скасовано запис базової ревізії'));
  });
}
async function manifest(api){
  const items=new Map(),initial=null;
  let after='',rev=null,total=0,updated='';
  for(let page=0;page<10000;page++){
    const part=await api('/sync/v2/manifest?after='+encodeURIComponent(after));
    if(rev===null){rev=Number(part.revision);total=Number(part.total_bytes);updated=part.updated_at||'';}
    if(rev!==Number(part.revision))throw new Error('Серверна база змінилася під час читання. Повторіть синхронізацію.');
    for(const row of (part.items||[])){
      if(items.has(row.key))throw new Error('Повторний запис у серверному індексі.');
      items.set(row.key,row.deleted?null:row.sha);
    }
    if(!part.next)return {rev,items,total,updated};
    if(part.next===after)throw new Error('Сервер повернув повторний курсор.');
    after=part.next;
  }
  throw new Error('Серверний індекс надто великий.');
}
async function readKeys(api,keys,expectedRevision){
  const data=new Map();
  for(let i=0;i<keys.length;i+=BATCH){
    const response=await api('/sync/v2/read',{method:'POST',body:{keys:keys.slice(i,i+BATCH)}});
    if(Number(response.revision)!==expectedRevision)
      throw new Error('Дані на сервері змінилися під час завантаження.');
    for(const item of (response.items||[])){
      if(!item.deleted){
        const digest=await sha(item.value);
        if(digest!==item.sha)throw new Error('Пошкоджено контрольну суму '+item.key);
      }
      data.set(item.key,item.deleted?undefined:item.value);
    }
  }
  if(keys.some(k=>!data.has(k)))throw new Error('Сервер не повернув усі запитані записи.');
  return data;
}
async function startMigration({api,userId,legacyRevision,build,validate,localUnchanged}){
  const snapshot=build();
  if(!validate(snapshot))throw new Error('Локальний знімок не пройшов перевірку.');
  const entries=asEntries(snapshot);
  const contentSignature=JSON.stringify(snapshot);
  const epoch=crypto.randomUUID();
  const status=await api('/sync/v2/status');
  if(status.active)throw new Error('Нова синхронізація вже активна.');
  if(status.migration_pending)throw new Error('На сервері є незавершене перенесення. Не починайте інше без діагностики.');
  await api('/sync/v2/start',{method:'POST',body:{epoch,legacy_revision:legacyRevision}});
  const pairs=[...entries.entries()];
  for(let i=0;i<pairs.length;i+=BATCH){
    if(JSON.stringify(build())!==contentSignature||!localUnchanged())
      throw new Error('Під час перенесення локальні дані змінилися. Перенесення не активоване.');
    await api('/sync/v2/stage',{method:'POST',body:{epoch,items:pairs.slice(i,i+BATCH).map(([key,value])=>({key,value}))}});
  }
  if(JSON.stringify(build())!==contentSignature||!localUnchanged())
    throw new Error('Дані змінилися. Перенесення не активоване.');
  const activated=await api('/sync/v2/activate',{method:'POST',body:{epoch,item_count:pairs.length}});
  const hashes=await localHashes(entries);
  await baselineSave(userId,{epoch,hashes,revision:Number(activated.revision)});
  return activated;
}
async function synchronize({api,userId,build,validate,apply,setMeta,conflict,preferServer=false,forceLocal=false,isEditing=()=>false,isUnchanged=()=>true}){
  const initial=build(),localMap=asEntries(initial);
  if(!validate(initial))throw new Error('Неправильна структура локальних даних.');
  const local=await localHashes(localMap);
  const remote=await manifest(api);
  const status=await api('/sync/v2/status');
  if(!status.active||Number(status.revision)!==remote.rev)
    throw new Error('Серверна база змінилася. Повторіть перевірку.');
  // Explicit server selection means a full, revision-pinned restore,
  // including conflicts where the old baseline exists. Never resolve such
  // a conflict by silently uploading local records.
  if(preferServer){
    if(isEditing()){conflict('Завершіть редагування перед отриманням серверних даних.');return false;}
    const keys=[...remote.items.keys()].filter(k=>remote.items.get(k)!==null);
    const data=await readKeys(api,keys,remote.rev);
    const reconstructed=fromEntries(data);
    if(!validate(reconstructed))throw new Error('Серверна копія не пройшла перевірку структури.');
    if(!isUnchanged())throw new Error('Локальні дані змінилися під час завантаження.');
    const check=await api('/sync/v2/status');
    if(!check.active||check.epoch!==status.epoch||Number(check.revision)!==remote.rev)
      throw new Error('Сервер змінився під час отримання даних. Повторіть перевірку.');
    if(!await apply(reconstructed,remote.rev,remote.updated))return false;
    await baselineSave(userId,{epoch:status.epoch,revision:remote.rev,hashes:Object.fromEntries(remote.items)});
    return true;
  }
  let base=await baselineGet(userId,status.epoch);
  if(!base||base.epoch!==status.epoch){
    if(!preferServer){
      conflict('На цьому пристрої немає підтвердженої базової копії v2. Щоб не втратити дані, перевірте резервну копію та вручну оберіть «Взяти дані із сервера».');
      return false;
    }
    if(isEditing())return false;
    const data=await readKeys(api,[...remote.items.keys()].filter(k=>remote.items.get(k)!==null),remote.rev);
    const reconstructed=fromEntries(data);
    if(!validate(reconstructed))throw new Error('Неправильний серверний знімок.');
    if(!isUnchanged())throw new Error('Локальні дані змінилися під час завантаження.');
    const check=await api('/sync/v2/status');
    if(Number(check.revision)!==remote.rev)throw new Error('Дані змінилися на сервері.');
    if(!await apply(reconstructed,remote.rev,remote.updated))return false;
    await baselineSave(userId,{epoch:status.epoch,revision:remote.rev,hashes:Object.fromEntries(remote.items)});
    return true;
  }
  if(forceLocal){conflict('Примусовий перезапис v2 вимкнено для запобігання втраті записів.');return false;}
  const baseHashes=base.hashes||{};
  const all=new Set([...Object.keys(baseHashes),...Object.keys(local),...remote.items.keys()]);
  const uploads=[],downloads=[],conflicts=[],converged=[];
  for(const key of all){
    const before=baseHashes[key]??null,now=local[key]??null,server=remote.items.get(key)??null;
    const localChanged=now!==before,serverChanged=server!==before;
    if(now===server){converged.push([key,server]);continue;}
    if(localChanged&&serverChanged){conflicts.push(key);continue;}
    if(localChanged)uploads.push({key,deleted:!localMap.has(key),value:localMap.get(key)});
    if(serverChanged)downloads.push(key);
  }
  if(conflicts.length){
    conflict('Дані одного або кількох записів змінено на різних пристроях ('+conflicts.length+'). Автоматичний перезапис зупинено.');
    return false;
  }
  if((downloads.length||preferServer)&&isEditing())return false;
  // Fetch incoming records against the original, pinned server revision.
  const incoming=await readKeys(api,downloads.filter(k=>remote.items.get(k)!==null),remote.rev);
  let rev=remote.rev;
  let updated=remote.updated;
  const nextBaseline={...baseHashes};
  for(const [key,sha] of converged)nextBaseline[key]=sha;
  for(let i=0;i<uploads.length;i+=BATCH){
    if(!isUnchanged())throw new Error('Локальні дані змінилися під час надсилання.');
    const changes=uploads.slice(i,i+BATCH).map(x=>x.deleted?{key:x.key,deleted:true}:{key:x.key,value:x.value});
    const result=await api('/sync/v2/write',{method:'POST',body:{base_revision:rev,changes}});
    rev=Number(result.revision);updated=result.updated_at||updated;
    for(const x of changes)nextBaseline[x.key]=x.deleted?null:local[x.key];
    // Persist each acknowledged chunk, including tombstones, to make retries
    // idempotent if the browser closes after a partial multi-request upload.
    await baselineSave(userId,{epoch:status.epoch,revision:rev,hashes:nextBaseline});
  }
  if(downloads.length){
    const combined=new Map(localMap);
    for(const key of downloads){
      if(remote.items.get(key)===null)combined.delete(key);
      else combined.set(key,incoming.get(key));
    }
    const merged=fromEntries(combined);
    if(!validate(merged))throw new Error('Отримані записи не пройшли перевірку структури.');
    if(!isUnchanged())throw new Error('Зміни на пристрої під час синхронізації.');
    const verify=await api('/sync/v2/status');
    if(Number(verify.revision)!==rev)throw new Error('Серверна ревізія змінилася.');
    if(!await apply(merged,rev,updated))return false;
    for(const key of downloads)nextBaseline[key]=remote.items.get(key);
    await baselineSave(userId,{epoch:status.epoch,revision:rev,hashes:nextBaseline});
    return true;
  }
  await baselineSave(userId,{epoch:status.epoch,revision:rev,hashes:nextBaseline});
  return !!setMeta(rev,updated);
}
window.AviculariaIncrementalSync={asEntries,fromEntries,localHashes,manifest,startMigration,synchronize,baselineGet};
})();
