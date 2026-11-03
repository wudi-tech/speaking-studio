import test from 'node:test';
import assert from 'node:assert/strict';
import {applyHintUpdate} from '../public/core.js';

test('题号导入提示保留英文示范、分组外的题目与进度，并保存旧提示',()=>{
 const old={questions:[{id:'q1',text:'Question?',english:'My example',keywords:'old',chinese:'旧思路',points:[]},{id:'custom',text:'Custom'}],status:{q1:'green'},notes:{q1:'My note'},rounds:{r:['q1']},current:'q1'};
 const bank={hintUpdate:{id:'fixture-v1'},questions:[{id:'q1',text:'Question?',english:'',keywords:'new cue',chinese:'新思路'}]};
 const result=applyHintUpdate(old,bank);
 assert.equal(result.questions[0].keywords,'new cue');assert.equal(result.questions[0].chinese,'新思路');assert.equal(result.questions[0].english,'My example');
 assert.equal(result.questions[0].recoveredHints[0].keywords,'old');assert.deepEqual(result.questions[1],old.questions[1]);
 for(const field of ['status','notes','rounds','current'])assert.deepEqual(result[field],old[field]);
 assert.equal(old.questions[0].keywords,'old');
 result.questions[0].keywords='edited after import';assert.equal(applyHintUpdate(result,bank).questions[0].keywords,'edited after import');
 assert.equal(applyHintUpdate(old,{questions:[]}),old);
});
