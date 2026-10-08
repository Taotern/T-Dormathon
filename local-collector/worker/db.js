/** Site-owned D1 access only. Production schema is owned by generated migrations. */
export class DatabaseUnavailable extends Error {
  constructor(){super('持久数据库暂时不可用。请保留输入并稍后重试。');this.code='database_unavailable';this.status=503;}
}
export class ResourceLimitError extends Error{constructor(message){super(message);this.status=400;this.code='resource_limit'}}
export class Store {
  constructor(binding){if(!binding || typeof binding.prepare!=='function')throw new DatabaseUnavailable();this.binding=binding;}
  statement(sql,values=[]){
    if(typeof sql!=='string' || /;\s*\S/.test(sql) || /\b(?:CREATE|ALTER|DROP)\b/i.test(sql))throw new Error('Application prepares exactly one non-DDL SQL statement');
    if(values.length>100||values.some(v=>typeof v==='string'&&new TextEncoder().encode(v).length>1800000))throw new ResourceLimitError('输入超过单次持久化参数上限，请拆分文件；没有写入部分记录。');
    return this.binding.prepare(sql).bind(...values);
  }
  async rows(sql,values=[]){const r=await this.statement(sql,values).all();return r.results||[];}
  async first(sql,values=[]){return await this.statement(sql,values).first();}
  async write(sql,values=[]){return await this.statement(sql,values).run();}
  async batch(operations){if(operations.length>32)throw new ResourceLimitError('输入超过单次事务上限，请拆分文件；没有写入部分记录。');return await this.binding.batch(operations.map(o=>this.statement(o.sql,o.values||[])));}
}
