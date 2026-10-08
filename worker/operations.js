import {ValidationError,DOMAINS,has,finiteNumber,dateMicros,round,mean,fixed,validDomain,clone} from './common.js';
export function validatePayload(domain,input,templates){
 validDomain(domain);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>80)throw new ValidationError('每行必须为最多80字段的对象');const p=clone(input);
 for(const f of templates[domain].required_fields)if(!has(p,f)||p[f]===null||p[f]==='')throw new ValidationError('缺少必填字段 '+f);
 const nums={supply:['on_hand','daily_demand','lead_time_days','reorder_point','ordered_qty','fulfilled_qty'],procurement:['amount','paid_amount','po_amount','received_amount'],service:['sla_hours'],energy:['kwh','baseline_kwh','waste_kg','recycled_kg']}[domain];
 for(const f of nums){if(has(p,f)&&p[f]!==null&&p[f]!=='')p[f]=finiteNumber(p[f],f);else delete p[f]}
 for(const f of {supply:['expiry_date'],procurement:['due_date','invoice_date'],service:['opened_at','resolved_at'],energy:['period_start','period_end']}[domain].concat('occurred_at')){if(p[f])dateMicros(p[f]);else delete p[f]}
 for(const f of {supply:['sku'],procurement:['invoice_id','vendor','currency'],service:['ticket_id','status'],energy:['meter_id']}[domain]){if(typeof p[f]!=='string'||!p[f].trim()||p[f].length>200)throw new ValidationError(f+' 必须为1–200字符文本');p[f]=p[f].trim()}
 if(domain==='procurement'){p.currency=p.currency.toUpperCase();if(!/^[A-Z]{3}$/.test(p.currency))throw new ValidationError('currency 必须为三字母币种代码')}
 if(domain==='service'){p.status=p.status.toLowerCase();if(!['open','in_progress','resolved','closed'].includes(p.status))throw new ValidationError('无效工单状态');if(p.sla_hours<=0)throw new ValidationError('sla_hours 必须大于0');if(['resolved','closed'].includes(p.status)&&!p.resolved_at)throw new ValidationError('已解决工单必须提供 resolved_at');if(['open','in_progress'].includes(p.status)&&p.resolved_at)throw new ValidationError('未解决工单不能提供 resolved_at');if(p.resolved_at&&dateMicros(p.resolved_at)<dateMicros(p.opened_at))throw new ValidationError('resolved_at 早于 opened_at')}
 if(domain==='energy'){if(dateMicros(p.period_end)<=dateMicros(p.period_start))throw new ValidationError('period_end 必须晚于 period_start');if((p.recycled_kg||0)>(p.waste_kg??Infinity))throw new ValidationError('回收量不能超过废弃物总量')}
 return p;
}
export function latestRows(records,key){const groups=new Map();for(const r of records){const old=groups.get(r.payload[key]);if(!old||dateMicros(r.occurred_at)>dateMicros(old.occurred_at)||(dateMicros(r.occurred_at)===dateMicros(old.occurred_at)&&r.id>old.id))groups.set(r.payload[key],r)}return [...groups.values()]}
export function analyzeOperations(records,domain,clock=Date.now()){
 const metrics=[],findings=[],limitations=['规则分析仅基于导入字段，缺失信息不会由 AI 补造。'],rows=records.filter(r=>r.domain===domain);
 const m=(label,value,unit='')=>metrics.push({label,value,unit});const f=(rule_id,title,severity,detail,rs,recommended_action)=>findings.push({rule_id,title,severity,detail,evidence_ids:rs.map(r=>r.id),recommended_action});
 if(!rows.length)return{metrics,findings,limitations:['尚未导入该业务域的运营数据。公共历史数据不会代替你的业务台账。']};
 if(domain==='supply'){
  const active=latestRows(rows,'sku'),coverage=[];let gaps=0;m('有效 SKU',active.length,'个');
  for(const r of active){const p=r.payload,days=p.daily_demand?p.on_hand/p.daily_demand:null;if(days!==null){coverage.push(days);if(days<=p.lead_time_days)f('coverage_lead','补货窗口覆盖不足 · '+p.sku,'high',`库存 ${p.on_hand}；日需求 ${p.daily_demand}；覆盖 ${fixed(days,1)} 天 ≤ 提前期 ${p.lead_time_days} 天。`,[r],'核对需求与在途补货，确认加急或调拨。')}
   if(has(p,'reorder_point')&&p.on_hand<=p.reorder_point)f('reorder_point','到达补货点 · '+p.sku,'medium',`库存 ${p.on_hand} ≤ 用户补货点 ${p.reorder_point}。`,[r],'审核补货点并建立采购任务。');
   if(p.ordered_qty>0&&has(p,'fulfilled_qty')){const rate=p.fulfilled_qty/p.ordered_qty;if(rate<.95){gaps++;f('fulfillment_gap','履约率低于 95% · '+p.sku,'medium',`已履约 ${p.fulfilled_qty} / 订单 ${p.ordered_qty} = ${fixed(rate*100,1)}%。阈值为产品固定规则。`,[r],'检查缺货、部分发货与承诺交期。')}}
   if(p.expiry_date&&p.on_hand>0){const left=(dateMicros(p.expiry_date)/1000-clock)/86400000;if(left<=30)f('expiry','临期库存 · '+p.sku,left<0?'high':'medium',`到期日 ${p.expiry_date}；当前仍有库存 ${p.on_hand}。`,[r],'核查批次，优先消耗或隔离过期库存。')}
  }m('平均库存覆盖',coverage.length?round(mean(coverage),1):'不适用','天');m('履约异常 SKU',gaps,'个');limitations.push('每个 SKU 只使用最新快照；日需求恒定，不包含需求波动、安全库存或在途供给。','履约 95% 与临期 30 天是明确固定规则，非预测模型。');
 }
 if(domain==='procurement'){
  const groups=new Map(),balances=new Map();let overdue=0;for(const r of rows){const p=r.payload,k=JSON.stringify([p.vendor,p.invoice_id,p.currency]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
  for(const group of groups.values()){if(group.length>1)f('duplicate_invoice','重复发票编号 · '+group[0].payload.invoice_id,'high','同一供应商、币种、发票编号存在多个不同导入记录。金额汇总只使用最新记录。',group,'核对原始发票与冲销/修订，避免重复付款。');const r=latestRows(group,'invoice_id')[0],p=r.payload,left=Math.max(0,p.amount-(p.paid_amount||0));balances.set(p.currency,(balances.get(p.currency)||0)+left);const due=dateMicros(p.due_date)/1000+(p.due_date.trim().length===10?86400000:0);
   if(left>.005&&due<=clock){overdue++;f('overdue_invoice','付款逾期 · '+p.invoice_id,'high',`到期 ${p.due_date}；未付 ${fixed(left,2)} ${p.currency}。日期字段按 UTC 当天结束为截止。`,[r],'核查审批、争议和付款计划；避免重复执行付款。')}
   if((p.paid_amount||0)>p.amount+.005)f('overpayment','付款金额超过发票 · '+p.invoice_id,'high',`付款 ${fixed(p.paid_amount,2)} > 发票 ${fixed(p.amount,2)} ${p.currency}。`,[r],'复核支付和贷项，确认是否重复或预付款。');
   for(const [field,label] of [['po_amount','采购订单'],['received_amount','收货']])if(has(p,field)&&Math.abs(p.amount-p[field])>.01)f('match_'+field,'三方金额不一致 · '+p.invoice_id,'medium',`发票 ${fixed(p.amount,2)}，${label} ${p[field].toFixed(2)} ${p.currency}。固定绝对容差 0.01。`,[r],'逐项匹配数量、价格、税费与部分收货，人工确认差异。');
  }m('唯一发票',groups.size,'张');m('逾期发票',overdue,'张');for(const [currency,v] of [...balances].sort())m('待付余额',round(v,2),currency);limitations.push('不同币种单独显示；不使用汇率转换。金额差异没有税费、运费或部分收货解释，不构成自动阻付决定。','本地时间比较仅提示；付款、合同与会计处理需要人工复核。');
 }
 if(domain==='service'){
  const active=latestRows(rows,'ticket_id');let breached=0,completed=0;
  for(const r of active){const p=r.payload,start=dateMicros(p.opened_at)/1000,end=p.resolved_at?dateMicros(p.resolved_at)/1000:clock;if(start>clock){f('future_ticket','未来开单时间 · '+p.ticket_id,'medium','opened_at 晚于当前 UTC；无法可靠核算已用时间。',[r],'检查时区与来源时间戳。');continue}const hours=Math.max(0,(end-start)/3600000);if(['resolved','closed'].includes(p.status))completed++;if(hours>p.sla_hours){breached++;f('sla_breach','SLA 超时 · '+p.ticket_id,'high',`已用 ${fixed(hours,1)} 小时 > 用户 SLA ${p.sla_hours} 小时。`+(p.resolved_at?'以解决时刻计算。':'未解决，以当前 UTC 计算。'),[r],'确认暂停时段、工作日历及客户承诺，分配负责人。')}else if(!p.resolved_at&&hours>=p.sla_hours*.8)f('sla_near','SLA 临近 · '+p.ticket_id,'medium',`已用 ${fixed(hours,1)} / ${p.sla_hours} 小时 ≥ 80%。`,[r],'优先处理并记录下一次跟进。')}
  m('有效工单',active.length,'个');m('SLA 超时',breached,'个');m('已解决',completed,'个');limitations.push('连续自然小时核算，不自动推断暂停、节假日或营业时段。未完成工单不当作已完成服务时长。','每个 ticket_id 采用最新快照；SLA 来自用户字段，不从公开数据推断。');
 }
 if(domain==='energy'){
  const groups=new Map();for(const r of rows){const p=r.payload,k=JSON.stringify([p.meter_id,p.period_start,p.period_end]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}const selected=[];
  for(const group of groups.values()){if(group.length>1)f('duplicate_energy','重复计量区间 · '+group[0].payload.meter_id,'medium','同一表计与起止区间有多条不同记录；总量只使用最新记录。',group,'核查修订版本，避免重复统计。');selected.push(latestRows(group,'meter_id')[0])}
  const total=selected.reduce((s,r)=>s+r.payload.kwh,0),waste=selected.reduce((s,r)=>s+(r.payload.waste_kg||0),0),recycled=selected.reduce((s,r)=>s+(r.payload.recycled_kg||0),0);m('已导入电量',round(total,2),'kWh');m('废弃物',round(waste,2),'kg');m('回收率',waste?round(recycled/waste*100,1):'不适用','%');
  for(const r of selected){const p=r.payload;if(p.baseline_kwh&&p.kwh>p.baseline_kwh*1.2)f('energy_baseline','能耗高于基准 20% · '+p.meter_id,'medium',`用电 ${p.kwh} / 用户基准 ${p.baseline_kwh} kWh，偏高 ${fixed((p.kwh/p.baseline_kwh-1)*100,1)}%。`,[r],'核对基准可比性、设备运行和异常负载。');if(p.waste_kg>0&&has(p,'recycled_kg')&&p.recycled_kg/p.waste_kg<.5)f('recycling','回收率低于 50% · '+p.meter_id,'low',`回收 ${p.recycled_kg} / 废弃物 ${p.waste_kg} kg。固定阈值 50%。`,[r],'核查分类、污染率和回收供应商，确认改进动作。')}
  const meters=new Map();for(const r of selected){const k=r.payload.meter_id;if(!meters.has(k))meters.set(k,[]);meters.get(k).push(r)}for(const [meter,rs] of meters){rs.sort((a,b)=>dateMicros(a.payload.period_start)-dateMicros(b.payload.period_start));let maxEnd=-Infinity,overlap=false;for(const r of rs){if(maxEnd>dateMicros(r.payload.period_start))overlap=true;maxEnd=Math.max(maxEnd,dateMicros(r.payload.period_end))}if(overlap)f('overlapping_energy','计量时间区间重叠 · '+meter,'medium','同一表计多个区间重叠，电量合计可能重复覆盖。',rs,'调整计量区间后再比较总能耗。')}
  limitations.push('未做天气、产量或使用时长归一化；仅比较用户提供的同条基准。','电量是导入区间合计，不是实时仪表；不在缺少排放因子时推断碳排或节省。');
 }return{metrics,findings,limitations};
}
