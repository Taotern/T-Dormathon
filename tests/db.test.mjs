import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Store,DatabaseUnavailable} from '../worker/db.js';
test('Missing durable binding fails explicitly instead of falling back to browser or memory',()=>assert.throws(()=>new Store(null),DatabaseUnavailable));
test('Values remain bound and runtime DDL/multiple statements are rejected',async()=>{
 const calls=[];
 const store=new Store({prepare(sql){const entry={sql,values:[]};calls.push(entry);return{bind(...values){entry.values=values;return{async all(){return{results:[{value:1}]}},async first(){return{value:1}},async run(){return{success:true}}}}}},async batch(statements){return statements.map(()=>({success:true}))}});
 await store.write('INSERT INTO settings(key,value) VALUES(?,?)',["x');DROP TABLE settings;--",'private']);
 assert.equal(calls[0].sql,'INSERT INTO settings(key,value) VALUES(?,?)');assert.equal(calls[0].values.length,2);
 assert.throws(()=>store.statement('SELECT 1;SELECT 2'));
 assert.throws(()=>store.statement('CREATE TABLE unsupported(id TEXT)'));
 assert.deepEqual(await store.rows('SELECT value FROM settings WHERE key=?',['x']),[{value:1}]);
});
