import type { Metadata } from 'next';
export const metadata:Metadata={title:'Speaking Studio · 每日开口',description:'你的个人口语练习桌，手机与电脑均可使用。'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><head><link rel="stylesheet" href="/style.css"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body>{children}</body></html>}
