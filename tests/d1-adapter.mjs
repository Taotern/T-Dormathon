import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
export class LocalD1{
 constructor(path=':memory:',{migrate=true}={}){this.queryCount=0;this.db=new DatabaseSync(path);if(migrate)for(const name of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql'))){this.db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'))}}
 prepare(sql){this.queryCount++;const db=this.db;return{bind(...values){const params=values.map(v=>v===undefined?null:v);return{async all(){return{results:db.prepare(sql).all(...params)}},async first(){return db.prepare(sql).get(...params)||null},async run(){const r=db.prepare(sql).run(...params);return{success:true,meta:{changes:Number(r.changes)}}},_execute(){const r=db.prepare(sql).run(...params);return{success:true,meta:{changes:Number(r.changes)}}}}}}}
 async batch(statements){this.db.exec('BEGIN');try{const result=statements.map(s=>s._execute());this.db.exec('COMMIT');return result}catch(e){this.db.exec('ROLLBACK');throw e}}
 close(){this.db.close()}
}
