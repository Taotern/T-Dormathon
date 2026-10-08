const dateOf=p=>`${p.year}-${p.month}-${p.day}`;
export function localParts(clock,timeZone) {
  const f=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  return Object.fromEntries(f.formatToParts(new Date(clock)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
export function addDays(day,n) {return new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function dueDay(clock,config) {const p=localParts(clock,config.time_zone),day=dateOf(p);return Number(p.hour)>=8?day:addDays(day,-1);}
export function scheduledAt(day,config) {
  const [y,m,d]=day.split('-').map(Number),target=Date.UTC(y,m-1,d,8);
  let guess=target;
  for(let i=0;i<5;i++) {
    const p=localParts(guess,config.time_zone),observed=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));
    const delta=target-observed;if(!delta)return guess;guess+=delta;
  }
  throw Error('Cannot resolve daily local time in configured timezone.');
}
export function nextDue(clock,config) {return scheduledAt(addDays(dueDay(clock,config),1),config);}
