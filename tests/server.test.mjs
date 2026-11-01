import test from 'node:test';import assert from 'node:assert/strict';
test('本地服务提供真实题库JSON而非Buffer包装',async()=>{const r=await fetch((process.env.BASE_URL||'http://localhost:8765')+'/bank.json');const bank=await r.json();assert.equal(bank.questions?.length,bank.sample?12:171);assert.equal(bank.groups?.length,bank.sample?1:10)});
