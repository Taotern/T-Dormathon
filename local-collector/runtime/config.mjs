import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DEFAULTS={time_zone:'Asia/Kuching',daily_time:'08:00',poll_seconds:60,retry_minutes:16,data_directory:'data-local',exports_directory:'exports'};
export function loadConfig(file=path.join(ROOT,'config.json')) {
  const input=JSON.parse(fs.readFileSync(file,'utf8'));
  const allowed=new Set(Object.keys(DEFAULTS));
  for(const key of Object.keys(input))if(!allowed.has(key))throw Error('Unknown config field: '+key);
  const c={...DEFAULTS,...input};
  new Intl.DateTimeFormat('en',{timeZone:c.time_zone}).format(new Date());
  if(c.daily_time!=='08:00')throw Error('This release supports daily_time 08:00. Choose the explicit time_zone as needed.');
  if(!Number.isInteger(c.poll_seconds)||c.poll_seconds<10||c.poll_seconds>3600)throw Error('poll_seconds must be 10–3600.');
  if(!Number.isInteger(c.retry_minutes)||c.retry_minutes<16||c.retry_minutes>240)throw Error('retry_minutes must be 16–240.');
  for(const key of ['data_directory','exports_directory']) {
    if(typeof c[key]!=='string'||!c[key]||path.isAbsolute(c[key])||c[key].split(/[\\/]/).includes('..'))throw Error(key+' must be a relative path inside this extracted package.');
    const target=path.resolve(ROOT,c[key]);
    if(target===ROOT||!target.startsWith(ROOT+path.sep))throw Error(key+' must stay below this package.');
    // Reject an existing symlink component rather than silently following it outside the package.
    let current=ROOT;
    for(const part of path.relative(ROOT,target).split(path.sep)) {
      current=path.join(current,part);
      if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error(key+' contains a symlink; choose a normal local directory.');
    }
    c[key]=target;
  }
  return c;
}
