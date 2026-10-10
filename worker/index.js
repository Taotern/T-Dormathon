import {sovernAdvisorAnswer,sovernAdvisorConfig} from './sovern-advisor.js';
import {MrdiyDemoService} from './mrdiy-service.js';
import {JourneyService,replayCatalog} from './journey.js';
import {BusinessCaseService,retainedSourceHistory} from './business-cases.js';
import {informationTypeStatus} from './information-types.js';
import {importReviewedChunk,reviewedIntakeStatus} from './source-intake.js';
import {importOutcomeChunk,outcomeStatus,outcomeEvents,outcomeEvidence,outcomeContext} from './outcomes.js';
import {retrievalStatus,retrievalDocuments,retrievalIndex} from './retrieval.js';
import {PUBLIC_BUNDLE,ASSETS,SITE_ORIGIN,GLOBAL_CATALOG} from './generated.js';
import {RiskStore} from './store.js';
import {WorkspaceService} from './workspace.js';
import {PrototypeService} from './prototype.js';
import {importRefreshSnapshot} from './source-refresh.js';
import {importLocalSnapshot} from './local-snapshot.js';
import {DOMAINS,ValidationError,has,validDomain,textField,dateMicros} from './common.js';
import {refreshEnergy} from './collector.js';
import {llmConfig,llmAnswer} from './llm.js';
import {intelEnsureRegistry,intelSources,intelStatus,intelRuns,intelItems,intelEvidence,intelCollect,intelSearch} from './global-store.js';
export function responseJSON(status,body){return new Response(JSON.stringify(body),{status,headers:securityHeaders('application/json; charset=utf-8')})}
export function securityHeaders(type){return{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'none'; object-src 'none'; frame-ancestors 'self' https://chatgpt.com; base-uri 'none'; form-action 'self'"}}
export async function readJSON(request){if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')throw new ValidationError('Content-Type 必须为 application/json');if(Number(request.headers.get('Content-Length'))>2*1024*1024)throw new ValidationError('请求体超过2MiB');const reader=request.body?.getReader();if(!reader)throw new ValidationError('JSON 请求体为空');const parts=[];let count=0;while(true){const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>2*1024*1024){await reader.cancel();throw new ValidationError('请求体超过2MiB')}parts.push(r.value)}const raw=new Uint8Array(count);let at=0;for(const p of parts){raw.set(p,at);at+=p.length}let value;try{value=JSON.parse(new TextDecoder().decode(raw))}catch{throw new ValidationError('请求体不是有效JSON')}if(!value||typeof value!=='object'||Array.isArray(value))throw new ValidationError('JSON 请求体必须为对象');return value}
export function viewerCountryContext(request){let code=null;try{const raw=request.cf?.country;if(typeof raw==='string'&&/^[A-Z]{2}$/.test(raw)&&raw!=='XX')code=raw}catch{}return{country_code:code,country_hint_available:code!==null,country_basis:code?'platform_request_cf_country':'not_exposed',scope:'coarse_request_origin_hint_not_verified_owner_physical_location',physical_location_verified:false,manual_correction_supported:true,precise_location_requested:false,ip_stored:false,external_geolocation_used:false};}
export async function handleRequest(request,env,context={}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 try{
  if(path.startsWith('/api/')){
   const origin=request.headers.get('Origin');if(origin&&origin!==SITE_ORIGIN&&origin!==url.origin)return responseJSON(403,{error:'same_origin_only',message:'拒绝外部网页跨域访问私人站点数据。'});if(request.headers.get('Sec-Fetch-Site')==='cross-site')return responseJSON(403,{error:'same_origin_only',message:'拒绝跨站请求。'});
   if(method==='GET'&&path==='/api/viewer-context')return responseJSON(200,viewerCountryContext(request));
   const store=new RiskStore(env.DB,PUBLIC_BUNDLE);await store.ensureSeed();if(path.startsWith('/api/reviewed-intake')||path.startsWith('/api/retrieval/')||path.startsWith('/api/global/')||path==='/api/workspace'||path.startsWith('/api/workspace/'))await intelEnsureRegistry(store);const workspace=(path==='/api/workspace'||path.startsWith('/api/workspace/'))?new WorkspaceService(store,env):null;const domain=url.searchParams.get('domain');if(domain&&!path.startsWith('/api/outcomes/'))validDomain(domain);
   if(method==='GET'){
    if(path==='/api/mrdiy/advisor/config')return responseJSON(200,sovernAdvisorConfig(env));
    if(path==='/api/mrdiy/scenario')return responseJSON(200,new MrdiyDemoService(store).scenario());
    if(path==='/api/mrdiy/case')return responseJSON(200,new MrdiyDemoService(store).open(url.searchParams.get('id')));
    if(path==='/api/mrdiy/decisions')return responseJSON(200,await new MrdiyDemoService(store).list(url.searchParams.get('case_id')));
    if(path==='/api/mrdiy/decision')return responseJSON(200,await new MrdiyDemoService(store).reopen(url.searchParams.get('id')));
    if(path==='/api/replay/run')return responseJSON(200,await new JourneyService(store).run(url.searchParams.get('id')));
    if(path==='/api/replay/cases')return responseJSON(200,replayCatalog(url.searchParams.get('id')));
    if(path==='/api/journey/entries')return responseJSON(200,await new JourneyService(store).list(url.searchParams.get('kind'),url.searchParams.get('project_id'),url.searchParams.get('parent_id')));
    if(path==='/api/prototype')return responseJSON(200,await new PrototypeService(store).read(url.searchParams.get('case_id')));
    if(path==='/api/outcomes/status')return responseJSON(200,await outcomeStatus(store));
    if(path==='/api/outcomes/events')return responseJSON(200,await outcomeEvents(store,Object.fromEntries(url.searchParams)));
    if(path==='/api/outcomes/export')return responseJSON(200,await outcomeEvents(store,Object.fromEntries(url.searchParams),{exporting:true}));
    if(path==='/api/outcomes/evidence'){if(url.searchParams.size!==1)throw new ValidationError('历史轨迹证据仅接受version_id');return responseJSON(200,await outcomeEvidence(store,url.searchParams.get('version_id')));}
    if(path==='/api/outcomes/context')return responseJSON(200,await outcomeContext(store,Object.fromEntries(url.searchParams)));
    if(path==='/api/reviewed-intake/status')return responseJSON(200,await reviewedIntakeStatus(store));if(path==='/api/retrieval/status')return responseJSON(200,await retrievalStatus(store));if(path==='/api/retrieval/documents')return responseJSON(200,await retrievalDocuments(store,Object.fromEntries(url.searchParams)));if(path==='/api/workspace')return responseJSON(200,await workspace.bootstrap());
    if(path==='/api/workspace/leads')return responseJSON(200,await workspace.leads(url.searchParams.get('object_id')));
    if(path==='/api/workspace/organization-evidence')return responseJSON(200,await workspace.organizationEvidence(url.searchParams.get('project_id')));
    if(path==='/api/workspace/projects')return responseJSON(200,await workspace.projectDetail(url.searchParams.get('id')));
    if(path==='/api/workspace/business-cases')return responseJSON(200,await new BusinessCaseService(store).detail(url.searchParams.get('id'),url.searchParams.get('project_id')));
    if(path==='/api/global/source-history')return responseJSON(200,await retainedSourceHistory(store,url.searchParams.get('version_id')));
    if(path==='/api/workspace/cases')return responseJSON(200,await workspace.detail(url.searchParams.get('id')));
    if(path==='/api/global/types')return responseJSON(200,await informationTypeStatus(store));
    if(path==='/api/global/sources')return responseJSON(200,{sources:await intelSources(store)});
    if(path==='/api/global/status')return responseJSON(200,await intelStatus(store));
    if(path==='/api/global/runs')return responseJSON(200,{runs:await intelRuns(store)});
    if(path==='/api/global/items')return responseJSON(200,await intelItems(store,Object.fromEntries(url.searchParams)));
    if(path==='/api/global/evidence')return responseJSON(200,await intelEvidence(store,textField(url.searchParams.get('version_id'),'version_id',100,true)));
    if(path==='/api/health')return responseJSON(200,{status:'ok',database:'cloudflare-d1',rag_mode:'lexical',llm:llmConfig(env),baseline_commit:PUBLIC_BUNDLE.baseline_commit});
    if(path==='/api/dashboard'){const d=await store.dashboard();d.llm=llmConfig(env);return responseJSON(200,d)}
    if(path==='/api/sources')return responseJSON(200,{sources:await store.sources()});
    if(path==='/api/records'){const records=await store.records(domain,500);return responseJSON(200,{records,count:records.length,truncated:records.length===500})}
    if(path==='/api/evidence')return responseJSON(200,await store.evidence(url.searchParams.getAll('id')));
    if(path==='/api/alerts')return responseJSON(200,{alerts:await store.alerts(Object.fromEntries(['domain','severity','status'].map(k=>[k,url.searchParams.get(k)])))});
    if(path==='/api/actions')return responseJSON(200,{actions:await store.actions()});
    if(path==='/api/templates'){if(!domain)throw new ValidationError('请指定domain');return responseJSON(200,{domain,...PUBLIC_BUNDLE.templates[domain]})}
    if(path==='/api/intelligence'){const domains=[];for(const d of domain?[domain]:Object.keys(DOMAINS))domains.push(await store.publicDomain(d));return responseJSON(200,{domains,sources:(await store.sources()).filter(s=>s.kind.startsWith('public'))})}
   }
   if(['POST','PATCH'].includes(method)){
    const body=await readJSON(request);
    if(method==='POST'){
     if(path==='/api/journey/entries')return responseJSON(200,await new JourneyService(store).submit(body));
     if(path==='/api/mrdiy/advisor'){const r=await sovernAdvisorAnswer(env,body,{service:new MrdiyDemoService(store)});return responseJSON(r.status,r.body);}
     if(path==='/api/mrdiy/demand-outlook')return responseJSON(200,new MrdiyDemoService(store).demandOutlook(body));
     if(path==='/api/mrdiy/joint-plans')return responseJSON(200,new MrdiyDemoService(store).jointPlans(body));
     if(path==='/api/mrdiy/forecast-policy')return responseJSON(200,new MrdiyDemoService(store).forecast(body));
     if(path==='/api/mrdiy/analyze')return responseJSON(200,new MrdiyDemoService(store).analyze(body));
     if(path==='/api/mrdiy/compare')return responseJSON(200,new MrdiyDemoService(store).compare(body));
     if(path==='/api/mrdiy/decisions')return responseJSON(200,await new MrdiyDemoService(store).save(body));
     if(path==='/api/mrdiy/reconstruct')return responseJSON(200,new MrdiyDemoService(store).reconstruct(body));
     if(path==='/api/mrdiy/exposure')return responseJSON(200,new MrdiyDemoService(store).exposure(body));
     if(path==='/api/replay/lock')return responseJSON(200,await new JourneyService(store).lock(body));
     if(path==='/api/replay/advance')return responseJSON(200,await new JourneyService(store).advance(body));
     if(path==='/api/replay/method-update')return responseJSON(200,await new JourneyService(store).methodUpdate(body));
     if(path==='/api/outcomes/import-chunk')return responseJSON(200,await importOutcomeChunk(store,body));
     if(path==='/api/prototype/start')return responseJSON(200,await new PrototypeService(store).start(body));
     if(path==='/api/prototype/analyze')return responseJSON(200,await new PrototypeService(store).analyze(body));
     if(path==='/api/prototype/save-analysis')return responseJSON(200,await new PrototypeService(store).analyze(body,true));
     if(path==='/api/prototype/decide')return responseJSON(200,await new PrototypeService(store).decide(body));
     if(path==='/api/prototype/feedback')return responseJSON(200,await new PrototypeService(store).feedback(body));
     if(path==='/api/workspace/business-cases')return responseJSON(200,await new BusinessCaseService(store).create(body));
     if(path==='/api/workspace/business-compare')return responseJSON(200,await new BusinessCaseService(store).compare(body));
     if(path==='/api/workspace/organization-evidence')return responseJSON(200,await workspace.saveOrganizationEvidence(body));
     if(path==='/api/workspace/projects')return responseJSON(200,await workspace.createProject(body));
     if(path==='/api/workspace/objects')return responseJSON(200,await workspace.createObject(body));
     if(path==='/api/workspace/cases')return responseJSON(200,await workspace.createCase(body));
     if(path==='/api/workspace/evidence')return responseJSON(200,await workspace.attachEvidence(body));
     if(path==='/api/workspace/reviews')return responseJSON(200,await workspace.addReview(body));
     if(path==='/api/workspace/impact')return responseJSON(200,await workspace.impact(body));
     if(path==='/api/workspace/actions')return responseJSON(200,await workspace.createAction(body));
     if(path==='/api/workspace/assist'){const r=await workspace.assist(body);return responseJSON(r.status,r.body)}
     if(path==='/api/global/import-refresh-snapshot'){if(Object.keys(body).length!==1||!Object.hasOwn(body,'snapshot'))throw new ValidationError('刷新导入请求仅接受snapshot对象');return responseJSON(200,await importRefreshSnapshot(store,body.snapshot))}
     if(path==='/api/global/import-snapshot'){if(Object.keys(body).length!==1||!Object.hasOwn(body,'snapshot'))throw new ValidationError('导入请求仅接受snapshot对象');return responseJSON(200,await importLocalSnapshot(store,body.snapshot))}
     if(path==='/api/reviewed-intake/chunk')return responseJSON(200,await importReviewedChunk(store,body));if(path==='/api/retrieval/index'){if(Object.keys(body).length)throw new ValidationError('索引操作不接收URL或参数');return responseJSON(200,await retrievalIndex(store))}if(path==='/api/global/search'){if(Object.keys(body).some(k=>!['information_type','cursor','reporting_country','query','limit','source_id','category','language','origin','saved_from','saved_to','sort','observation_grain','observation_from','observation_to'].includes(k)))throw new ValidationError('检索仅支持reporting_country/query/limit/source_id/category/language/origin/saved_from/saved_to/sort/observation_grain/observation_from/observation_to');return responseJSON(200,await intelSearch(store,body.query,has(body,'limit')?body.limit:20,{information_type:body.information_type,cursor:body.cursor,reporting_country:body.reporting_country,source_id:body.source_id,category:body.category,language:body.language,origin:body.origin,saved_from:body.saved_from,saved_to:body.saved_to,sort:body.sort,observation_grain:body.observation_grain,observation_from:body.observation_from,observation_to:body.observation_to}));}
     if(path==='/api/global/collect'){if(Object.keys(body).length!==1)throw new ValidationError('采集请求仅接受source_id，不接受URL/查询词');const result=await intelCollect(store,textField(body.source_id,'source_id',100,true));return responseJSON(result.status==='in_progress'?409:200,result)}
     if(path==='/api/global/schedule-receipt'){const allowed=['automation_id','enabled','verified','schedule','timezone','next_run_at','status','verified_at','last_run_at','last_attempt_at','last_run_status','last_complete_success_at','last_run_summary'];if(Object.keys(body).some(k=>!allowed.includes(k))||typeof body.enabled!=='boolean'||typeof body.verified!=='boolean'||body.timezone!=='Asia/Kuching')throw new ValidationError('计划回执字段无效');for(const k of ['automation_id','schedule','status','verified_at'])textField(body[k],k,2000,true);for(const k of ['last_run_at','last_attempt_at','last_complete_success_at'])if(has(body,k)&&body[k]!==null){textField(body[k],k,80,true);if(!/[TZ]/.test(body[k])||!/(Z|[+-]\d\d:?\d\d)$/.test(body[k]))throw new ValidationError('计划运行时间必须有明确时区');dateMicros(body[k])}if(has(body,'last_run_status')&&!['complete_success','partial_failure','failed','uncertain'].includes(body.last_run_status))throw new ValidationError('计划运行结果状态无效');if(has(body,'last_run_summary')){const summary=body.last_run_summary,fields=['sources_succeeded','sources_failed','sources_uncertain','sources_skipped','new_items','new_rule_alerts'];if(!summary||typeof summary!=='object'||Array.isArray(summary)||Object.keys(summary).some(k=>!fields.includes(k)))throw new ValidationError('计划摘要只接受有界计数');for(const [k,v]of Object.entries(summary))if(typeof v!=='number'||!Number.isInteger(v)||v<0||v>(k.startsWith('sources_')?GLOBAL_CATALOG.sources.length:10000))throw new ValidationError('计划摘要计数无效')}await store.write('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)',['global_schedule_receipt',JSON.stringify(body)]);return responseJSON(200,{saved:true,scheduler:body})}
     if(path==='/api/import')return responseJSON(200,await store.importRecords(body));
     if(path==='/api/documents')return responseJSON(201,await store.addText(body));
     if(path==='/api/analyze'){if(body.domain)validDomain(body.domain);const d=await store.dashboard();d.llm=llmConfig(env);return responseJSON(200,d)}
     if(path==='/api/actions')return responseJSON(201,{action:await store.saveAction(body)});
     if(path==='/api/rag/search')return responseJSON(200,await store.search(body.query,body.domain,has(body,'limit')?body.limit:5));
     if(path==='/api/llm/answer'){const query=textField(body.query,'query',500,true),evidence=(await store.search(query,body.domain,5)).results,result=await llmAnswer(env,query,evidence);return responseJSON(result.status,result.body)}
     if(path==='/api/intelligence/analyze'){validDomain(body.domain);const params=body.params??{};if(has(params,'observed_at'))throw new ValidationError('请求不能覆盖真实当前时钟');return responseJSON(200,{result:await store.publicDomain(body.domain,params)})}
     if(path==='/api/intelligence/refresh'){if(Object.keys(body).length!==1||body.domain!=='energy')throw new ValidationError('在线重新采集仅支持固定NESO能源源');const result=await refreshEnergy(store);return responseJSON(result.status==='in_progress'?409:200,result)}
     if(path==='/api/demo/load'){const rows=[{domain:'supply',sku:'DEMO-DRINK',on_hand:40,daily_demand:15,lead_time_days:5,reorder_point:60,ordered_qty:100,fulfilled_qty:85,occurred_at:'2026-10-01T08:00:00Z'},{domain:'procurement',invoice_id:'DEMO-INV-01',vendor:'演示供应商',amount:1000,currency:'USD',due_date:'2026-10-01',paid_amount:0,po_amount:1000,received_amount:900,occurred_at:'2026-10-01T08:00:00Z'},{domain:'service',ticket_id:'DEMO-TICKET-01',opened_at:'2026-10-01T08:00:00Z',sla_hours:24,status:'resolved',resolved_at:'2026-10-02T12:00:00Z',occurred_at:'2026-10-02T12:00:00Z'},{domain:'energy',meter_id:'DEMO-METER-01',period_start:'2026-10-01',period_end:'2026-10-02',kwh:140,baseline_kwh:100,waste_kg:30,recycled_kg:10,occurred_at:'2026-10-02T12:00:00Z'}];return responseJSON(200,await store.importRecords({format:'json',content:JSON.stringify(rows),source:{title:'显式演示 · 合成业务场景',publisher:'Dormathon demo',license:'Synthetic demonstration only'}},true))}
    }
    if(method==='PATCH'&&path==='/api/workspace/projects')return responseJSON(200,await workspace.updateProject(body));
    if(method==='PATCH'&&path==='/api/workspace/cases')return responseJSON(200,await workspace.updateCase(body));
    if(method==='PATCH'&&path==='/api/workspace/evidence')return responseJSON(200,await workspace.updateEvidence(body));
    if(method==='PATCH'&&path==='/api/workspace/actions')return responseJSON(200,await workspace.updateAction(body));
    if(method==='PATCH'&&path.startsWith('/api/alerts/'))return responseJSON(200,{alert:await store.updateAlert(decodeURIComponent(path.split('/').at(-1)),body)});
    if(method==='PATCH'&&path.startsWith('/api/actions/'))return responseJSON(200,{action:await store.saveAction(body,decodeURIComponent(path.split('/').at(-1)))});
   }
   return responseJSON(404,{error:'not_found',message:'API不存在'});
  }
  const key=path==='/'?'/index.html':path;if(method!=='GET'||!has(ASSETS,key))return responseJSON(404,{error:'not_found',message:'文件不存在'});const asset=ASSETS[key],body=asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;return new Response(body,{headers:securityHeaders(asset.type)});
 }catch(e){if(e instanceof ValidationError||e.status)return responseJSON(e.status||400,{error:e.code||'validation_error',message:e.message});console.error('Dormathon request failure',e.name,e.message);return responseJSON(503,{error:'service_unavailable',message:'持久服务处理失败，请保留输入并稍后重试。没有用浏览器临时状态替代保存。'})}
}
export default{fetch:handleRequest};
