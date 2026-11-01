import test from 'node:test';
import assert from 'node:assert/strict';
import {limits,shuffle,mergeRecords,mockPlan,validateBackup} from '../public/core.js';
test('练习上限按倍率放宽，专项不受影响',()=>{assert.deepEqual(limits(2,'practice',3),{prep:null,answer:360,target:120});assert.equal(limits(1,'practice',2).answer,90);assert.equal(limits(3,'timed',3).answer,60)});
test('抽题打乱但不重复、不修改原题池',()=>{const a=['a','b','c','d'];const b=shuffle(a,()=>0.2);assert.equal(b.length,4);assert.equal(new Set(b).size,4);assert.deepEqual(a,['a','b','c','d'])});
test('合并备份不重复，冲突保留新副本',()=>{const old=[{id:'1',text:'a'}];assert.equal(mergeRecords(old,old).length,1);const both=mergeRecords(old,[{id:'1',text:'b'}],()=> 'copy');assert.equal(both.length,2);assert.equal(both[0].text,'a');assert.equal(both[1].id,'copy')});
test('模拟只选择学生适用问题，P3对应抽中的P2',()=>{const qs=[{id:'s',part:1},{id:'w',part:1,work:true},{id:'c',part:2},{id:'r',part:3,parent:'c'},{id:'x',part:3,parent:'other'}];const plan=mockPlan(qs,()=>0.5);assert.deepEqual(plan.map(q=>q.id),['s','c','r'])});
test('损坏音频和非法引用的备份被拒绝',()=>{assert.throws(()=>validateBackup({version:1,records:[{id:'r',questionId:'missing',audio:'!'}],questions:[],settings:{}}));assert.equal(validateBackup({version:1,records:[],questions:[],settings:{}}),true)});
test('缺少页面必需字段的备份在写入前拒绝',()=>{assert.throws(()=>validateBackup({version:1,questions:[{id:'q',part:1,text:'Question'}],records:[],settings:{}}));});
