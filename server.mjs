import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {FileStore} from './disk-store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const port=Number(process.env.PORT||8765);
const disk=new FileStore(path.resolve(process.env.DATA_DIR||path.join(root,'data')));
await disk.init();
const server=http.createServer(async(req,res)=>{
 const send=(status,data,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')&&!Buffer.isBuffer(data)?JSON.stringify(data):data);};
 try{
  const url=new URL(req.url,'http://localhost');
  const sameOrigin=req.headers.origin===`http://${req.headers.host}`;
  if(!/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host||''))return send(403,{error:'只允许本机访问'});
  const body=async max=>{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>max){const e=Error('保存内容过大，请分批备份');e.status=413;throw e;}chunks.push(c);}return Buffer.concat(chunks);};
  if(url.pathname==='/api/storage-info')return send(200,{path:disk.dir,recovered:disk.recovered});
  if(url.pathname==='/api/store'){
   if(req.method==='GET')return send(200,disk.snapshot());
   if(req.method!=='POST'||!sameOrigin)return send(403,{error:'只允许本地页面保存'});
   const data=JSON.parse((await body(20*1024*1024)).toString('utf8'));return send(200,await disk.update(data.values,data.revision));
  }
  if(url.pathname==='/api/audio'){
   if(req.method!=='POST'||!sameOrigin)return send(403,{error:'只允许本地页面保存录音'});
   return send(200,await disk.putAudio(await body(50*1024*1024),req.headers['content-type']||'audio/webm',req.headers['x-audio-role']==='draft'));
  }
  if(url.pathname.startsWith('/api/audio/')){if(req.method!=='GET')return send(405,{error:'只允许读取'});const type=url.searchParams.get('type')||'audio/webm';if(!/^audio\/(webm|ogg|mp4|wav|mpeg)(;[^\r\n]*)?$/.test(type))return send(400,{error:'音频格式不正确'});return send(200,await disk.audio(url.pathname.slice('/api/audio/'.length)),type);}
  if(url.pathname==='/api/status')return send(200,{app:'speaking-studio',transcription:!!(process.env.STT_URL&&process.env.STT_KEY&&process.env.STT_MODEL)});
  if(url.pathname==='/api/transcribe'){
   if(req.method!=='POST')return send(405,{error:'仅支持上传录音'});
   if(req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'只允许本地页面调用'});
   if(!process.env.STT_URL||!process.env.STT_KEY||!process.env.STT_MODEL)return send(503,{error:'转写尚未配置。请按使用说明配置 .env，录音仍已保存在本地。'});
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>50*1024*1024){return send(413,{error:'音频超过50MB，请选择较短的录音'});}chunks.push(c);}
   const type=(req.headers['content-type']||'').split(';')[0];if(!['audio/webm','audio/ogg','audio/mp4','audio/wav','audio/mpeg'].includes(type))return send(415,{error:'服务暂不接受此录音格式'});
   const form=new FormData();form.append('file',new Blob(chunks,{type}),`answer.${{'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/wav':'wav','audio/mpeg':'mp3'}[type]}`);form.append('model',process.env.STT_MODEL);form.append('language','en');
   const response=await fetch(process.env.STT_URL,{method:'POST',headers:{Authorization:`Bearer ${process.env.STT_KEY}`},body:form,signal:AbortSignal.timeout(180000)});
   if(!response.ok)return send(502,{error:`转写服务返回 ${response.status}，请检查服务配置或稍后重试`});const result=await response.json();if(typeof result.text!=='string')throw Error('转写服务未返回文字');return send(200,{text:result.text});
  }
  if(req.method!=='GET')return send(405,{error:'方法不支持'});
  const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const file=path.resolve(root,'public',name);if(!file.startsWith(path.join(root,'public')+path.sep))return send(403,{error:'禁止访问'});
  let buf;try{buf=await readFile(file);}catch(e){if(name==='bank.json'&&e.code==='ENOENT')buf=await readFile(path.join(root,'public','bank.sample.json'));else throw e;}send(200,buf,({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(file)]||'application/octet-stream'));
 }catch(e){if(e.code==='ENOENT')return send(404,{error:'文件未找到'});console.error(e.message);send(e.status||500,{error:e.status?e.message:e.name==='TimeoutError'?'转写超时，原录音已保留，可稍后重试':'操作未完成，请保持启动窗口开启并重试'});}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口${port}已被占用，请先尝试打开 http://localhost:${port}`:e.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{console.log(`Speaking Studio 已启动：http://localhost:${port}\n保持此窗口开启，按 Ctrl+C 停止。`);if(process.env.OPEN_BROWSER==='1')spawn('powershell.exe',['-NoProfile','-Command',`Start-Process 'http://localhost:${port}'`],{windowsHide:true,stdio:'ignore'}).on('error',e=>console.error('请手动打开页面：',e.message));});
