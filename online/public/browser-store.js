let db;
export async function openStore(){db=await new Promise((ok,no)=>{const r=indexedDB.open('speaking-studio-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
export function get(key){return new Promise((ok,no)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
export function atomic(values){return new Promise((ok,no)=>{const t=db.transaction('data','readwrite');try{for(const [k,v]of Object.entries(values))t.objectStore('data').put(v,k);}catch(e){t.abort();no(e);return;}t.oncomplete=()=>ok();t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||Error('保存已中断'));});}
