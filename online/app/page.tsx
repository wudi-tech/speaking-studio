import Script from 'next/script';
import {requireChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){await requireChatGPTUser('/');return <><div id="app"><p className="loading">正在打开你的云端练习桌…</p></div><div id="toast" role="status" aria-live="polite"/><dialog id="modal"/><Script src="/app.js" type="module" strategy="afterInteractive"/></>}
