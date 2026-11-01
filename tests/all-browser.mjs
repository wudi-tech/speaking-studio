import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'speaking-regression-'));
const base='http://localhost:18767';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'18767',DATA_DIR:dir,OPEN_BROWSER:'0'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('隔离服务启动超时')),15000);server.stdout.on('data',b=>{if(b.toString().includes('已启动')){clearTimeout(timer);ok();}});server.once('exit',code=>{clearTimeout(timer);no(Error('隔离服务退出 '+code));});});
 for(const file of ['tests/server.test.mjs','tests/browser.mjs','tests/flows.mjs','tests/recovery.mjs']){
  await new Promise((ok,no)=>{const p=spawn(process.execPath,[file],{env:{...process.env,BASE_URL:base},stdio:'inherit'});p.on('exit',code=>code===0?ok():no(Error(file+' 未通过，退出码 '+code)));p.on('error',no);});
 }
 await new Promise((ok,no)=>{const p=spawn(process.execPath,['tests/storage-browser.mjs'],{stdio:'inherit'});p.on('exit',code=>code===0?ok():no(Error('电脑保存浏览器测试未通过')));});
}finally{server.kill();}
