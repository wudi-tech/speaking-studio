import * as browser from './browser-store.js';
export const asDataURL=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(blob);});
const pref='speaking-studio-storage-mode';
export function storageMode(){return 'disk';}
let mode=storageMode(),cache={},revision=0,queue=Promise.resolve(),info={},legacyAvailable=false;
const uploaded=new WeakMap();
const clone=x=>x instanceof Blob?x:Array.isArray(x)?x.map(clone):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,clone(v)])):x;
async function request(url,options){const response=await fetch(url,options);const result=await response.json();if(!response.ok)throw Error(result.error||'云端保存失败，请检查网络连接后重试');return result;}
async function encode(x,draft=false){if(x instanceof Blob){const upload=()=>request('/api/audio',{method:'POST',headers:{'Content-Type':x.type||'audio/webm','X-Audio-Role':draft?'draft':'record','X-Recording-Id':draft||''},body:x});if(draft)return upload();if(!uploaded.has(x))uploaded.set(x,upload().catch(e=>{uploaded.delete(x);throw e;}));return uploaded.get(x);}if(Array.isArray(x))return Promise.all(x.map(v=>encode(v,draft)));if(x&&typeof x==='object')return Object.fromEntries(await Promise.all(Object.entries(x).map(async([k,v])=>[k,await encode(v,draft)])));return x;}
async function encodeValues(values){return Object.fromEntries(await Promise.all(Object.entries(values).map(async([k,v])=>[k,await encode(v,k==='draft'?(v?.id||crypto.randomUUID()):false)])));}
async function decode(x){if(x?.__audio){const r=await fetch('/api/audio/'+x.__audio+'?type='+encodeURIComponent(x.type));if(!r.ok)throw Error('云端音频暂时无法读取，请检查网络连接后重试');const blob=new Blob([await r.arrayBuffer()],{type:x.type});if(!x.__audio.startsWith('draft-'))uploaded.set(blob,Promise.resolve(x));return blob;}if(Array.isArray(x))return Promise.all(x.map(decode));if(x&&typeof x==='object')return Object.fromEntries(await Promise.all(Object.entries(x).map(async([k,v])=>[k,await decode(v)])));return x;}
export async function readBrowserData(){await browser.openStore();const result={};for(const key of ['state','records','groups','draft']){const v=await browser.get(key);if(v!==undefined)result[key]=v;}return result;}
export function storageInfo(){return {...info,mode,legacyAvailable};}
export async function openStore(){mode=storageMode();info=await request('/api/storage-info');if(mode==='browser'){await browser.openStore();return;}const snapshot=await request('/api/store');revision=snapshot.revision;cache=await decode(snapshot.values);}

export async function get(key){return mode==='browser'?browser.get(key):clone(cache[key]);}
export function set(key,value){return atomic({[key]:value});}
export function atomic(values){const snapshot=clone(values);if(mode==='browser')return browser.atomic(snapshot);const operation=queue.then(async()=>{const encoded=await encodeValues(snapshot);const result=await request('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,values:encoded})});revision=result.revision;Object.assign(cache,snapshot);});queue=operation.catch(()=>{});return operation;}
export async function switchStorage(){throw Error('在线版统一保存到云端，电脑可以关机。');}
