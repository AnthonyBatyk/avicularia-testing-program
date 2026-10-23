/* KBJV v128 - transactional IndexedDB storage for large per-account collections.
   Namespaces and keys never cross between production and development.
   Synchronous reads are served from a hydrated in-memory cache; every mutation
   is queued to IndexedDB in its original order. No legacy values are discarded
   until a roundtrip read confirms the new durable copy.
*/
(()=>{
  "use strict";
  const native=window.localStorage;
  const DB_NAME="avicularia_testing_big_data_v1";
  const KEY_NAMES=["products","calculator","archive","undo_snapshot"];
  const workspace="avicularia-testing";
  const namespacedPrefix="avicularia_testing_user_";
  let currentPrefix="",database=null,available=false,pending=Promise.resolve(),lastError="";
  let activeCache=new Map(),prepared=false;
  const isLargeKey=key=>prepared&&String(key).startsWith(currentPrefix)&&KEY_NAMES.includes(String(key).slice(currentPrefix.length));
  const storageKey=key=>workspace+":"+String(key);
  const markerKey=userId=>"kbjv_idb_migrated_v128_"+workspace+"_"+String(userId);
  const wrapError=error=>{
    const message="Помилка IndexedDB: "+String(error?.message||error||"запис не завершено");
    lastError=message;
    window.dispatchEvent(new CustomEvent("kbjv:storage-failure",{detail:{message}}));
    return error;
  };
  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains("kv"))db.createObjectStore("kv");
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error("Неможливо відкрити IndexedDB"));
      request.onblocked=()=>reject(new Error("Інша вкладка блокує відкриття IndexedDB"));
    });
  }
  function transaction(action,key,value){
    return new Promise((resolve,reject)=>{
      let done=false;
      let tx;
      try{
        tx=database.transaction("kv",action==="get"?"readonly":"readwrite");
        const store=tx.objectStore("kv");
        const request=action==="get"?store.get(storageKey(key)):
          action==="put"?store.put(value,storageKey(key)):store.delete(storageKey(key));
        let result;
        request.onsuccess=()=>{result=request.result;};
        tx.oncomplete=()=>{done=true;resolve(result);};
        tx.onerror=()=>{if(!done){done=true;reject(tx.error||new Error("Не вдалося виконати транзакцію IndexedDB"));}};
        tx.onabort=()=>{if(!done){done=true;reject(tx.error||new Error("Транзакція IndexedDB скасована"));}};
      }catch(error){reject(error);}
    });
  }
  const enqueue=(action,key,value)=>{
    if(lastError)throw new Error(lastError);
    const work=pending.then(()=>transaction(action,key,value));
    pending=work.catch(wrapError);
    return work;
  };
  const storage={
    getItem(key){
      const name=String(key);
      if(isLargeKey(name)&&available)return activeCache.has(name)?activeCache.get(name):null;
      return native.getItem(name);
    },
    setItem(key,value){
      const name=String(key),text=String(value);
      if(isLargeKey(name)&&available){
        if(lastError)throw new Error(lastError);
        activeCache.set(name,text);
        enqueue("put",name,text);
      }else native.setItem(name,text);
    },
    removeItem(key){
      const name=String(key);
      if(isLargeKey(name)&&available){
        if(lastError)throw new Error(lastError);
        activeCache.delete(name);
        enqueue("delete",name);
      }else native.removeItem(name);
    },
    key(index){
      const keys=[];
      for(let i=0;i<native.length;i++)keys.push(native.key(i));
      if(available)for(const key of activeCache.keys())if(!keys.includes(key))keys.push(key);
      return keys[index]??null;
    },
    get length(){
      if(!available)return native.length;
      let additional=0;
      for(const key of activeCache.keys())if(native.getItem(key)===null)additional++;
      return native.length+additional;
    },
    clear(){
      throw new Error("Повне очищення storage виконується лише через контрольовані операції програми.");
    }
  };
  async function prepare(userId){
    // prepare always runs before application data is read or modified.
    const prefix=namespacedPrefix+String(userId)+"_";
    if(prepared&&currentPrefix===prefix)return {available,prefix};
    // A new user cannot inherit the in-memory state of a previous user.
    if(prepared&&available)await whenIdle();
    activeCache=new Map();currentPrefix=prefix;prepared=false;
    try{
      if(!window.indexedDB)throw new Error("IndexedDB не підтримується");
      database=database||await openDb();
      for(const suffix of KEY_NAMES){
        const key=currentPrefix+suffix;
        const old=native.getItem(key);
        const existing=await transaction("get",key);
        if(existing!==undefined&&typeof existing!=="string")throw new Error("Невідомий тип даних у IndexedDB: "+suffix);
        if(old!==null&&existing!==undefined&&old!==existing){
          throw new Error("Знайдено різні локальні копії: "+suffix+". Дані збережено; потрібна перевірка резервної копії.");
        }
        if(existing===undefined&&old!==null){
          // Import legacy data; verify its persistence before removing old copy.
          await transaction("put",key,old);
          const verified=await transaction("get",key);
          if(verified!==old)throw new Error("Перевірка міграції не пройшла: "+suffix);
          activeCache.set(key,old);
          native.removeItem(key);
        }else if(existing!==undefined){
          activeCache.set(key,existing);
          if(old!==null)native.removeItem(key);
        }
      }
      native.setItem(markerKey(userId),"1");
      available=true;prepared=true;lastError="";
      return {available:true,prefix};
    }catch(error){
      // On a real migration conflict, do NOT start with partial data or upload an empty snapshot.
      available=false;prepared=false;
      if(String(error?.message||"").includes("різні локальні копії"))throw error;
      // If IndexedDB isn't accessible at all, safely continue using legacy localStorage.
      // If migration partly completed, do NOT fallback because some original keys
      // have already been removed following successful IDB verification.
      const migrated=KEY_NAMES.some(suffix=>activeCache.has(currentPrefix+suffix));
      if(migrated||native.getItem(markerKey(userId))==="1")throw error;
      return {available:false,prefix,reason:String(error?.message||error)};
    }
  }
  async function whenIdle(){
    await pending;
    if(lastError)throw new Error(lastError);
  }
  function clearStorageFailure(){lastError="";}
  window.KBJVStorage=Object.freeze({storage,prepare,whenIdle,get available(){return available;},get error(){return lastError;},clearStorageFailure});
})();
