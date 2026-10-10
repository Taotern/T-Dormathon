import {ValidationError,stableJSON,sha256,uid,nowISO,finiteNumber,safeInt,textField,dateMicros,isoMicros} from './common.js';
import {PROTOTYPE_PILOT,FR12_WORLD_MODEL} from './generated.js';
import {WorkspaceService} from './workspace.js';
import {comparePolicies,FR12_ACTIONS,detectStateConflicts} from './sandbox.js';

const prototypeFields=Object.keys(PROTOTYPE_PILOT.inputs);
const MAX_STATE_RECORDS=40;
function prototypeOnly(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw new ValidationError('Prototype request fields are not supported');}
function clock(value,name){const s=textField(value,name,80,true);if(!/(Z|[+-]\d\d:?\d\d)$/.test(s)||!s.includes('T'))throw new ValidationError(`${name} must include an explicit timezone`);return isoMicros(dateMicros(s));}
function amount(value,name,max=1e9){const n=finiteNumber(value,name);if(n>max)throw new ValidationError(`${name} exceeds the supported scenario range`);return n;}
async function nextPrototypeReviewTime(store,caseId){const latest=await store.first('SELECT max(created_at) latest FROM workspace_reviews WHERE case_id=?',[caseId]),now=nowISO();return latest?.latest&&dateMicros(now)<=dateMicros(latest.latest)?isoMicros(dateMicros(latest.latest)+1):now;}
function checkedAssumptions(raw,records){
 if(raw===undefined)return{data_basis:'no_user_assumptions',disturbances:{}};
 const keys=['cash_available','payment_ledger_complete','service_remaining_hours','service_authorization_confirmed','service_available','service_rest_ok','energy_persistence_confirmed','waste_inventory','actions','disturbances'];
 prototypeOnly(raw,keys);
 const out={data_basis:'user_supplied_unverified_scenario_assumptions',disturbances:{}};
 if(Object.hasOwn(raw,'cash_available'))out.cash_available=amount(raw.cash_available,'cash_available');
 if(Object.hasOwn(raw,'payment_ledger_complete')){if(typeof raw.payment_ledger_complete!=='boolean')throw new ValidationError('payment_ledger_complete must be boolean');out.payment_ledger_complete=raw.payment_ledger_complete;}
 if(Object.hasOwn(raw,'service_remaining_hours'))out.service_remaining_hours=amount(raw.service_remaining_hours,'service_remaining_hours',720);
 for(const key of ['service_authorization_confirmed','service_available','service_rest_ok'])if(Object.hasOwn(raw,key)){if(typeof raw[key]!=='boolean')throw new ValidationError(key+' must be boolean');out[key]=raw[key];}
 if(Object.hasOwn(raw,'energy_persistence_confirmed')){if(typeof raw.energy_persistence_confirmed!=='boolean')throw new ValidationError('energy_persistence_confirmed must be boolean');out.energy_persistence_confirmed=raw.energy_persistence_confirmed;}
 if(Object.hasOwn(raw,'waste_inventory')){
  const inventory=raw.waste_inventory;
  if(!inventory||typeof inventory!=='object'||Array.isArray(inventory)||Object.keys(inventory).some(id=>!records.some(row=>row.id===id&&row.domain==='energy')))throw new ValidationError('waste_inventory must reference selected energy records');
  out.waste_inventory={};
  for(const[id,value]of Object.entries(inventory)){
   prototypeOnly(value,['units','daily','expiry']);
   out.waste_inventory[id]={units:amount(value.units,'waste_inventory.units'),daily:amount(value.daily,'waste_inventory.daily'),expiry:amount(value.expiry,'waste_inventory.expiry',30)};
  }
 }
 if(Object.hasOwn(raw,'actions')){
  const actions=raw.actions;prototypeOnly(actions,['expedite_delivery','increase_buffer','qualified_reassignment','waste_reduction','energy_reduction']);out.actions={};
  const rowIds=(ids,domain,name)=>{
   if(ids===undefined)return undefined;
   if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!records.some(row=>row.id===id&&row.domain===domain)))throw new ValidationError(name+' must contain unique selected '+domain+' record IDs');
   return [...ids];
  };
  for(const[name,domain]of [['expedite_delivery','supply'],['increase_buffer','supply']]){
   if(actions[name]===undefined)continue;
   const value=actions[name],allowed=name==='expedite_delivery'?['days_saved','cost','currency','record_ids']:['units','cost','currency','record_ids'];
   prototypeOnly(value,allowed);
   if(value.currency!=='MYR')throw new ValidationError(name+' costs must use MYR');
   const effect={cost:amount(value.cost,name+'.cost'),currency:'MYR'},record_ids=rowIds(value.record_ids,domain,name+'.record_ids');
   if(record_ids)effect.record_ids=record_ids;
   if(name==='expedite_delivery')effect.days_saved=amount(value.days_saved,name+'.days_saved',30);
   else effect.units=amount(value.units,name+'.units');
   out.actions[name]=effect;
  }
  if(actions.qualified_reassignment!==undefined){
   const value=actions.qualified_reassignment;prototypeOnly(value,['hours_saved','cost','currency','resource_id','task_ids']);
   if(value.currency!=='MYR')throw new ValidationError('qualified_reassignment costs must use MYR');
   const reassignment={
    hours_saved:amount(value.hours_saved,'reassignment_hours_saved',720),cost:amount(value.cost,'reassignment_cost'),
    currency:'MYR',resource_id:value.resource_id===undefined?null:textField(value.resource_id,'resource_id',200,true)
   };
   const task_ids=rowIds(value.task_ids,'service','qualified_reassignment.task_ids');
   if(task_ids)reassignment.task_ids=task_ids;
   out.actions.qualified_reassignment=reassignment;
  }
  if(actions.waste_reduction!==undefined){
   prototypeOnly(actions.waste_reduction,['fraction']);
   out.actions.waste_reduction={fraction:amount(actions.waste_reduction.fraction,'waste_reduction.fraction',1)};
  }
  if(actions.energy_reduction!==undefined){
   const value=actions.energy_reduction;prototypeOnly(value,['fraction','cost','currency']);
   if(value.currency!=='MYR')throw new ValidationError('energy_reduction costs must use MYR');
   out.actions.energy_reduction={fraction:amount(value.fraction,'energy_reduction.fraction',1),cost:amount(value.cost,'energy_reduction.cost'),currency:'MYR'};
  }
 }
 if(Object.hasOwn(raw,'disturbances')){
  const disturbances=raw.disturbances;
  if(!disturbances||typeof disturbances!=='object'||Array.isArray(disturbances)||Object.keys(disturbances).some(key=>!['demand_multiplier','delay_add_days','processing_multiplier','waste_use_multiplier','energy_use_multiplier'].includes(key)))throw new ValidationError('Unsupported disturbance variable');
  const bounds={demand_multiplier:[0.01,3],delay_add_days:[0,30],processing_multiplier:[0.01,4],waste_use_multiplier:[0.01,4],energy_use_multiplier:[0.01,4]};
  for(const[key,list]of Object.entries(disturbances)){
   if(!Array.isArray(list)||!list.length||list.length>5)throw new ValidationError(key+' must contain 1-5 weighted values');
   let total=0;
   out.disturbances[key]=list.map(item=>{
    prototypeOnly(item,['value','weight']);
    const value=finiteNumber(item.value,key+'.value'),weight=finiteNumber(item.weight,key+'.weight');
    if(value<bounds[key][0]||value>bounds[key][1]||weight<=0)throw new ValidationError(key+' scenario value/weight is out of range');
    total+=weight;return{value,weight};
   });
   if(total<=0)throw new ValidationError(key+' weights must sum to a positive value');
   out.disturbances[key]=out.disturbances[key].map(item=>({value:item.value,weight:item.weight/total}));
  }
 }
 return out;
}
function checkedConstraints(raw,records){
 const input=raw??{},allowed=['cash_budget','route_passability','storage_capacity_units','qualified_role_available','no_resource_double_allocation','resource_capacities'];
 prototypeOnly(input,allowed);
 let cash_budget=null,storage_capacity_units=null;
 if(input.cash_budget!==undefined&&input.cash_budget!==null){
  prototypeOnly(input.cash_budget,['value','unit','basis']);
  if(input.cash_budget.unit!=='MYR')throw new ValidationError('cash_budget must use MYR');
  cash_budget={value:amount(input.cash_budget.value,'cash_budget.value'),unit:'MYR',basis:textField(input.cash_budget.basis||'user_supplied_constraint','cash_budget.basis',200,true)};
 }
 if(input.storage_capacity_units!==undefined&&input.storage_capacity_units!==null)storage_capacity_units=amount(input.storage_capacity_units,'storage_capacity_units');
 for(const key of ['route_passability','qualified_role_available','no_resource_double_allocation'])if(input[key]!==undefined&&input[key]!==null&&typeof input[key]!=='boolean')throw new ValidationError(key+' must be true, false, or null');
 const resources=input.resource_capacities??[];
 if(!Array.isArray(resources)||resources.length>20)throw new ValidationError('resource_capacities must contain at most 20 entries');
 const ids=new Set(),resource_capacities=resources.map(item=>{
  prototypeOnly(item,['resource_id','capacity','allocated_task_ids']);
  const resource_id=textField(item.resource_id,'resource_id',200,true),capacity=safeInt(item.capacity,0,1000,'resource capacity'),allocated_task_ids=item.allocated_task_ids??[];
  if(ids.has(resource_id))throw new ValidationError('Each resource_id must appear once');
  ids.add(resource_id);
  if(!Array.isArray(allocated_task_ids)||new Set(allocated_task_ids).size!==allocated_task_ids.length||allocated_task_ids.some(id=>typeof id!=='string'||!id))throw new ValidationError('allocated_task_ids must be unique identifiers');
  return{resource_id,capacity,allocated_task_ids:[...allocated_task_ids]};
 });
 return{data_basis:'user_supplied_hard_constraints',cash_budget,route_passability:input.route_passability??null,storage_capacity_units,qualified_role_available:input.qualified_role_available??null,no_resource_double_allocation:input.no_resource_double_allocation??null,resource_capacities};
}
export function prototypeObservations(input){
 prototypeOnly(input,prototypeFields);const values={};for(const f of prototypeFields){if(f==='payment_ledger_complete'){if(typeof input[f]!=='boolean')throw new ValidationError('Payment-ledger completeness must be explicit');values[f]=input[f];continue;}const v=input[f];try{values[f]=v===null||v===''||v===undefined?null:finiteNumber(v,f);}catch{throw new ValidationError(f+' must be a finite non-negative number');}if(values[f]!==null&&values[f]>1e9)throw new ValidationError('Operating input exceeds bounded demo scope');}
 const findings=[],metrics=[],missing=[];const add=(domain,kind,title,detail,refs,option)=>findings.push({domain,kind,title,detail,record_refs:refs,candidate_action:option,causality:'not_established'}),m=(name,value,unit)=>metrics.push({name,value,unit});
 if([values.stock_units,values.daily_use_units,values.days_until_delivery,values.delay_assumption_days].some(v=>v===null)||values.daily_use_units===0){missing.push('Stock, positive daily use, delivery time and delay assumption');}else{const coverage=values.stock_units/values.daily_use_units,gap=Math.max(0,values.days_until_delivery-coverage),assumed=Math.max(0,values.days_until_delivery+values.delay_assumption_days-coverage);m('Stock coverage',coverage,'day');m('Gap without additional delay',gap,'day');m('Gap under entered delay assumption',assumed,'day');if(assumed>0)add('supply','conditional_projection','Potential coverage gap before delivery',`If daily use stays constant and the entered delay applies, the gap is ${assumed} days. Actual stockout has not been observed.`,['fixture:order:01'],'Verify ETA, buffer or expedited-delivery feasibility');else add('supply','rule_observation','Current inputs cover the delivery window','Only valid for entered stock/use; not proof of future demand or transport reliability.',['fixture:order:01'],'Keep checking demand and delivery');}
 if(!values.payment_ledger_complete||values.invoice_amount===null||values.paid_amount===null){missing.push('Complete payment coverage and invoice/paid amounts');add('procurement','insufficient_data','Payment status cannot yet be determined','Missing payment records do not prove nonpayment when coverage is incomplete.',['fixture:invoice:01'],'Verify receipt, approval and complete payment records');}else{if(values.paid_amount>values.invoice_amount)throw new ValidationError('Demo paid amount cannot exceed invoice amount');const outstanding=values.invoice_amount-values.paid_amount;m('Unsettled amount for this case',outstanding,'MYR');if(values.cash_available!==null)m('Cash gap for this invoice only',Math.max(0,outstanding-values.cash_available),'MYR');if(outstanding>0)add('procurement','fixture_observation','This case has an unsettled amount',`The synthetic ledger explicitly reports ${values.paid_amount} MYR paid and ${outstanding} MYR unsettled. Receipt/approval blockage is a fixture claim, not a real company status.`,['fixture:invoice:01','fixture:order:01'],'Verify documents, approval and cash constraints');}
 if(values.service_elapsed_hours===null||values.service_target_hours===null||values.service_target_hours===0)missing.push('Elapsed processing time and positive internal target');else{const over=Math.max(0,values.service_elapsed_hours-values.service_target_hours);m('Hours over internal target',over,'hour');if(over>0)add('service','fixture_observation','Open task exceeds its internal processing target',`Elapsed ${values.service_elapsed_hours} hours versus a ${values.service_target_hours}-hour internal target. Completion remains unknown; this is not a formal SLA breach.`,['fixture:task:01','fixture:invoice:01'],'Check the queue, qualified reassignment or escalation');}
 if([values.food_units,values.food_daily_use_units,values.days_until_expiry].some(v=>v===null))missing.push('Food quantity, use and expiry window');else{const surplus=Math.max(0,values.food_units-values.food_daily_use_units*values.days_until_expiry);m('Expected expiry surplus under constant-use assumption',surplus,'units');if(surplus>0)add('waste','conditional_projection','Food batch may remain at expiry',`If use stays constant, ${surplus} units may remain at expiry. This is not observed disposal or monetary loss.`,['fixture:batch:01'],'Compare first-expiry-first-out or batch adjustment');}
 if(metrics.some(m=>m.value!==null&&!Number.isFinite(m.value)))throw new ValidationError('Inputs produce non-finite arithmetic');
 return{schema_version:'dormathon.prototype.observations.v0.2',data_basis:'synthetic_fixture_with_user_edits',status:'partial',rule_status:missing.length?'partial':'ok',inputs:values,metrics,findings,missing_fields:missing,comparison:{status:'not_run',owner:'Felix FR12'},attribution_status:'not_established',model_quality_status:'synthetic_only'};
}
export function prototypePorts(ref={}){
 const knowledge_as_of=ref.knowledge_as_of||PROTOTYPE_PILOT.knowledge_as_of,world_time=ref.world_time||PROTOTYPE_PILOT.world_time,data_revision=ref.data_revision||ref.state_hash||PROTOTYPE_PILOT.fixture_id;
 return['FR07','FR08','FR12'].map(fr=>({
  schema_version:'dormathon.module-envelope.v0.2',request_id:uid('port'),input_refs:ref,
  knowledge_as_of,world_time,knowledge_mode:'frozen_operating_state',data_revision,
  status:fr==='FR12'&&FR12_WORLD_MODEL?.schema_version==='dormathon.fr12.world-model.v1'?'ok':'unsupported',
  warnings:fr==='FR12'?['Synthetic offline training only; operational calibration has not been established.']:['Assigned service is not connected.'],
  owner:fr==='FR12'?'Felix':'teammate',module:fr
 }));
}

export class PrototypeService{
 constructor(store){this.store=store;this.ws=new WorkspaceService(store);}
 async evidenceAtAsOf(caseId,cutoff){
  const cutoffMicros=dateMicros(cutoff),evidence=await this.store.rows('SELECT * FROM workspace_evidence WHERE case_id=? ORDER BY added_at,id',[caseId]);
  const events=await this.store.rows("SELECT kind,payload,created_at,id FROM workspace_reviews WHERE case_id=? AND kind IN ('evidence_attached','evidence_relation_review') ORDER BY created_at,id",[caseId]);
  const parsed=events.map(row=>({...row,payload:JSON.parse(row.payload)})),out=[];
  for(const row of evidence){
   if(dateMicros(row.added_at)>cutoffMicros)continue;
   const snapshot=JSON.parse(row.snapshot),history=parsed.filter(event=>event.payload.evidence_id===row.id&&dateMicros(event.created_at)<=cutoffMicros);
   const attached=history.find(event=>event.kind==='evidence_attached');
   let association_status=attached?.payload.association_status??row.association_status,association_note=attached?.payload.association_note??row.association_note;
   for(const event of history)if(event.kind==='evidence_relation_review'){
    association_status=event.payload.association_status;association_note=event.payload.note??association_note;
   }
   if(!history.length&&dateMicros(row.updated_at)<=cutoffMicros){association_status=row.association_status;association_note=row.association_note}
   out.push({
    evidence_id:row.id,version_id:row.version_id,content_hash:snapshot.content_hash,
    association_status,association_note,attached_at:row.added_at,
    observed_at:snapshot.observed_at??null,site_imported_at:snapshot.site_imported_at??null,
    title:snapshot.metadata?.title??null,publisher:snapshot.metadata?.publisher??snapshot.metadata?.source_name??null,
    snapshot_schema_version:snapshot.schema_version??null
   });
  }
  return out;
 }
 async read(id){return{fixture:PROTOTYPE_PILOT,world_model:{schema_version:FR12_WORLD_MODEL?.schema_version,model_version:FR12_WORLD_MODEL?.model_version,training:FR12_WORLD_MODEL?.training},preview:prototypeObservations(PROTOTYPE_PILOT.inputs),ports:prototypePorts(),case:id?await this.ws.detail(id):null};}
 async start(body){prototypeOnly(body,['fixture_id']);if(body.fixture_id!==PROTOTYPE_PILOT.fixture_id)throw new ValidationError('Unknown demo case');const id='proto_case_linked_ops_v02',project='proto_project_linked_ops_v02',review='proto_snapshot_linked_ops_v02',stamp=nowISO(),snapshot=stableJSON(PROTOTYPE_PILOT);const prior=await this.store.first('SELECT payload FROM workspace_reviews WHERE id=?',[review]);if(prior&&prior.payload!==snapshot)throw new ValidationError('Demo snapshot identity conflict');await this.store.batch([{sql:'INSERT OR IGNORE INTO workspace_projects(id,title,objective,domain,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',values:[project,'Hackathon synthetic operating case','Review four business problems and shared dependencies','supply','active',stamp,stamp]},{sql:'INSERT OR IGNORE INTO workspace_cases(id,project_id,object_id,title,question,domain,status,priority,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',values:[id,project,null,PROTOTYPE_PILOT.title,'Which limited conclusions are supported? What needs more evidence?','supply','investigating','high',stamp,stamp]},{sql:'INSERT OR IGNORE INTO workspace_reviews(id,case_id,kind,payload,created_at) VALUES(?,?,?,?,?)',values:[review,id,'prototype_operating_snapshot',snapshot,stamp]}]);return{case_id:id,...await this.read(id)};}
 async mapEvidence(body){
  prototypeOnly(body,['case_id','version_id','target_record_id','variable','value','unit','valid_from','valid_to','note']);const d=await this.ws.detail(textField(body.case_id,'case_id',100,true)),version_id=textField(body.version_id,'version_id',100,true),target_record_id=textField(body.target_record_id,'target_record_id',100,true),variable=textField(body.variable,'variable',80,true),unit=textField(body.unit,'unit',30,true);
  if(variable!=='delay_assumption_days'||unit!=='day')throw new ValidationError('Only reviewed delay_assumption_days mappings in day are supported');const evidence=d.evidence.find(e=>e.version_id===version_id);if(!evidence||evidence.association_status!=='confirmed_by_user')throw new ValidationError('The exact evidence version must be attached and confirmed by a user');
  const record=await this.store.first('SELECT id,domain,occurred_at,fingerprint FROM records WHERE id=?',[target_record_id]);if(!record||record.domain!=='supply')throw new ValidationError('Delay assumptions must target an existing selected supply record');const value=amount(body.value,'value',30),valid_from=clock(body.valid_from,'valid_from'),valid_to=clock(body.valid_to,'valid_to');if(dateMicros(valid_from)>dateMicros(valid_to))throw new ValidationError('valid_to must be at or after valid_from');const note=textField(body.note,'note',1000,true),existing=await this.store.rows("SELECT payload FROM workspace_reviews WHERE case_id=? AND kind='prototype_evidence_mapping'",[d.case.id]);for(const row of existing){const old=JSON.parse(row.payload);if(old.target_record_id===target_record_id&&old.variable===variable&&dateMicros(valid_from)<=dateMicros(old.valid_to)&&dateMicros(old.valid_from)<=dateMicros(valid_to))throw new ValidationError('An overlapping mapping already exists for this record variable');}
  const mapping={schema_version:'dormathon.fr12.evidence-mapping.v1',data_basis:'user_reviewed_typed_evidence_mapping',case_id:d.case.id,evidence:{version_id,content_hash:evidence.snapshot.content_hash,title:evidence.snapshot.metadata?.title||null,association_status:'confirmed_by_user'},target_record_id:record.id,target_record:{id:record.id,domain:record.domain,occurred_at:record.occurred_at,fingerprint:record.fingerprint},variable,value,unit,valid_from,valid_to,note,causality:'not_established',created_by:'explicit_same_origin_user_submission'};const id=uid('mapping'),created_at=await nextPrototypeReviewTime(this.store,d.case.id);await this.store.write('INSERT INTO workspace_reviews(id,case_id,kind,payload,created_at) VALUES(?,?,?,?,?)',[id,d.case.id,'prototype_evidence_mapping',stableJSON(mapping),created_at]);return{mapping_id:id,...mapping,created_at};
 }
 async reviewEvidence(body){prototypeOnly(body,['id','association_status','association_note']);return this.ws.updateEvidence(body);}
 async freezeState(body){
  prototypeOnly(body,['case_id','record_refs','knowledge_as_of','world_time','assumptions']);
  const caseId=textField(body.case_id,'case_id',100,true),d=await this.ws.detail(caseId);
  if(!Array.isArray(body.record_refs)||body.record_refs.length<1||body.record_refs.length>MAX_STATE_RECORDS||body.record_refs.some(id=>typeof id!=='string')||new Set(body.record_refs).size!==body.record_refs.length)throw new ValidationError('record_refs must contain 1 to '+MAX_STATE_RECORDS+' unique saved D1 record IDs');
  const knowledge_as_of=clock(body.knowledge_as_of,'knowledge_as_of'),world_time=clock(body.world_time,'world_time'),k=dateMicros(knowledge_as_of),w=dateMicros(world_time);
  if(k>w)throw new ValidationError('knowledge_as_of cannot be later than world_time');
  const evidenceContext=await this.evidenceAtAsOf(caseId,knowledge_as_of);
  d.evidence=evidenceContext.map(item=>({id:item.evidence_id,version_id:item.version_id,association_status:item.association_status,association_note:item.association_note,added_at:item.attached_at,snapshot:{content_hash:item.content_hash,metadata:{title:item.title,publisher:item.publisher},observed_at:item.observed_at,site_imported_at:item.site_imported_at}}));
  const placeholders=body.record_refs.map(()=>'?').join(','),sql='SELECT r.id,r.domain,r.occurred_at,r.source_id,r.payload,r.fingerprint,s.title source_title,s.publisher source_publisher,s.kind source_kind,s.retrieved_at source_retrieved_at,s.sha256 source_sha256 FROM records r JOIN sources s ON s.id=r.source_id WHERE r.id IN ('+placeholders+')';
  const records=await this.store.rows(sql,body.record_refs);
  if(records.length!==body.record_refs.length)throw new ValidationError('One or more selected D1 record IDs are missing');
  const byId=new Map(records.map(row=>[row.id,row])),frozen=[];
  for(const id of body.record_refs){
   const row=byId.get(id);
   if(dateMicros(row.occurred_at)>w)throw new ValidationError('Record '+id+' occurs after world_time');
   if(!row.source_retrieved_at||dateMicros(row.source_retrieved_at)>k)throw new ValidationError('Record '+id+' source was not known by knowledge_as_of');
   frozen.push({id:row.id,domain:row.domain,occurred_at:row.occurred_at,source_id:row.source_id,fingerprint:row.fingerprint,payload:JSON.parse(row.payload),source:{title:row.source_title,publisher:row.source_publisher,kind:row.source_kind,retrieved_at:row.source_retrieved_at,sha256:row.source_sha256||null}});
  }
  const evidence_refs=d.evidence.map(item=>({evidence_id:item.id,version_id:item.version_id,content_hash:item.snapshot.content_hash,title:item.snapshot.metadata?.title||null,publisher:item.snapshot.metadata?.publisher||null,association_status:item.association_status,association_note:item.association_note,attached_at:item.added_at,observed_at:item.snapshot.observed_at??null,site_imported_at:item.snapshot.site_imported_at??null}));
  const confirmed=new Map(evidence_refs.filter(item=>item.association_status==='confirmed_by_user').map(item=>[item.version_id,item]));
  const mappingRows=await this.store.rows("SELECT id,payload,created_at FROM workspace_reviews WHERE case_id=? AND kind='prototype_evidence_mapping' ORDER BY created_at,id",[caseId]),evidence_mappings=[];
  for(const row of mappingRows){
   if(dateMicros(row.created_at)>k)continue;
   const mapping=JSON.parse(row.payload),evidence=confirmed.get(mapping.evidence?.version_id);
   if(!evidence||evidence.content_hash!==mapping.evidence.content_hash||!body.record_refs.includes(mapping.target_record_id)||dateMicros(mapping.valid_from)>w||dateMicros(mapping.valid_to)<w)continue;
   evidence_mappings.push({review_id:row.id,...mapping});
  }
  const mapped=new Set();
  for(const mapping of evidence_mappings){const key=mapping.target_record_id+'|'+mapping.variable;if(mapped.has(key))throw new ValidationError('Multiple active evidence mappings conflict for the same record variable');mapped.add(key);}
  const assumptions=checkedAssumptions(body.assumptions,frozen),conflicts=detectStateConflicts(frozen);
  const state={schema_version:'dormathon.fr12.state.v1',data_basis:'database_operational_records',case_id:caseId,clocks:{knowledge_as_of,world_time,knowledge_mode:'system_known'},records:frozen,evidence_refs,evidence_mappings,assumptions,conflicts,limitations:['Only explicitly selected D1 records and evidence versions attached by knowledge_as_of are frozen.','Unmapped evidence is retained as context and does not alter simulator parameters.','A typed mapping is a scenario assumption and does not establish causal impact.','Conflicting selected records are disclosed and excluded from affected projections.','Missing hard constraints remain indeterminate.']};
  const state_hash=await sha256(stableJSON(state));state.state_hash=state_hash;
  const payload={review_schema_version:'dormathon.fr12.frozen-state-review.v1',frozen_state:state,state_hash};
  if(new TextEncoder().encode(stableJSON(payload)).length>1_800_000)throw new ValidationError('Frozen simulation state exceeds the safe review size');
  const state_ref=uid('fr12state'),created_at=nowISO();
  await this.store.write('INSERT INTO workspace_reviews(id,case_id,kind,payload,created_at) VALUES(?,?,?,?,?)',[state_ref,caseId,'prototype_simulation_state',stableJSON(payload),created_at]);
  return{state_ref,state_hash,case_id:caseId,data_basis:state.data_basis,clocks:state.clocks,record_refs:frozen.map(row=>({id:row.id,domain:row.domain,occurred_at:row.occurred_at,source_id:row.source_id,source_sha256:row.source.sha256,fingerprint:row.fingerprint})),evidence_refs,evidence_mappings,assumptions,conflicts,record_count:frozen.length,created_at};
 }
 async analyze(body,save=false){
  prototypeOnly(body,['case_id','inputs','state_ref','actions','objectives','constraints','horizon','scenarios','seed']);
  const case_id=textField(body.case_id,'case_id',100,true);
  if(!body.state_ref&&case_id!=='proto_case_linked_ops_v02')throw new ValidationError('Create a frozen database state or use the explicit synthetic demo case');
  const d=await this.ws.detail(case_id);let state,state_ref=null,state_hash=null,observations=null;
  if(body.state_ref){
   if(body.inputs!==undefined)throw new ValidationError('Use either a frozen database state or synthetic fixture inputs');
   const row=await this.ws.required('workspace_reviews',textField(body.state_ref,'state_ref',100,true));
   if(row.case_id!==case_id||row.kind!=='prototype_simulation_state')throw new ValidationError('state_ref must identify a frozen FR12 state for this case');
   const frozen=JSON.parse(row.payload);state=frozen.frozen_state;state_ref=row.id;state_hash=frozen.state_hash;
   if(!state||state.state_hash!==state_hash)throw new ValidationError('Frozen state integrity metadata is invalid');
   const{state_hash:checkHash,...checkState}=state;
   if(await sha256(stableJSON(checkState))!==state_hash)throw new ValidationError('Frozen state integrity check failed');
  }else{
   if(case_id!=='proto_case_linked_ops_v02'||!body.inputs)throw new ValidationError('Create a frozen database state or use the explicit synthetic demo case');
   observations=prototypeObservations(body.inputs);
   state={schema_version:'dormathon.fr12.state.v1',data_basis:'synthetic_fixture_with_user_edits',case_id,inputs:observations.inputs,order_quantity:100,invoice_approved:false,resource_authorization:true,resource_available:true,resource_rest_ok:true,service_remaining_hours:12,assumptions:FR12_WORLD_MODEL.synthetic_assumptions};
   state_hash=await sha256(stableJSON(state));
  }
  const constraints=checkedConstraints(body.constraints,state.records||[]),actions=body.actions??FR12_ACTIONS.map(item=>item.id);
  const horizon=safeInt(body.horizon??14,1,30,'horizon'),scenarios=safeInt(body.scenarios??100,1,100,'scenarios'),seed=safeInt(body.seed??1,0,0xffffffff,'seed');
  const model_hash=await sha256(stableJSON(FR12_WORLD_MODEL));
  const comparison=await comparePolicies(state,{actions,objectives:body.objectives,constraints,horizon,scenarios,seed,model:FR12_WORLD_MODEL,state_ref,state_hash});
  const input_hash=await sha256(stableJSON({state_hash,actions,objectives:body.objectives??'default',constraints,horizon,scenarios,seed,model_version:FR12_WORLD_MODEL.model_version,policy_version:FR12_WORLD_MODEL.policy?.version||FR12_WORLD_MODEL.model_version+':pareto-q',model_hash}));
  const evidence_refs=state.evidence_refs||d.evidence.map(item=>({evidence_id:item.id,version_id:item.version_id,content_hash:item.snapshot.content_hash,association_status:item.association_status}));
  const record_refs=state.records?.map(row=>({id:row.id,domain:row.domain,occurred_at:row.occurred_at,source_id:row.source_id,source_sha256:row.source?.sha256,fingerprint:row.fingerprint}))||[];
  const clocks=state.clocks||{knowledge_as_of:PROTOTYPE_PILOT.knowledge_as_of,world_time:PROTOTYPE_PILOT.world_time,knowledge_mode:'frozen_operating_state'};
  const out={
   schema_version:'dormathon.fr12.analysis.v1',case_id,state_ref,state_hash,input_hash,data_basis:state.data_basis,clocks,
   record_refs,evidence_refs,evidence:state.data_basis.startsWith('synthetic_')?d.evidence:evidence_refs,
   evidence_mappings:state.evidence_mappings||[],assumptions:state.assumptions,constraints,objectives:comparison.objectives,
   observations,metrics:observations?.metrics||[],findings:observations?.findings||[],missing_fields:observations?.missing_fields||[],comparison,
   model:{version:FR12_WORLD_MODEL.model_version,policy_version:FR12_WORLD_MODEL.policy?.version||FR12_WORLD_MODEL.model_version+':pareto-q',simulator_version:FR12_WORLD_MODEL.simulator_version,artifact_schema:FR12_WORLD_MODEL.schema_version,artifact_hash:model_hash,training_basis:FR12_WORLD_MODEL.training?.data_basis,holdout_evaluation:FR12_WORLD_MODEL.training?.transition_holdout_evaluation||null,operational_calibration:false},
   ports:prototypePorts({case_id,state_ref,state_hash,input_hash,data_revision:state_hash,knowledge_as_of:clocks.knowledge_as_of,world_time:clocks.world_time})
  };
  if(save){
   if(new TextEncoder().encode(stableJSON(out)).length>1_800_000)throw new ValidationError('Simulation result exceeds the safe saved-review size');
   const id=uid('analysis');await this.store.write('INSERT INTO workspace_reviews(id,case_id,kind,payload,created_at) VALUES(?,?,?,?,?)',[id,case_id,'prototype_analysis',stableJSON(out),nowISO()]);out.analysis_id=id;
  }
  return out;
 }
 async decide(body){prototypeOnly(body,['case_id','analysis_id','title','note']);const analysis=await this.ws.required('workspace_reviews',body.analysis_id);if(analysis.case_id!==body.case_id||analysis.kind!=='prototype_analysis')throw new ValidationError('A decision must cite a saved analysis from the same case');const payload=JSON.parse(analysis.payload),made=await this.ws.createAction({case_id:body.case_id,title:textField(body.title,'title',200,true),notes:textField(body.note,'note',2000),status:'open'},{analysis_id:analysis.id,input_hash:payload.input_hash,state_ref:payload.state_ref,state_hash:payload.state_hash,record_refs:payload.record_refs,comparison_status:payload.comparison.status,observations:payload,frozen_evidence:payload.evidence_refs});return made;}
 async feedback(body){prototypeOnly(body,['case_id','action_id','feedback','note']);const action=await this.ws.required('workspace_actions',body.action_id);if(action.case_id!==body.case_id||!['useful','missing_context','incorrect_link','constraint_changed'].includes(body.feedback))throw new ValidationError('Feedback must cite a same-case decision and an allowed category');const record={feedback_id:uid('feedback'),action_id:action.id,feedback:body.feedback,note:textField(body.note,'note',2000),source:'user_reported_feedback',evaluation_status:'pending',trained:false,improvement_claim:false};await this.store.write('INSERT INTO workspace_reviews(id,case_id,kind,payload,created_at) VALUES(?,?,?,?,?)',[record.feedback_id,body.case_id,'prototype_feedback',stableJSON(record),nowISO()]);return record;}
}
