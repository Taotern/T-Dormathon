import fs from 'node:fs';
import path from 'node:path';

/** Prevent overlapping foreground collectors. Never terminates another process. */
export function acquireProcessLock(directory) {
  const file=path.join(directory,'collector-process.json');
  const guard=path.join(directory,'collector-startup.json');
  const owner={pid:process.pid,token:crypto.randomUUID(),started_at:new Date().toISOString()};
  // Every new collector holds this exclusive short-lived guard while inspecting,
  // archiving and replacing a dead owner. Concurrent starters cannot steal a new lock.
  try {fs.writeFileSync(guard,JSON.stringify(owner),{flag:'wx',mode:0o600});}
  catch(e){if(e.code==='EEXIST')throw Error('Another collector startup is in progress, or an earlier startup was interrupted. If no collector is running, inspect collector-startup.json before manually moving that stale startup record.');throw e;}
  try {for(let attempt=0;attempt<2;attempt++) {
    try {fs.writeFileSync(file,JSON.stringify(owner),{flag:'wx',mode:0o600});break;}
    catch(e) {
      if(e.code!=='EEXIST')throw e;
      if(fs.lstatSync(file).isSymbolicLink())throw Error('Process lock is a symlink; stopped safely.');
      let prior;
      try {prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('Unrecognized collector process lock; inspect it manually after stopping collectors.');}
      if(!Number.isInteger(prior.pid)||prior.pid<1||typeof prior.token!=='string')throw Error('Unrecognized collector process lock; stopped safely.');
      try {process.kill(prior.pid,0);throw Error('A collector is already running (PID '+prior.pid+'). Use that window or stop it before starting another.');}
      catch(check) {
        if(check.code!=='ESRCH')throw check;
        // Preserve a stale record for diagnostics; never discard or overwrite it.
        if(attempt===1)throw Error('Collector lock changed during startup. Try again after checking other collector windows.');
        fs.renameSync(file,file+'.stale-'+crypto.randomUUID());
      }
    }
  }}finally {
    const current=JSON.parse(fs.readFileSync(guard,'utf8'));
    if(current.token===owner.token)fs.unlinkSync(guard);
  }
  return ()=> {
    try {
      const current=JSON.parse(fs.readFileSync(file,'utf8'));
      if(current.token===owner.token)fs.unlinkSync(file);
    }catch(e){if(e.code!=='ENOENT')console.error('Could not remove this process lock: '+e.message);}
  };
}
