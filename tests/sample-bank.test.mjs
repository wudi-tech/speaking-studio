import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mockPlan} from '../public/core.js';
const bank=JSON.parse(await readFile(new URL('../public/bank.sample.json',import.meta.url),'utf8'));
test('公开示例独立完整，不依赖私有题库',()=>{assert.equal(bank.sample,true);assert.equal(bank.questions.length,12);assert.equal(new Set(bank.questions.map(q=>q.id)).size,12);for(const q of bank.questions){for(const f of ['english','keywords','chinese'])assert.ok(q[f]?.length>0);if(q.part===2)assert.equal(q.points.length,4);}assert.ok(bank.groups[0].ids.every(id=>bank.questions.some(q=>q.id===id)));});
test('公开示例可以组织三个Part且追问关联题卡',()=>{const plan=mockPlan(bank.questions);assert.deepEqual([...new Set(plan.map(q=>q.part))],[1,2,3]);const card=plan.find(q=>q.part===2);assert.ok(plan.filter(q=>q.part===3).every(q=>q.parent===card.id));});
