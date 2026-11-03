import bank from '../private-bank.json' with {type:'json'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleApi(request,env,userId){
 if(!userId)return json({error:'请先登录你的账号'},401);
 if(!env.DB||!env.BUCKET)return json({error:'云端存储尚未就绪，请稍后重试'},503);
 const url=new URL(request.url),route=url.pathname.slice(5),prefix=encodeURIComponent(userId)+'/';
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'不允许跨站保存'},403);
 const snapshot=async()=>{const r=await env.DB.prepare('SELECT revision,data FROM states WHERE user_id=?').bind(userId).first();return r?{revision:r.revision,values:JSON.parse(r.data)}:{revision:0,values:{}}};
 try{
 if(route==='bank')return json(bank);
 if(route==='status')return json({app:'speaking-studio-online',cloud:true,transcription:!!(env.STT_URL&&env.STT_KEY&&env.STT_MODEL)});
 if(route==='storage-info')return json({path:'仅你本人可访问的云端存储',cloud:true});
 if(route==='store'){
  if(request.method==='GET')return json(await snapshot());
  if(request.method!=='POST')return json({error:'不支持此操作'},405);
  const raw=await request.text();if(raw.length>900000)return json({error:'记录包过大，请先导出备份'},413);
  const input=JSON.parse(raw),old=await snapshot();if(input.revision!==old.revision)return json({error:'其他设备已更新记录，请先下载未保存录音，再刷新后继续'},409);
  if(!input.values||typeof input.values!=='object'||Object.keys(input.values).some(k=>!['state','records','groups','draft','migrations'].includes(k)))return json({error:'保存内容不正确'},400);
  const values={...old.values,...input.values};const check=async x=>{if(!x||typeof x!=='object')return;if(x.__audio){if(!/^(?:[a-f0-9]{64}|draft-[A-Za-z0-9-]{1,100})$/.test(x.__audio)||!/^audio\//.test(x.type))throw Error('音频信息不正确');const head=await env.BUCKET.head(prefix+x.__audio);if(!head||head.size!==x.size)throw Error('录音尚未完整上传，请重试');}else for(const v of Object.values(x))await check(v)};await check(input.values);
  await env.DB.prepare('INSERT OR IGNORE INTO states(user_id,revision,data,updated_at) VALUES(?,0,?,?)').bind(userId,'{}',new Date().toISOString()).run();
  const next=JSON.stringify(values);if(next.length>900000)return json({error:'记录过多，请先导出备份'},413);
  if(old.revision>0)await env.DB.prepare('INSERT INTO snapshots(id,user_id,revision,data,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),userId,old.revision,JSON.stringify({...old.values,draft:null}),new Date().toISOString()).run();
  const result=await env.DB.prepare('UPDATE states SET revision=revision+1,data=?,updated_at=? WHERE user_id=? AND revision=?').bind(next,new Date().toISOString(),userId,old.revision).run();
  if(result.meta.changes!==1)return json({error:'其他设备刚更新了记录，请刷新后继续'},409);
  try{await env.DB.prepare('DELETE FROM snapshots WHERE user_id=? AND id NOT IN (SELECT id FROM snapshots WHERE user_id=? ORDER BY revision DESC LIMIT 20)').bind(userId,userId).run();}catch(e){console.error('Snapshot cleanup deferred',e.message);}
  if(input.values.draft===null&&old.values.draft?.blob?.__audio?.startsWith('draft-')){try{await env.BUCKET.delete(prefix+old.values.draft.blob.__audio);}catch{}}return json({revision:old.revision+1});
 }
 if(route==='audio'&&request.method==='POST'){
  const type=request.headers.get('Content-Type')||'';if(!/^audio\/(webm|ogg|mp4|wav|mpeg)(;[^\r\n]*)?$/.test(type))return json({error:'不支持此音频格式'},415);
  if(Number(request.headers.get('Content-Length')||0)>20000000)return json({error:'录音超过20MB，请缩短录音'},413);
  const bytes=await request.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>20000000)return json({error:'录音为空或超过20MB'},413);
  const draft=request.headers.get('X-Audio-Role')==='draft';const recordId=request.headers.get('X-Recording-Id')||'';if(draft&&!/^[A-Za-z0-9-]{1,100}$/.test(recordId))return json({error:'缺少录音编号'},400);const hash=draft?'draft-'+recordId:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');await env.BUCKET.put(prefix+hash,bytes,{httpMetadata:{contentType:type}});return json({__audio:hash,type,size:bytes.byteLength});
 }
 if(route.startsWith('audio/')&&request.method==='GET'){const hash=route.slice(6);if(!/^(?:[a-f0-9]{64}|draft-[A-Za-z0-9-]{1,100})$/.test(hash))return json({error:'音频编号不正确'},400);const item=await env.BUCKET.get(prefix+hash);return item?new Response(item.body,{headers:{'Content-Type':item.httpMetadata?.contentType||'audio/webm','Cache-Control':'private, no-store'}}):json({error:'未找到此录音'},404);}
 if(route==='transcribe'&&request.method==='POST'){
  if(!env.STT_URL||!env.STT_KEY||!env.STT_MODEL)return json({error:'在线转写尚未配置，录音已保存在云端，可稍后重试'},503);
  const bytes=await request.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>20000000)return json({error:'录音为空或过大'},413);const type=request.headers.get('Content-Type')||'audio/webm';const ext=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';const body=new FormData();body.append('file',new Blob([bytes],{type}),'answer.'+ext);body.append('model',env.STT_MODEL);body.append('language','en');const response=await fetch(env.STT_URL,{method:'POST',headers:{Authorization:'Bearer '+env.STT_KEY},body,signal:AbortSignal.timeout(180000)});if(!response.ok)return json({error:'转写服务暂不可用，录音已保留'},502);const data=await response.json();return typeof data.text==='string'?json({text:data.text}):json({error:'转写未返回文字'},502);
 }
 return json({error:'没有此接口'},404);
 }catch(e){console.error(e.message);return json({error:'云端保存未完成，请保留页面并重试'},500);}
}
