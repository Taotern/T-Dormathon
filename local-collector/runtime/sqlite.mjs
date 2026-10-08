import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

/** Native SQLite, with the unchanged collector's small D1-shaped access contract. */
export class LocalD1 {
  constructor(file=':memory:') {
    this.queryCount=0;
    this.db=new DatabaseSync(file);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      if(file!==':memory:')this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      const version=Number(this.db.prepare('PRAGMA user_version').get().user_version);
      if(version>1)throw Error('Database is newer than this package; no downgrade was attempted.');
      if(version===0) {
        const tables=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        if(tables.length)throw Error('Unrecognized existing database; no migration or overwrite was attempted.');
        this.db.exec('BEGIN IMMEDIATE');
        try {
          this.db.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
          this.db.exec('PRAGMA user_version=1; COMMIT;');
        }catch(e){this.db.exec('ROLLBACK');throw e;}
      }
    }catch(e){this.db.close();throw e;}
  }
  prepare(sql) {
    this.queryCount++;
    const db=this.db;
    return {bind(...values){
      const args=values.map(v=>v===undefined?null:v);
      return {
        async all(){return {results:db.prepare(sql).all(...args)};},
        async first(){return db.prepare(sql).get(...args)||null;},
        async run(){return this._execute();},
        _execute(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}
      };
    }};
  }
  async batch(statements) {
    this.db.exec('BEGIN IMMEDIATE');
    try {const results=statements.map(s=>s._execute());this.db.exec('COMMIT');return results;}
    catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  close(){this.db.close();}
}
