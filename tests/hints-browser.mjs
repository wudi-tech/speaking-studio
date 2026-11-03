if(!process.env.BASE_URL||new URL(process.env.BASE_URL).port==='8765')throw Error('Use an isolated test server');
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const bank=JSON.parse(await readFile(new URL('../public/bank.sample.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try{
 const context=await browser.newContext({permissions:['microphone']});
 await context.addInitScript(()=>localStorage.setItem('speaking-studio-storage-mode','browser'));
 const page=await context.newPage();let incoming=structuredClone(bank);
 await page.route('**/bank.json',route=>route.fulfill({json:incoming}));
 await page.goto(process.env.BASE_URL);await page.locator('#questionPicker').waitFor();
 await page.locator('[data-action="start"]').click();await page.locator('[data-action="stop"]').waitFor();await page.waitForTimeout(1000);await page.locator('[data-action="stop"]').click();
 await page.waitForFunction(()=>document.body.textContent.includes('1 次作答已保存'));
 const before=await page.evaluate(async()=>{const s=await import('/store.js');const state=await s.get('state');state.notes.fixture='Keep this note';await s.set('state',state);return {state,record:(await s.get('records'))[0].id,bytes:(await s.get('records'))[0].blob.size};});
 const q=before.state.current;incoming.hintUpdate={id:'synthetic-browser-fixture-v1'};const target=incoming.questions.find(x=>x.id===q);target.keywords='Updated cue from fixture';target.chinese='新的合成测试提示';
 await page.reload();await page.locator('#questionPicker').waitFor();await page.locator('[data-level="2"]').click();await page.waitForFunction(()=>document.querySelector('.hint')?.textContent.includes('Updated cue from fixture'));
 const after=await page.evaluate(async()=>{const s=await import('/store.js');const state=await s.get('state');const r=(await s.get('records'))[0];return {state,record:r.id,bytes:r.blob.size};});
 assert.equal(after.record,before.record);assert.equal(after.bytes,before.bytes);assert.deepEqual(after.state.notes,before.state.notes);assert.deepEqual(after.state.status,before.state.status);assert.deepEqual(after.state.rounds,before.state.rounds);
 await page.evaluate(async()=>{const s=await import('/store.js');const state=await s.get('state');state.questions.find(x=>x.id===state.current).keywords='My later edit';await s.set('state',state);});
 await page.reload();await page.waitForFunction(()=>document.querySelector('.hint')?.textContent.includes('My later edit'));
 console.log('PASS old saved bank receives new hints; recording, notes and progress survive; later edits survive refresh');
}finally{await browser.close();}
