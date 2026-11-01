if(!process.env.BASE_URL||new URL(process.env.BASE_URL).port==='8765')throw Error('请使用 npm run test:browser，在隔离数据目录运行浏览器测试');
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const paths=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'];
const executablePath=paths.find(fs.existsSync);console.log('browser',executablePath);
const browser=await chromium.launch({executablePath,headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const originalContext=browser.newContext.bind(browser);browser.newContext=async opts=>{const c=await originalContext(opts);await c.addInitScript(()=>localStorage.setItem('speaking-studio-storage-mode','browser'));return c;};const context=await browser.newContext({permissions:['microphone'],acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE ERROR',e.message));await page.goto(process.env.BASE_URL);await page.waitForTimeout(1500);console.log((await page.locator('body').innerText()).slice(0,1200));await browser.close();
