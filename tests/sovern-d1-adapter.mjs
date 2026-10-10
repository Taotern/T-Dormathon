import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export class SovernTestD1 {
  constructor({seed=true}={}){this.db=new DatabaseSync(':memory:');this.db.exec(fs.readFileSync(new URL('../drizzle/0010_sovern_advisor_budget.sql',import.meta.url),'utf8'));this.failReconcile=false;this.failRead=false;if(seed)this.db.prepare('INSERT INTO sovern_advisor_budget(id,limit_nanomyr,booked_nanomyr,request_count,blocked) VALUES(?,?,?,?,0) ON CONFLICT(id) DO NOTHING').run('dormathon-sovern-demo-v1',5000000000,3006050,0);}
  prepare(sql){const self=this;return {bind(...args){return {async first(){if(self.failRead)throw new Error('private failure not for response');return self.db.prepare(sql).get(...args)||null;},async run(){if(self.failReconcile&&sql.startsWith('UPDATE sovern_advisor_requests'))throw new Error('private failure not for response');const r=self.db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};}};}
  budget(){return this.db.prepare("SELECT b.id,b.limit_nanomyr,b.booked_nanomyr+COALESCE((SELECT SUM(booked_nanomyr) FROM sovern_advisor_requests),0) AS booked_nanomyr,b.request_count+(SELECT COUNT(*) FROM sovern_advisor_requests) AS request_count,CASE WHEN b.blocked=1 OR EXISTS(SELECT 1 FROM sovern_advisor_requests WHERE state IN ('reserved','unknown','billing_overrun')) THEN 1 ELSE 0 END AS blocked FROM sovern_advisor_budget b").get();}
  requests(){return this.db.prepare('SELECT * FROM sovern_advisor_requests ORDER BY created_ms').all();}
  close(){this.db.close();}
}
