import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const sourcePath=fileURLToPath(new URL('../static/collector-workbench.js',import.meta.url));
const source=fs.readFileSync(sourcePath,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'6d5c2002564fa2f6277fd70d7ff1c9df53d9fc9b21ef9c833bffcce40d03a578','Rebind reviewed behavior tests only after intentional client changes');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function response(value, { ok = true, status = ok ? 200 : 500 } = {}) {
  return { ok, status, json: async () => value };
}

function textOf(node) {
  return node.textContent;
}

class MockElement {
  constructor(tagName = 'div', text = '') {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.hidden = false;
    this.isConnected = true;
    this._text = text == null ? '' : String(text);
    this.parentElement = null;
    this.type = '';
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join('');
  }

  get options() {
    return this.tagName === 'select' ? this.children.filter((child) => child.tagName === 'option') : undefined;
  }

  set textContent(value) {
    this._text = value == null ? '' : String(value);
    this.children = [];
  }

  append(...nodes) {
    for (const node of nodes.flat()) {
      if (node == null) continue;
      node.parentElement = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes) {
    this.children = [];
    this._text = '';
    for (const node of nodes.flat()) this.append(node);
    if (this.tagName === 'select') this.value = this.children.find((n) => n.tagName === 'option')?.value || '';
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async fire(type, extra = {}) {
    const event = {
      preventDefault() {},
      target: this,
      currentTarget: this,
      ...extra,
    };
    let current=this;
    do{event.currentTarget=current;const results=(current.listeners.get(type)||[]).map(listener=>listener(event));await Promise.all(results);current=['click','input','submit'].includes(type)?current.parentElement:null;}while(current);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  querySelectorAll(selector) {
    if (selector === 'input,select,button') return this._formControls || [];
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const found = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (child.className.split(/\s+/).includes(cls)) found.push(child);
          visit(child);
        }
      };
      visit(this);
      return found;
    }
    return [];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  scrollIntoView() {this.scrolled=true;}
  focus(){this.focused=true;this.focusCount=(this.focusCount||0)+1;if(this.ownerDocument)this.ownerDocument.activeElement=this;}
  click() {if(['input','textarea','select','button'].includes(this.tagName))this.focus();return this.fire('click');}
  close() { this.closed = true; }
}

const initialItem = {
  version_id: 'version-initial',
  title: 'Verified initial item',
  source_id: 'verified-source',
  category: 'news',
  data_origin: 'direct',
  published_at: '2026-10-08T09:00:00Z',
};

function makeHarness(fetchOverride = null, initialURL = null) {
  const ids = [
    'organization-workspace','organization-workspace-title','organization-workspace-status','organization-profile','organization-profile-text','organization-profile-toggle','organization-add-context','organization-editor-panel','organization-cancel','organization-saved-contexts','organization-case-list','organization-advisor-form','organization-advisor-question','organization-advisor-status','prototype-advisor-form','prototype-advisor-question','prototype-advisor-status','organization-setup','organization-form','organization-title','organization-objective','organization-save','organization-status','organization-context','organization-empty','prototype-content','record-context','strategy-compare','strategy-form','strategy-status','strategy-delay','strategy-result','home-form','home-query','home-search-status','notice', 'collect-source', 'filter-source', 'collect', 'source-rows', 'run-rows',
    'reporting-country','saved-from','saved-to','filter-sort','observation-grain','observation-from','observation-to','counts', 'runtime','reviewed-intake-state', 'index-status', 'index', 'filter-form', 'record-detail',
    'item-scope', 'item-results', 'next-items', 'group-results', 'snapshot-save',
    'snapshot-state', 'reload', 'clear-filter', 'filter-query', 'filter-category',
    'filter-origin', 'filter-language', 'documents', 'snapshot-file', 'evidence', 'main',
    'prototype-start','prototype-form','prototype-status','prototype-fields','prototype-layers','prototype-public-evidence','prototype-save','prototype-metrics','prototype-findings','prototype-ports','prototype-evidence','prototype-history','prototype-decide','prototype-feedback-save','prototype-decision-form','prototype-decision-title','prototype-decision-note','prototype-feedback-form','prototype-feedback','prototype-feedback-note','document-results', 'evidence-close', 'outcome-form','outcome-grain','outcome-source','outcome-from','outcome-to','outcome-query','outcome-status','outcome-scope','outcome-results','outcome-detail','outcome-next','outcome-clear','outcome-export','outcome-train-end','outcome-validation-end',
  ];
  ids.push(...[...fs.readFileSync(new URL('../static/collector-index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]).filter(id=>id.startsWith('organization-')&&!ids.includes(id)));
  const elements = new Map(ids.map((id) => {
    const tag = ['filter-form','outcome-form','organization-form'].includes(id) ? 'form'
      : ['collect-source', 'filter-source', 'filter-category', 'filter-origin','observation-grain','organization-switch','organization-kind','organization-type','organization-industry'].includes(id) ? 'select'
      : ['filter-query', 'filter-language', 'snapshot-file','observation-from','observation-to','organization-title','organization-region'].includes(id) ? 'input'
      : id==='organization-objective'?'textarea'
      : id === 'collect' || id === 'index' || id === 'snapshot-save' || id === 'reload' || id === 'clear-filter' || id === 'next-items' || id === 'documents' ? 'button'
      : 'div';
    return [id, new MockElement(tag)];
  }));
  const panes = ['home','intelligence','strategy','decisions','collect', 'filter', 'organize', 'ingest','outcomes'].map((view) => {
    const node = new MockElement('section');
    node.dataset.pane = view;
    return node;
  });
  const views = ['home','intelligence','strategy','decisions','collect', 'filter', 'organize', 'ingest','outcomes'].map((view) => {
    const node = new MockElement('button');
    node.dataset.view = view;
    return node;
  });
  const skip = new MockElement('a');
  skip.className = 'skip';

  const controls = ['reporting-country','filter-query', 'filter-source', 'filter-category', 'filter-origin', 'filter-language','observation-grain','observation-from','observation-to'].map((id) => elements.get(id));
  controls.push(new MockElement('button'));
  elements.get('filter-form')._formControls = controls;elements.get('outcome-form')._formControls=['outcome-source','outcome-from','outcome-to','outcome-query'].map(id=>elements.get(id));

  const selectors = new Map([...elements].map(([id, element]) => [`#${id}`, element]));
  selectors.set('.skip', skip);
  const document = {
    querySelector(selector) { return selectors.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === '[data-pane]') return panes;
      if (selector === '[data-view]') return [document.body,...views];
      if (selector === 'button[data-view]') return views;
      return [];
    },
    createElement(tag) {const node=new MockElement(tag);node.ownerDocument=document;return node;},
  };
  document.body=new MockElement('body');document.body.dataset.view='home';document.body.ownerDocument=document;document.activeElement=document.body;
  for(const node of [...elements.values(),...panes,...views,skip]){node.ownerDocument=document;document.body.append(node);}
  const form=elements.get('organization-form');form.parentElement=elements.get('organization-editor-panel');
  for(const id of ['organization-title','organization-region','organization-objective','organization-kind','organization-type','organization-industry',...['continuity','supply_chain','costs','policy','workforce','finance_fx','weather','public_affairs'].map(f=>'organization-focus-'+f)])elements.get(id).parentElement=form;
  const calls = [];
  const defaultFetch = async (path, init) => {
    if (path === '/api/outcomes/status')return response({events:1,versions:1,metrics:7,batches:[],sources:[]});
    if(path.startsWith('/api/outcomes/events?'))return response({events:[],watermark:0,next_cursor:null});
    if (path === '/api/global/status') return response({ item_count: 1, direct_item_count: 1, uploaded_item_count: 0, endpoint_count: 1, scheduler: { enabled: false } });
    if (path === '/api/global/sources') return response({ sources: [{ id: 'verified-source', name: 'Verified Source', enabled: true, freshness: 'fresh' }] });
    if (path === '/api/global/runs') return response({ runs: [] });
    if (path === '/api/retrieval/status') return response({ indexed_documents: 0, stored_versions: 0, pending_versions: 0, policy_mismatch_documents: 0, coverage_complete: false, rebuild_required: false });
    if (path.startsWith('/api/global/items?')) return response({ items: [initialItem], next_cursor: null });
    if (path === '/api/global/search') return response({ results: [] });
    if (path.startsWith('/api/global/evidence?')) return response({ version_id: new URL(path, 'http://local').searchParams.get('version_id'), metadata: { title: 'Default evidence' } });
    if (path === '/api/global/collect') return response({ status: 'ok' });
    if (path === '/api/global/import-snapshot') return response({ status: 'imported' });
    if (path === '/api/retrieval/index') return response({ indexed_this_request: 0 });
    if (path === '/api/retrieval/documents?limit=10') return response({ documents: [], last_sequence: 0, watermark: 0, next_cursor: null });
    return response({});
  };
  const fetch = async (path, init) => {
    calls.push({ path: String(path), init: { ...init } });
    return (fetchOverride || defaultFetch)(String(path), init);
  };
  const context = {
    document,
    fetch,
    URL,
    URLSearchParams,
    TextEncoder,
    Blob,
    innerWidth: 1024,
    window:{scrollY:136,scrollTo(value){this.lastScroll=value.top}},
    setTimeout,
    clearTimeout,
    console,
  };
  const windowListeners=new Map();context.window.addEventListener=(type,listener)=>windowListeners.set(type,listener);context.window.fire=type=>windowListeners.get(type)?.();
  if(initialURL){const entries=[initialURL];let at=0;context.window.location={href:initialURL};context.window.history={entries,replaceState(_s,_t,url){entries[at]=url;context.window.location.href=url;},pushState(_s,_t,url){entries.splice(at+1);entries.push(url);at++;context.window.location.href=url;},back(){if(at>0){at--;context.window.location.href=entries[at];context.window.fire('popstate');}},forward(){if(at<entries.length-1){at++;context.window.location.href=entries[at];context.window.fire('popstate');}}};}
  vm.createContext(context);
  // The exposure is appended only in the VM so the immutable input file remains untouched.
  vm.runInContext(`${source}\n;globalThis.__test = { state, loadItems, selectItem, readSnapshot,outcomeRead,outcomeSelect,outcomeUI,show,filterValues,writeLocation,restoreLocation,prototypeUI,prototypeRead,prototypeAnalyze,organizationUI,organizationRead,organizationRoute,openOrganizationEditor,captureOrganizationDraft,organizationFindUI,organizationFindSearch,inspectOrganizationCandidate,strategyUI,strategyRead };`, context, { filename: sourcePath });
  return { app: context.__test, context, calls, elements, panes, views, document };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

async function readyHarness(fetchOverride = null) {
  const harness = makeHarness(fetchOverride);
  await settle();
  assert.match(textOf(harness.elements.get('item-results')), /Verified initial item/);
  return harness;
}

async function run(name,fn){await test(name,fn);}

await run('Actual incremental source details disclose report periods, unknown amount units and original-acquisition anomalies',async()=>{
 const admission=JSON.parse(fs.readFileSync(new URL('../data/reviewed-signal-admission.json',import.meta.url),'utf8'));
 const harness=await readyHarness((path)=>{
  if(path.startsWith('/api/global/items?'))return response({items:[initialItem]});
  if(path.startsWith('/api/global/evidence?'))return response(harness.evidence);
  return response({});
 });
 for(const sourceId of ['stat_twse_monthly_revenue','enterprise_notice_twse','political_eu_council_releases_fr']){
  const chunk=admission.chunks.find(c=>c.source_id===sourceId),data=JSON.parse(fs.readFileSync(new URL('../datasets/reviewed-signals/'+chunk.path,import.meta.url),'utf8')),metadata=(Array.isArray(data)?data:data.items)[0];
  harness.evidence={version_id:sourceId,material_kind:admission.policies.find(p=>p.id===sourceId).material_kind,data_origin:'reviewed_external_snapshot',metadata,collection_receipt:{raw_sha256:'0'.repeat(64)}};
  await harness.app.selectItem({version_id:sourceId},new MockElement('button'));
  const detail=textOf(harness.elements.get('record-detail'));
  assert.match(detail,/no Site upstream fetch/);assert.match(detail,/Source record update/);
  if(sourceId==='stat_twse_monthly_revenue'){assert.match(detail,/2026-08/);assert.match(detail,/Monetary currency\/scale remain unknown/);assert.match(detail,/no annualization, FX conversion or risk inference/);assert.match(detail,/Raw value/);assert.match(detail,/Source field explicitly uses %/);assert.doesNotMatch(detail,/unit_status/);}
  if(sourceId==='enterprise_notice_twse'){assert.match(detail,/2026-10-07/);assert.match(detail,/Local clocks have unknown timezone/);assert.match(detail,/occurrence/);}
  if(sourceId==='political_eu_council_releases_fr'){assert.match(detail,/refers to that acquisition/);assert.match(detail,/fr column language/);assert.match(detail,/Update is not publication/);}
 }
});

await run('stale filter response cannot replace newer results', async () => {
  const pending = new Map();
  const harness = await readyHarness((path, init) => {
    if (path === '/api/global/search') {
      const query = JSON.parse(init.body).query;
      const wait = deferred();
      pending.set(query, wait);
      return wait.promise;
    }
    return (async () => {
      if (path === '/api/global/status') return response({ item_count: 1, direct_item_count: 1, uploaded_item_count: 0, endpoint_count: 1 });
      if (path === '/api/global/sources') return response({ sources: [{ id: 'verified-source', name: 'Verified Source', enabled: true }] });
      if (path === '/api/global/runs') return response({ runs: [] });
      if (path === '/api/retrieval/status') return response({});
      if (path.startsWith('/api/global/items?')) return response({ items: [initialItem] });
      return response({});
    })();
  });
  const query = harness.elements.get('filter-query');
  query.value = 'older';
  const older = harness.app.loadItems();
  query.value = 'newer';
  const newer = harness.app.loadItems();
  assert.deepEqual([...pending.keys()].sort(), ['newer', 'older']);
  pending.get('newer').resolve(response({ results: [{ version_id: 'v-new', title: 'NEWER RESULT', source_id: 'verified-source', metadata: {} }] }));
  await newer;
  pending.get('older').resolve(response({ results: [{ version_id: 'v-old', title: 'OLDER RESULT', source_id: 'verified-source', metadata: {} }] }));
  await older;
  assert.equal(harness.app.state.query, 'newer');
  assert.match(textOf(harness.elements.get('item-results')), /NEWER RESULT/);
  assert.doesNotMatch(textOf(harness.elements.get('item-results')), /OLDER RESULT/);
});

await run('stale detail reply cannot replace selected immutable evidence', async () => {
  const pending = new Map();
  const harness = await readyHarness((path) => {
    if (path.startsWith('/api/global/evidence?')) {
      const version = new URL(path, 'http://local').searchParams.get('version_id');
      const wait = deferred();
      pending.set(version, wait);
      return wait.promise;
    }
    if (path === '/api/global/status') return response({});
    if (path === '/api/global/sources') return response({ sources: [] });
    if (path === '/api/global/runs') return response({ runs: [] });
    if (path === '/api/retrieval/status') return response({});
    if (path.startsWith('/api/global/items?')) return response({ items: [initialItem] });
    return response({});
  });
  const oldItem = { ...initialItem, version_id: 'version-old', title: 'Old selected' };
  const newItem = { ...initialItem, version_id: 'version-new', title: 'New selected' };
  const older = harness.app.selectItem(oldItem, new MockElement('button'));
  const newer = harness.app.selectItem(newItem, new MockElement('button'));
  pending.get('version-new').resolve(response({ version_id: 'version-new', metadata: { title: 'NEW IMMUTABLE EVIDENCE' }, data_origin: 'direct', observed_at: '2026-10-08T09:00:00Z' }));
  await newer;
  pending.get('version-old').resolve(response({ version_id: 'version-old', metadata: { title: 'STALE IMMUTABLE EVIDENCE' }, data_origin: 'direct', observed_at: '2026-10-08T08:00:00Z' }));
  await older;
  assert.equal(harness.app.state.selected, 'version-new');
  assert.match(textOf(harness.elements.get('record-detail')), /NEW IMMUTABLE EVIDENCE/);
  assert.doesNotMatch(textOf(harness.elements.get('record-detail')), /STALE IMMUTABLE EVIDENCE/);
});

await run('oversized snapshot is rejected before reading file text', async () => {
  const harness = await readyHarness();
  let reads = 0;
  await harness.app.readSnapshot({ name: 'too-large.json', size: 1_572_865, text: async () => { reads += 1; return '{}'; } });
  assert.equal(reads, 0);
  assert.match(textOf(harness.elements.get('snapshot-state')), /exceeds1.5MiB/);
  assert.equal(harness.elements.get('snapshot-save').disabled, true);
  assert.equal(harness.app.state.snapshot, null);
});

await run('newer snapshot file read wins over older pending read', async () => {
  let importBody;
  const harness = await readyHarness((path, init) => {
    if (path === '/api/global/import-snapshot') {
      importBody = JSON.parse(init.body);
      return response({ status: 'imported' });
    }
    if (path === '/api/global/status') return response({});
    if (path === '/api/global/sources') return response({ sources: [] });
    if (path === '/api/global/runs') return response({ runs: [] });
    if (path === '/api/retrieval/status') return response({});
    if (path.startsWith('/api/global/items?')) return response({ items: [initialItem] });
    return response({});
  });
  const oldRead = deferred();
  const oldPromise = harness.app.readSnapshot({ name: 'old.json', size: 20, text: () => oldRead.promise });
  await harness.app.readSnapshot({ name: 'new.json', size: 20, text: async () => JSON.stringify({ schema_version: 'new-file', items: [{ id: 'new' }] }) });
  oldRead.resolve(JSON.stringify({ schema_version: 'old-file', items: [{ id: 'old' }] }));
  await oldPromise;
  assert.equal(harness.app.state.snapshot.schema_version, 'new-file');
  assert.match(textOf(harness.elements.get('snapshot-state')), /new\.json/);
  assert.equal(harness.elements.get('snapshot-save').disabled, false);
  await harness.elements.get('snapshot-save').click();
  assert.equal(importBody.snapshot.schema_version, 'new-file');
  assert.equal(harness.app.state.snapshot, null);
});

await run('refresh picker rejects synthetic/oversized parts with the actual reason and no save',async()=>{
  const harness=await readyHarness();
  for(const [size,mode,message]of [[262145,'retained_replay',/256KiB/],[100,'synthetic_fixture',/Synthetic test/]]){
    await harness.app.readSnapshot({name:'refresh.json',size,text:async()=>JSON.stringify({schema_version:'dormathon.source-refresh.snapshot.v1',payload:{transport_mode:mode,records:[]}})});
    assert.equal(harness.app.state.snapshot,null);assert.equal(harness.elements.get('snapshot-save').disabled,true);assert.match(textOf(harness.elements.get('snapshot-state')),message);
  }
});

await run('refresh picker uses the bounded manual refresh route and preserves explicit replay label',async()=>{
  let savedPath,savedBody;
  const harness=await readyHarness((path,init)=>{if(init?.body&&path.includes('import')){savedPath=path;savedBody=JSON.parse(init.body);return response({status:'imported'});}if(path==='/api/global/sources')return response({sources:[]});if(path==='/api/global/runs')return response({runs:[]});if(path.includes('/items?'))return response({items:[initialItem]});return response({});});
  const snapshot={schema_version:'dormathon.source-refresh.snapshot.v1',payload:{transport_mode:'retained_replay',records:[]}};
  await harness.app.readSnapshot({name:'refresh.json',size:100,text:async()=>JSON.stringify(snapshot)});assert.match(textOf(harness.elements.get('snapshot-state')),/retained_replay/);await harness.elements.get('snapshot-save').click();assert.equal(savedPath,'/api/global/import-refresh-snapshot');assert.deepEqual(savedBody,{snapshot});assert.equal(harness.app.state.snapshot,null);
});

for (const scenario of ['http failure', 'network uncertainty']) {
  await run(`collection ${scenario} preserves verified state and does not retry`, async () => {
    const harness = await readyHarness((path) => {
      if (path === '/api/global/collect') {
        if (scenario === 'network uncertainty') return Promise.reject(new Error('socket closed after write'));
        return response({ message: 'collector failed' }, { ok: false, status: 503 });
      }
      if (path === '/api/global/status') return response({ item_count: 1, direct_item_count: 1, uploaded_item_count: 0, endpoint_count: 1 });
      if (path === '/api/global/sources') return response({ sources: [{ id: 'verified-source', name: 'Verified Source', enabled: true }] });
      if (path === '/api/global/runs') return response({ runs: [] });
      if (path === '/api/retrieval/status') return response({});
      if (path.startsWith('/api/global/items?')) return response({ items: [initialItem] });
      return response({});
    });
    const source = harness.elements.get('collect-source');
    source.value = 'verified-source';
    await source.fire('change');
    await harness.elements.get('collect').click();
    await settle();
    const collectCalls = harness.calls.filter((call) => call.path === '/api/global/collect');
    assert.equal(collectCalls.length, 1, 'one explicit collection click must cause one POST');
    assert.equal(collectCalls[0].init.method, 'POST');
    assert.equal(JSON.parse(collectCalls[0].init.body).source_id, 'verified-source');
    assert.match(textOf(harness.elements.get('source-rows')), /Verified Source/);
    assert.match(textOf(harness.elements.get('item-results')), /Verified initial item/);
    assert.equal(harness.elements.get('collect').disabled, false, 'button should be available for a later explicit retry');
  });
}

process.stdout.write('All runtime behavior checks passed.\n');

await run('narrow detail has a focused single surface and Back preserves query/scroll/row',async()=>{const h=await readyHarness();h.context.innerWidth=500;h.elements.get('filter-query').value='preserved draft';const row=h.elements.get('item-results').children[0].children[0];await h.app.selectItem(initialItem,row);assert.equal(h.elements.get('item-results').hidden,true);assert.equal(h.elements.get('filter-form').hidden,true);assert.equal(h.elements.get('record-detail').focused,true);const back=h.elements.get('record-detail').children[0];assert.equal(back.textContent,'Back to results');await back.click();assert.equal(h.elements.get('item-results').hidden,false);assert.equal(h.elements.get('filter-form').hidden,false);assert.equal(h.elements.get('filter-query').value,'preserved draft');assert.equal(row.focused,true);assert.equal(h.context.window.lastScroll,136);});

await run('Source observation periods are sent as structured bounds and cleared independently of saved-date controls',async()=>{const h=await readyHarness();h.elements.get('observation-grain').value='year';h.elements.get('observation-from').value='2020';h.elements.get('observation-to').value='2025';h.elements.get('saved-from').value='2026-10-08';await h.app.loadItems();const browse=new URL(h.calls.at(-1).path,'https://private.example');assert.equal(browse.searchParams.get('observation_grain'),'year');assert.equal(browse.searchParams.get('observation_from'),'2020');assert.equal(browse.searchParams.get('observation_to'),'2025');assert.equal(browse.searchParams.get('saved_from'),'2026-10-08');h.elements.get('filter-query').value='GDP';await h.app.loadItems();const search=JSON.parse(h.calls.at(-1).init.body);assert.equal(search.observation_grain,'year');assert.equal(search.observation_to,'2025');assert.equal(search.saved_from,'2026-10-08');await h.elements.get('clear-filter').click();for(const id of ['observation-grain','observation-from','observation-to','saved-from'])assert.equal(h.elements.get(id).value,'');});

await run('Historical outcome narrow detail restores selected row/query/scroll and displays source codes as unknown rather than zero',async()=>{
 const actual=JSON.parse(fs.readFileSync(new URL('../source-packs/outcomes-cvd/fixtures/six-actual-trajectories.json',import.meta.url),'utf8'))[0];
 const ev={version_id:'retained-case',trajectory:actual,conservative_label_available_at:actual.availability.acquired_at,actual_site_imported_at:'2026-10-08T23:30:00Z'};
 const h=await readyHarness(path=>{if(path.startsWith('/api/global/items?'))return response({items:[initialItem]});if(path==='/api/outcomes/status')return response({events:1,versions:1,metrics:7,batches:[],sources:[]});if(path.startsWith('/api/outcomes/events?'))return response({events:[ev],watermark:1,next_cursor:null});if(path.startsWith('/api/outcomes/evidence?'))return response(ev);return response({});});
 h.context.innerWidth=500;h.context.window.scrollY=652;h.app.state.view='outcomes';h.elements.get('outcome-query').value='Steel';await h.app.outcomeRead();const row=h.elements.get('outcome-results').children[0];await h.app.outcomeSelect(ev,row);assert.equal(h.elements.get('outcome-results').hidden,true);assert.equal(h.elements.get('outcome-detail').focused,true);assert.match(textOf(h.elements.get('outcome-detail')),/Unknown\/not supplied/);assert.match(textOf(h.elements.get('outcome-detail')),/raw value/);assert.match(textOf(h.elements.get('outcome-detail')),/No contemporaneous environment/);await h.elements.get('outcome-detail').children[0].fire('click');assert.equal(h.elements.get('outcome-results').hidden,false);assert.equal(h.elements.get('outcome-detail').hidden,true);assert.equal(row.focused,true);assert.equal(h.context.window.lastScroll,652);assert.equal(h.elements.get('outcome-query').value,'Steel');
});
await run('Stale historical detail and later route cannot replace the newer selected trajectory',async()=>{
 const actual=JSON.parse(fs.readFileSync(new URL('../source-packs/outcomes-cvd/fixtures/six-actual-trajectories.json',import.meta.url),'utf8'));const pending=deferred();
 const h=await readyHarness(path=>{if(path.startsWith('/api/global/items?'))return response({items:[initialItem]});if(path.includes('version_id=older'))return pending.promise;if(path.includes('version_id=newer'))return response({version_id:'newer',trajectory:actual[1],conservative_label_available_at:actual[1].availability.acquired_at,actual_site_imported_at:'2026-10-08T23:30:00Z'});return response({});});h.app.state.view='outcomes';const old=h.app.outcomeSelect({version_id:'older'},new MockElement('button'));await h.app.outcomeSelect({version_id:'newer'},new MockElement('button'));pending.resolve(response({version_id:'older',trajectory:actual[0]}));await old;assert.match(textOf(h.elements.get('outcome-detail')),new RegExp(actual[1].source_record_id));assert.doesNotMatch(textOf(h.elements.get('outcome-detail')),new RegExp(actual[0].source_record_id));
});
await run('Explicit reporting country is sent and cleared without changing the literal query or source period',async()=>{const h=await readyHarness();h.elements.get('reporting-country').value='MY';h.elements.get('observation-grain').value='year';h.elements.get('observation-from').value='2020';await h.app.loadItems();const browse=new URL(h.calls.at(-1).path,'https://private.example');assert.equal(browse.searchParams.get('reporting_country'),'MY');assert.equal(browse.searchParams.get('observation_from'),'2020');h.elements.get('filter-query').value='Malaysia';await h.app.loadItems();const search=JSON.parse(h.calls.at(-1).init.body);assert.equal(search.reporting_country,'MY');assert.equal(search.query,'Malaysia');await h.elements.get('clear-filter').click();assert.equal(h.elements.get('reporting-country').value,'');assert.equal(h.elements.get('filter-query').value,'');});

await run('formal workspace preserves query, source period and jurisdiction in the ordinary URL across view and reload',async()=>{const h=await readyHarness();h.context.window.location={href:'https://private.example/workbench.html'};h.context.window.history={replaceState(_s,_t,url){h.context.window.location.href=url;}};h.elements.get('filter-query').value='Malaysia';h.elements.get('reporting-country').value='MY';h.elements.get('observation-grain').value='year';h.elements.get('observation-from').value='2020';h.elements.get('observation-to').value='2025';h.app.writeLocation();const url=new URL(h.context.window.location.href);assert.equal(url.searchParams.get('query'),'Malaysia');assert.equal(url.searchParams.get('reporting_country'),'MY');assert.equal(url.searchParams.get('observation_grain'),'year');assert.equal(url.searchParams.get('observation_from'),'2020');h.app.show('collect');assert.equal(new URL(h.context.window.location.href).searchParams.get('view'),'collect');h.elements.get('filter-query').value='';assert.equal(h.app.restoreLocation(),'collect');assert.equal(h.elements.get('filter-query').value,'Malaysia');});
await run('formal reader places source evidence actions before expandable clocks and keeps unknown fields exact',async()=>{const h=await readyHarness();h.evidence={version_id:'version-initial',metadata:{title:'Native GDP',url:'https://data.worldbank.org/',source_id:'stat_worldbank_gdp_annual',facts:{indicator_label:'GDP',observation_period:'2025',value:null,unit:'current_USD',vintage:{dataset_last_updated_date:'2026-07-13'}}},data_origin:'reviewed_external_snapshot',material_kind:'statistical_observation'};h.context.fetch=async()=>response(h.evidence);await h.app.selectItem(initialItem);const nodes=h.elements.get('record-detail').children;const actions=nodes.findIndex(n=>n.className==='detail-actions');const clocks=nodes.findIndex(n=>n.tagName==='details'&&n.textContent.includes('Clocks, geography and version acquisition'));assert.ok(actions>=0&&actions<clocks);assert.match(textOf(nodes[actions]),/Open provider page.*Export evidence JSON/);assert.match(textOf(h.elements.get('record-detail')),/2025/);assert.match(textOf(h.elements.get('record-detail')),/Not provided/);assert.match(textOf(h.elements.get('record-detail')),/2026-07-13/);});

await run('four information pages use the server primary filter and search pagination instead of filtering an already loaded sample',async()=>{const h=await readyHarness();h.app.show('event');await settle();assert.ok(h.calls.some(c=>c.path.startsWith('/api/global/items?')&&new URL(c.path,'https://private.example').searchParams.get('information_type')==='event'));h.elements.get('filter-query').value='km';let pages=0;h.context.fetch=async(path,init)=>{const body=JSON.parse(init.body);assert.equal(body.information_type,'event');if(++pages===1){assert.equal(body.cursor,undefined);return response({results:[{...initialItem,version_id:'first-search',metadata:{title:'First matching source event'}}],next_cursor:'bound-next'});}assert.equal(body.cursor,'bound-next');return response({results:[{...initialItem,version_id:'next-search',metadata:{title:'Next matching source event'}}],next_cursor:null});};await h.app.loadItems();await h.app.loadItems(true);assert.equal(h.app.state.items.length,2);assert.equal(h.app.state.items[1].version_id,'next-search');assert.equal(h.app.state.cursor,null);});

await run('terminal query errors restore the previous result caption and never leave the loading caption over cached evidence',async()=>{const h=await readyHarness();const previous=h.elements.get('item-scope').textContent;h.context.fetch=async()=>response({message:'Bounded query rejected'},{ok:false,status:422});h.elements.get('filter-query').value='failed query';await h.app.loadItems();assert.match(h.elements.get('item-scope').textContent,/No new results received/);assert.ok(h.elements.get('item-scope').textContent.startsWith(previous));assert.doesNotMatch(h.elements.get('item-scope').textContent,/Reading/);assert.equal(h.app.state.items[0].version_id,initialItem.version_id);assert.match(textOf(h.elements.get('notice')),/Bounded query rejected/);});


async function prototypeHarness(){const h=await readyHarness();h.context.window.location={href:'https://private.example/workbench.html?view=decisions&case_id=proto_case_linked_ops_v02'};const query=h.document.querySelector.bind(h.document);h.document.querySelector=selector=>{if(selector.startsWith('#proto-')){for(const label of h.elements.get('prototype-fields').children)for(const n of label.children)if('#'+n.id===selector)return n;}return query(selector);};const fixture=JSON.parse(fs.readFileSync(new URL('../data/prototype/linked-operations.v0.2.json',import.meta.url)));h.context.fetch=async path=>path.startsWith('/api/prototype?')?response({fixture,case:{reviews:[],evidence:[],actions:[{id:'newest',title:'Newest decision',created_at:'later'},{id:'older',title:'Older decision',created_at:'earlier'}]}}):response({metrics:[],findings:[],missing_fields:[]});h.app.state.view='decisions';await h.app.prototypeRead();return h;}
await run('Feedback targets the newest displayed decision once, with a visible exact target',async()=>{const h=await prototypeHarness();assert.equal(h.app.prototypeUI.actionId,'newest');assert.match(textOf(h.elements.get('prototype-history')),/Feedback target: Newest decision/);});
await run('An in-flight saved analysis cannot enable a decision after newer input edits',async()=>{const h=await prototypeHarness(),pending=deferred();h.context.fetch=async()=>pending.promise;const save=h.app.prototypeAnalyze(true);await h.elements.get('prototype-form').fire('input');pending.resolve(response({metrics:[],findings:[],missing_fields:[],analysis_id:'stale-analysis'}));await save;assert.equal(h.app.prototypeUI.savedAnalysis,null);assert.equal(h.elements.get('prototype-decide').disabled,true);});
await run('English error surface retains an untranslated diagnostic only in a labelled disclosure',async()=>{const h=await prototypeHarness();h.context.fetch=async()=>response({message:'指定工作区记录不存在'},{ok:false,status:400});await h.app.prototypeRead();assert.match(h.elements.get('prototype-status').textContent,/Invalid or unsupported input/);assert.doesNotMatch(h.elements.get('prototype-status').textContent,/工作区/);assert.match(textOf(h.elements.get('notice')),/Original service diagnostic/);const detail=h.elements.get('notice').children.find(n=>n.tagName==='details');assert.ok(detail);assert.match(textOf(detail),/指定工作区记录不存在/);});

await run('Same-case unsaved inputs survive the public-evidence navigation round trip',async()=>{const h=await prototypeHarness();h.document.querySelector('#proto-stock_units').value='400';await h.elements.get('prototype-form').fire('input');h.app.show('filter');h.app.state.view='decisions';await h.app.prototypeRead();assert.equal(String(h.document.querySelector('#proto-stock_units').value),'400');assert.equal(h.app.prototypeUI.savedAnalysis,null);});

await run('Initial route restores the saved case before URL normalization and preserves query/source-period context',async()=>{const h=await prototypeHarness();h.app.prototypeUI.caseId=null;h.context.window.location={href:'https://private.example/workbench.html?view=decisions&case_id=proto_case_linked_ops_v02&query=MYR&source_id=stat_ecb_fx_daily_reference&observation_grain=day&observation_from=2026-10-08&observation_to=2026-10-08'};h.context.window.history={replaceState(_s,_t,url){h.context.window.location.href=url;}};const initial=h.app.restoreLocation();assert.equal(h.app.prototypeUI.caseId,'proto_case_linked_ops_v02');h.app.show(initial);await new Promise(resolve=>setTimeout(resolve,0));const url=new URL(h.context.window.location.href);assert.equal(url.searchParams.get('case_id'),'proto_case_linked_ops_v02');assert.equal(url.searchParams.get('query'),'MYR');assert.equal(url.searchParams.get('observation_from'),'2026-10-08');assert.match(h.elements.get('prototype-status').textContent,/Saved linked case/);assert.equal(h.app.prototypeUI.actionId,'newest');});

await run('Plain initial entry opens only Home without fetching records or opening a business case',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html');await settle();assert.equal(h.app.state.view,'home');assert.equal(h.panes.filter(p=>!p.hidden).length,1);assert.equal(h.panes.find(p=>!p.hidden).dataset.pane,'home');assert.equal(h.calls.filter(c=>c.path.includes('/items?')||c.path.includes('/search')||c.path.includes('/prototype')).length,0);assert.equal(h.app.prototypeUI.caseId,null);
});
await run('Home submits one genuine lexical search with no inherited advanced filter and preserves the active case',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=home&case_id=proto_case_linked_ops_v02');await settle();h.elements.get('filter-source').value='old-source';h.elements.get('reporting-country').value='GB';h.elements.get('observation-from').value='1990';h.elements.get('home-query').value='  Malaysia  ';await h.elements.get('home-form').fire('submit');await settle();const requests=h.calls.filter(c=>c.path==='/api/global/search');assert.equal(requests.length,1);const body=JSON.parse(requests[0].init.body);assert.equal(body.query,'Malaysia');assert.equal(body.source_id,'');assert.equal(body.reporting_country,'');assert.equal(body.observation_from,'');assert.equal(h.app.state.view,'filter');assert.equal(h.app.prototypeUI.caseId,'proto_case_linked_ops_v02');const u=new URL(h.context.window.location.href);assert.equal(u.searchParams.get('query'),'Malaysia');assert.equal(u.searchParams.get('case_id'),'proto_case_linked_ops_v02');
});
await run('Empty Home intent stays on Home with a readable error and no search call',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html');await settle();h.elements.get('home-query').value=' \t ';await h.elements.get('home-form').fire('submit');assert.equal(h.app.state.view,'home');assert.match(h.elements.get('home-search-status').textContent,/Enter a search term/);assert.equal(h.elements.get('home-query').focused,true);assert.equal(h.calls.filter(c=>c.path==='/api/global/search').length,0);
});
await run('A saved record query without an explicit view remains a filtered record route rather than Home',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?query=Malaysia&reporting_country=MY&observation_grain=year&observation_from=2020&observation_to=2025');await settle();assert.equal(h.app.state.view,'filter');const call=h.calls.find(c=>c.path==='/api/global/search');assert.ok(call);const b=JSON.parse(call.init.body);assert.equal(b.query,'Malaysia');assert.equal(b.reporting_country,'MY');assert.equal(b.observation_from,'2020');assert.equal(b.observation_to,'2025');
});

await run('Organization first use is empty setup, without an automatic synthetic case or assessment',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=organization');await settle();assert.equal(h.app.state.view,'decisions');assert.equal(h.elements.get('organization-empty').hidden,false);assert.equal(h.elements.get('prototype-content').hidden,true);assert.equal(h.app.prototypeUI.caseId,null);assert.ok(h.calls.some(c=>c.path==='/api/workspace'));assert.equal(h.calls.filter(c=>c.path.startsWith('/api/prototype')||c.init.method==='POST').length,0);assert.equal(h.elements.get('organization-status').textContent,'');assert.equal(h.elements.get('organization-topbar').hidden,true);await h.elements.get('organization-setup').click();assert.equal(h.elements.get('organization-form').hidden,false);assert.equal(h.elements.get('organization-title').focused,true);
});
await run('User organization context saves through the existing project contract and never creates or assigns the demo',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=organization');await settle();let project;h.context.fetch=async(path,init)=>{if(path==='/api/workspace/projects'){const b=JSON.parse(init.body);assert.equal(b.title,'Test organization');assert.equal(b.objective,'Supply operations in Malaysia');assert.equal(b.region,'Malaysia');assert.equal(b.kind,'organization');assert.match(b.creation_key,/organization-/);assert.equal(b.domain,'global');project={id:'user-project',...b};return response({project});}if(path==='/api/workspace')return response({projects:project?[project]:[]});throw Error('Unexpected route '+path);};await h.elements.get('organization-setup').click();h.elements.get('organization-region').value='Malaysia';h.elements.get('organization-title').value='Test organization';h.elements.get('organization-objective').value='Supply operations in Malaysia';await h.elements.get('organization-form').fire('submit');await settle();assert.equal(h.app.organizationUI.projectId,'user-project');assert.equal(h.app.prototypeUI.caseId,null);assert.match(textOf(h.elements.get('organization-workspace-title')),/Test organization/);assert.equal(h.elements.get('organization-workspace').hidden,false);assert.equal(h.elements.get('organization-empty').hidden,true);assert.equal(h.elements.get('organization-profile-text').textContent,'Supply operations in Malaysia');assert.match(h.elements.get('organization-workspace-status').textContent,/risk assessment pending/);assert.equal(new URL(h.context.window.location.href).searchParams.get('project_id'),'user-project');
});
await run('Intelligence begins with a chooser, and a chosen information page uses the existing strict server filter',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=intelligence');await settle();assert.equal(h.app.state.view,'intelligence');assert.equal(h.panes.find(p=>!p.hidden).dataset.pane,'intelligence');assert.equal(h.calls.filter(c=>c.path.includes('/items?')||c.path.includes('/search')).length,0);h.app.show('reference');await settle();const c=h.calls.find(c=>c.path.startsWith('/api/global/items?'));assert.equal(new URL(c.path,'https://private.example').searchParams.get('information_type'),'reference');
});
await run('Strategy without an object remains an honest pending flow and performs no scenario or simulation request',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=strategy');await settle();assert.equal(h.app.state.view,'strategy');assert.equal(h.elements.get('strategy-form').hidden,true);assert.match(h.elements.get('strategy-status').textContent,/Choose a saved case/);assert.equal(h.calls.filter(c=>c.path.startsWith('/api/prototype')).length,0);
});
await run('Strategy compares an edited assumption through existing pure rules without changing saved inputs or claiming Felix output',async()=>{
 const h=await prototypeHarness(),fixture=h.app.prototypeUI.fixture;h.document.querySelector('#proto-stock_units').value='400';await h.elements.get('prototype-form').fire('input');let body;h.context.fetch=async(path,init)=>{if(path.startsWith('/api/prototype?'))return response({fixture,case:{case:{title:'Explicit synthetic case'},reviews:[],actions:[],evidence:[]}});assert.equal(path,'/api/prototype/analyze');body=JSON.parse(init.body);return response({metrics:[{name:'Stock coverage',value:20,unit:'day'},{name:'Gap without additional delay',value:0,unit:'day'},{name:'Gap under entered delay assumption',value:0,unit:'day'}],findings:[{domain:'supply',title:'Current inputs cover the delivery window',candidate_action:'Keep checking demand and delivery'}],missing_fields:[]});};h.app.show('strategy');await settle();assert.equal(h.elements.get('strategy-form').hidden,false);h.elements.get('strategy-delay').value='8';await h.elements.get('strategy-form').fire('submit');await settle();assert.equal(body.inputs.stock_units,400);assert.equal(body.inputs.delay_assumption_days,8);assert.equal(h.app.prototypeUI.draft.inputs.delay_assumption_days,3);assert.match(textOf(h.elements.get('strategy-result')),/20 day/);assert.match(textOf(h.elements.get('strategy-result')),/Conditional arithmetic only; no trained RL policy/);assert.match(textOf(h.elements.get('strategy-result')),/Synthetic inputs/);
});
await run('A late arithmetic comparison cannot relabel newer unsaved strategy assumptions',async()=>{
 const h=await prototypeHarness(),fixture=h.app.prototypeUI.fixture;h.context.fetch=async()=>response({fixture,case:{reviews:[]}});h.app.show('strategy');await settle();const pending=deferred();h.context.fetch=async()=>pending.promise;h.elements.get('strategy-delay').value='3';const work=h.elements.get('strategy-form').fire('submit');h.elements.get('strategy-delay').value='8';await h.elements.get('strategy-form').fire('input');pending.resolve(response({metrics:[{name:'Stock coverage',value:5,unit:'day'}],findings:[],missing_fields:[]}));await work;assert.equal(h.elements.get('strategy-result').children.length,0);assert.match(h.elements.get('strategy-status').textContent,/Assumption changed/);
});
await run('Organization Find searches retained keywords inside selected context, with honest empty coverage and editable profile suggestions',async()=>{
 const project={id:'selected-org',title:'Malaysia supplier context',objective:'Review native public references',region:'Kuching / Sarawak / Malaysia',organization_type:'education',industry:'education',focus:['policy']};const h=makeHarness(path=>response(path==='/api/workspace'?{projects:[project]}:path==='/api/global/search'?{results:[]}:{}),'https://private.example/workbench.html?view=organization&project_id=selected-org');await settle();assert.match(textOf(h.elements.get('organization-attention')),/does not mean there are no risks/);const next=h.elements.get('organization-attention').children.find(n=>n.tagName==='button');assert.equal(next.textContent,'Find intelligence for this organization');await next.click();await settle();assert.equal(h.app.organizationUI.mode,'find');assert.equal(h.elements.get('organization-overview').hidden,true);assert.equal(h.elements.get('organization-find').hidden,false);const form=h.elements.get('organization-find-search').children[0],input=form.children[0].children[0];assert.equal(input.value,project.title);assert.match(textOf(h.elements.get('organization-find-search')),/Region: Malaysia/);assert.match(textOf(h.elements.get('organization-find-results')),/No retained matches.*not complete organization news/);input.value='Malaysia MYR';await form.fire('submit');await settle();const requests=h.calls.filter(c=>c.path==='/api/global/search');assert.equal(requests.length,2);assert.equal(JSON.parse(requests[1].init.body).query,'Malaysia MYR');assert.equal(h.app.state.view,'decisions');assert.equal(new URL(h.context.window.location.href).searchParams.get('project_id'),project.id);await h.elements.get('organization-find-back').click();await settle();assert.equal(h.app.organizationUI.mode,'overview');assert.equal(h.elements.get('organization-find').hidden,true);
});

await run('Sidebar creates distinct history entries and Back/Forward restore the selected rooms without new entries',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=organization&case_id=retained-case');await settle();
 for(const view of ['home','organization','intelligence','strategy']){h.app.show(view);await settle();}
 const history=h.context.window.history,count=history.entries.length;assert.equal(count,5);h.app.show('strategy');assert.equal(history.entries.length,count);
 for(const expected of ['intelligence','decisions','home','decisions']){history.back();await settle();assert.equal(h.app.state.view,expected);assert.equal(h.app.prototypeUI.caseId,'retained-case');assert.equal(history.entries.length,count);}
 for(const expected of ['home','decisions','intelligence','strategy']){history.forward();await settle();assert.equal(h.app.state.view,expected);assert.equal(history.entries.length,count);}
});
await run('Popstate restores absent references and removed filters exactly without altering unsaved form drafts',async()=>{
 const h=makeHarness(null,'https://private.example/workbench.html?view=home');await settle();h.elements.get('organization-title').value='Unsaved company';h.elements.get('organization-objective').value='Unsaved operations';h.elements.get('organization-advisor-question').value='Unsaved advisor question';h.app.organizationUI.projectId='new-context';h.elements.get('filter-query').value='MYR';h.app.show('organization');await settle();h.context.window.history.back();await settle();assert.equal(h.app.state.view,'home');assert.equal(h.app.organizationUI.projectId,null);assert.equal(h.elements.get('filter-query').value,'');assert.equal(h.elements.get('organization-title').value,'Unsaved company');assert.equal(h.elements.get('organization-objective').value,'Unsaved operations');assert.equal(h.elements.get('organization-advisor-question').value,'Unsaved advisor question');assert.equal(h.calls.filter(c=>c.path==='/api/workspace/projects').length,0);
});
await run('Advisor is a separate page and an unconfigured entry sends no LLM request',async()=>{
 const project={id:'selected-org',title:'Company',objective:'Business',region:'Malaysia',kind:'organization',profile_revision:0};const h=makeHarness(path=>response(path==='/api/workspace'?{projects:[project],capabilities:{llm:{configured:false}}}:{}),'https://private.example/workbench.html?view=organization&project_id=selected-org');await settle();await h.elements.get('organization-advisor-open').click();assert.equal(h.app.state.view,'advisor');assert.equal(h.elements.get('organization-advisor').hidden,true);assert.equal(h.calls.filter(c=>c.path.includes('assist')||c.path.includes('llm')).length,0);
});

const normalProject={id:'normal-org',title:'QA lifecycle company',objective:'Dedicated normal organization profile for tests',region:'Malaysia',kind:'organization',profile_revision:0,domain:'global'};
function organizationFetch(projects=[normalProject],extra={}){return(path)=>response(path==='/api/workspace'?{projects,cases:[],actions:[],capabilities:{llm:{configured:false}},...extra}:path.startsWith('/api/workspace/projects?id=')?{project:projects.find(p=>p.id===new URL(path,'https://private.example').searchParams.get('id')),history:[]}:{});}
function visibleOrganizationStates(h){return['organization-empty','organization-workspace','organization-editor-panel','prototype-content'].filter(id=>!h.elements.get(id).hidden);}
await run('One declared organization opens directly while legacy contexts stay discoverable outside the formal list',async()=>{const h=makeHarness(organizationFetch([normalProject,{id:'legacy',title:'Ambiguous name',objective:'Old record'}]),'https://private.example/workbench.html?view=decisions');await settle();assert.equal(h.app.organizationUI.projectId,normalProject.id);assert.equal(h.app.organizationUI.mode,'overview');assert.deepEqual(visibleOrganizationStates(h),['organization-workspace']);const groups=h.elements.get('organization-switch').children.filter(n=>n.tagName==='optgroup');assert.equal(groups[0].label,'Organizations');assert.equal(groups[0].children.length,1);assert.equal(groups[1].label,'Legacy and QA contexts');assert.match(textOf(h.elements.get('organization-legacy-choices')),/Ambiguous name/);assert.equal(h.calls.filter(c=>c.init.method==='POST'||c.init.method==='PATCH').length,0);});
await run('Create is exclusive; switching to a saved organization hides the blank form and demo',async()=>{const h=makeHarness(organizationFetch(),'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-new').click();await settle();assert.deepEqual(visibleOrganizationStates(h),['organization-editor-panel']);h.elements.get('organization-title').value='Unfinished create draft';await h.elements.get('organization-form').fire('input');h.app.organizationRoute('overview',normalProject.id);await settle();assert.deepEqual(visibleOrganizationStates(h),['organization-workspace']);assert.equal(h.elements.get('organization-form').hidden,true);await h.elements.get('organization-new').click();await settle();assert.equal(h.elements.get('organization-title').value,'Unfinished create draft');assert.deepEqual(visibleOrganizationStates(h),['organization-editor-panel']);});
await run('Details and edit are exclusive; Cancel restores details with no create mutation and Back restores overview',async()=>{const h=makeHarness(organizationFetch(),'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-profile-toggle').click();await settle();assert.equal(h.app.organizationUI.mode,'details');assert.equal(h.elements.get('organization-overview').hidden,true);assert.equal(h.elements.get('organization-profile').hidden,false);await h.elements.get('organization-add-context').click();await settle();assert.deepEqual(visibleOrganizationStates(h),['organization-editor-panel']);assert.equal(h.elements.get('organization-title').value,normalProject.title);h.elements.get('organization-title').value='Unsaved edit';await h.elements.get('organization-cancel').click();await settle();assert.equal(h.app.organizationUI.mode,'details');assert.equal(h.elements.get('organization-editor-panel').hidden,true);assert.equal(h.calls.filter(c=>c.init.method==='POST'||c.init.method==='PATCH').length,0);h.context.window.history.back();await settle();assert.equal(h.app.organizationUI.mode,'overview');assert.deepEqual(visibleOrganizationStates(h),['organization-workspace']);});
await run('Real organization Save uses PATCH with same ID/revision, returns overview and never POST-creates a revision',async()=>{let p={...normalProject};const h=makeHarness(async(path,init)=>{if(path==='/api/workspace/projects'&&init.method==='PATCH'){const body=JSON.parse(init.body);assert.equal(body.id,p.id);assert.equal(body.expected_revision,0);assert.equal(body.title,'QA lifecycle edited');p={...p,title:body.title,region:body.region,objective:body.objective,profile_revision:1};return response({project:p});}return organizationFetch([p])(path,init);},'https://private.example/workbench.html?view=decisions');await settle();h.app.organizationRoute('details',p.id);await settle();await h.elements.get('organization-add-context').click();await settle();h.elements.get('organization-title').value='QA lifecycle edited';await h.elements.get('organization-form').fire('submit');await settle();assert.equal(h.app.organizationUI.projectId,normalProject.id);assert.equal(h.app.organizationUI.mode,'overview');assert.equal(h.elements.get('organization-workspace-title').textContent,'QA lifecycle edited');assert.deepEqual(visibleOrganizationStates(h),['organization-workspace']);assert.equal(h.calls.filter(c=>c.path==='/api/workspace/projects'&&c.init.method==='POST').length,0);assert.equal(h.app.organizationUI.drafts[p.id],undefined);});
await run('Existing project identity takes precedence over an unrelated prototype case reference',async()=>{const h=makeHarness(organizationFetch([normalProject],{cases:[{id:'demo-case',project_id:'proto_project_linked_ops_v02'}]}),'https://private.example/workbench.html?view=decisions&project_id=normal-org&case_id=demo-case');await settle();assert.equal(h.elements.get('organization-workspace-title').textContent,normalProject.title);assert.equal(h.elements.get('prototype-content').hidden,true);assert.equal(h.calls.filter(c=>c.path.startsWith('/api/prototype')).length,0);});
await run('Linked investigation stays subordinate to company and unrelated case content cannot render under it',async()=>{const c={id:'saved-case',project_id:normalProject.id,title:'Saved investigation',question:'Review evidence',status:'investigating',evidence_count:0};const h=makeHarness(path=>path.startsWith('/api/workspace/cases?id=')?response({case:c,evidence:[],reviews:[],actions:[],impact_scenarios:[]}):organizationFetch([normalProject],{cases:[c]})(path),'https://private.example/workbench.html?view=decisions');await settle();const button=h.elements.get('organization-case-list').children.find(n=>n.tagName==='button');await button.click();await settle();assert.equal(h.app.organizationUI.mode,'investigation');assert.equal(h.elements.get('organization-workspace-title').textContent,normalProject.title);assert.match(textOf(h.elements.get('organization-investigation-content')),/Saved investigation/);assert.equal(h.elements.get('organization-overview').hidden,true);assert.equal(h.elements.get('prototype-content').hidden,true);await h.elements.get('organization-investigation-back').click();await settle();assert.equal(h.app.organizationUI.mode,'overview');assert.equal(h.app.prototypeUI.caseId,null);});
await run('Create cancellation and Back/Forward preserve an exclusive draft without leaking it beneath another company',async()=>{const other={...normalProject,id:'other',title:'Other declared organization'};const h=makeHarness(organizationFetch([normalProject,other]),'https://private.example/workbench.html?view=decisions&project_id=normal-org');await settle();await h.elements.get('organization-new').click();h.elements.get('organization-title').value='Draft retained';await h.elements.get('organization-form').fire('input');h.context.window.history.back();await settle();assert.equal(h.app.organizationUI.projectId,normalProject.id);assert.equal(h.app.organizationUI.mode,'overview');assert.equal(h.elements.get('organization-form').hidden,true);h.context.window.history.forward();await settle();assert.equal(h.app.organizationUI.mode,'create');assert.deepEqual(visibleOrganizationStates(h),['organization-editor-panel']);assert.equal(h.elements.get('organization-title').value,'Draft retained');await h.elements.get('organization-cancel').click();await settle();assert.equal(h.app.organizationUI.mode,'overview');h.app.organizationRoute('overview',other.id);await settle();assert.equal(h.elements.get('organization-workspace-title').textContent,other.title);assert.equal(h.elements.get('organization-form').hidden,true);assert.deepEqual(visibleOrganizationStates(h),['organization-workspace']);});
await run('Last-used organization opens directly on a later room entry and does not infer company type from titles',async()=>{const second={...normalProject,id:'second-org',title:'Another organization'},legacy={...normalProject,id:'legacy-looking-company',kind:'legacy',title:'A real-looking name'};const h=makeHarness(organizationFetch([normalProject,second,legacy]),'https://private.example/workbench.html?view=home');await settle();const memory=new Map([['dormathon:last-organization',second.id]]);h.context.window.localStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};h.app.show('organization');await settle();assert.equal(h.app.organizationUI.projectId,second.id);assert.equal(h.elements.get('organization-workspace-title').textContent,second.title);const groups=h.elements.get('organization-switch').children.filter(n=>n.tagName==='optgroup');assert.equal(groups[0].children.length,2);assert.match(textOf(groups[1]),/real-looking name.*legacy/);});
await run('A saved edit response cannot reopen Organization after newer sidebar navigation',async()=>{const pending=deferred();const h=makeHarness((path,init)=>path==='/api/workspace/projects'&&init.method==='PATCH'?pending.promise:organizationFetch()(path,init),'https://private.example/workbench.html?view=decisions');await settle();h.app.organizationRoute('details',normalProject.id);await settle();await h.elements.get('organization-add-context').click();await settle();h.elements.get('organization-title').value='Accepted edit';const work=h.elements.get('organization-form').fire('submit');h.app.show('home');pending.resolve(response({project:{...normalProject,title:'Accepted edit',profile_revision:1}}));await work;await settle();assert.equal(h.app.state.view,'home');assert.equal(new URL(h.context.window.location.href).searchParams.get('view'),'home');assert.equal(h.elements.get('organization-form').hidden,true);});

await run('Bubbled Organization field clicks do not navigate, reread, refocus Name or move the caret',async()=>{
 const h=makeHarness(organizationFetch(),'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-new').click();
 const name=h.elements.get('organization-title'),region=h.elements.get('organization-region'),business=h.elements.get('organization-objective');name.value='Dedicated unsaved focus QA';await name.fire('input');
 const load=h.app.organizationUI.load,entries=h.context.window.history.entries.length,nameFocus=name.focusCount;
 for(const [field,text] of [[region,'Malaysia, Singapore'],[business,'Education and research operations']]){await field.click();field.value=text;field.selectionStart=field.selectionEnd=7;await field.fire('input');await settle();assert.equal(h.document.activeElement,field);assert.equal(field.selectionStart,7);assert.equal(h.app.organizationUI.load,load);assert.equal(h.context.window.history.entries.length,entries);}
 assert.equal(name.focusCount,nameFocus);assert.equal(h.document.body.listeners.get('click'),undefined);assert.equal(h.document.body.attributes.has('aria-pressed'),false);assert.equal(name.value,'Dedicated unsaved focus QA');assert.equal(h.calls.filter(c=>c.init.method==='POST'||c.init.method==='PATCH').length,0);
 await h.views.find(n=>n.dataset.view==='home').click();await settle();assert.equal(h.app.state.view,'home');
});
await run('Repeated create reads preserve focused field, user input, caret and scroll without rehydrating the editor',async()=>{
 const h=makeHarness(organizationFetch(),'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-new').click();
 const region=h.elements.get('organization-region'),name=h.elements.get('organization-title');await region.click();region.value='Malaysia and Singapore draft';region.selectionStart=region.selectionEnd=9;await region.fire('input');const focusCount=name.focusCount;h.elements.get('organization-editor-panel').scrolled=false;
 for(let i=0;i<3;i++){await h.app.organizationRead();await settle();assert.equal(h.document.activeElement,region);assert.equal(region.value,'Malaysia and Singapore draft');assert.equal(region.selectionStart,9);}
 assert.equal(name.focusCount,focusCount);assert.equal(h.elements.get('organization-editor-panel').scrolled,false);assert.equal(h.app.organizationUI.drafts.create.region,region.value);
});
await run('Delayed edit workspace read cannot steal typing focus or overwrite a draft after editor entry',async()=>{
 const h=makeHarness(organizationFetch(),'https://private.example/workbench.html?view=decisions');await settle();h.app.organizationRoute('details',normalProject.id);await settle();const pending=deferred();h.context.fetch=path=>path==='/api/workspace'?pending.promise:organizationFetch()(path);
 await h.elements.get('organization-add-context').click();const field=h.elements.get('organization-objective');assert.equal(field.value,normalProject.objective);await field.click();field.value='Unsaved business typed during the read';field.selectionStart=field.selectionEnd=12;await field.fire('input');const count=h.elements.get('organization-title').focusCount;
 pending.resolve(response({projects:[{...normalProject,profile_revision:1}],cases:[],actions:[]}));await settle();assert.equal(h.document.activeElement,field);assert.equal(field.value,'Unsaved business typed during the read');assert.equal(field.selectionStart,12);assert.equal(h.elements.get('organization-title').focusCount,count);assert.match(h.elements.get('organization-save-status').textContent,/newer revision/);assert.equal(h.app.organizationUI.drafts[normalProject.id].expectedRevision,0);
});
await run('Delayed startup status render preserves an already-active create draft and caret',async()=>{
 const pending=deferred(),h=makeHarness(path=>path==='/api/global/status'?pending.promise:organizationFetch()(path),'https://private.example/workbench.html?view=decisions');h.app.show('organization');await settle();h.app.openOrganizationEditor();const field=h.elements.get('organization-region');await field.click();field.value='Region typed before startup finishes';field.selectionStart=field.selectionEnd=6;await field.fire('input');const count=h.elements.get('organization-title').focusCount;
 pending.resolve(response({}));await settle();assert.equal(h.app.organizationUI.mode,'create');assert.equal(h.document.activeElement,field);assert.equal(field.value,'Region typed before startup finishes');assert.equal(field.selectionStart,6);assert.equal(h.elements.get('organization-title').focusCount,count);
});

await run('Guided create saves selected type, field and focus with an optional blank description; cancel/reentry retains choices',async()=>{let project;const h=makeHarness((path,init)=>{if(path==='/api/workspace/projects'){const b=JSON.parse(init.body);assert.equal(b.objective,'');assert.equal(b.organization_type,'education');assert.equal(b.industry,'education');assert.deepEqual(b.focus,['policy','workforce']);project={...b,id:'guided-qa',profile_revision:0};return response({project});}return response(path==='/api/workspace'?{projects:project?[project]:[]}:{});},'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-setup').click();h.elements.get('organization-title').value='QA guided university';h.elements.get('organization-region').value='Sarawak / Malaysia';h.elements.get('organization-type').value='education';h.elements.get('organization-industry').value='education';h.elements.get('organization-focus-policy').checked=true;h.elements.get('organization-focus-workforce').checked=true;await h.elements.get('organization-form').fire('input');await h.elements.get('organization-cancel').click();await settle();await h.elements.get('organization-setup').click();assert.equal(h.elements.get('organization-type').value,'education');assert.equal(h.elements.get('organization-focus-policy').checked,true);await h.elements.get('organization-form').fire('submit');await settle();assert.equal(h.app.organizationUI.projectId,'guided-qa');assert.equal(h.app.organizationUI.mode,'overview');assert.match(h.elements.get('organization-profile-text').textContent,/Educational institution/);});
await run('Candidate inspect and explicit save persist an immutable association under the selected organization, visible after a fresh overview read',async()=>{const p={...normalProject,focus:['finance_fx']},ev={version_id:'real-version',content_hash:'frozen-hash',data_origin:'reviewed_external_snapshot',metadata:{source_id:'ecb',title:'MYR reference',url:'https://www.ecb.europa.eu/',facts:{value:'4.1',unit:'MYR per EUR',observation_period:'2026-10-08'}}};let saved=false;const h=makeHarness((path,init)=>{if(path==='/api/workspace')return response({projects:[p],cases:saved?[{id:'saved-review',project_id:p.id,status:'investigating',title:ev.metadata.title,question:'Review relevance',evidence_count:1}]:[],actions:[]});if(path==='/api/global/search')return response({results:[{version_id:ev.version_id,title:ev.metadata.title,source_id:'ecb',metadata:ev.metadata,data_origin:ev.data_origin}]});if(path.startsWith('/api/global/evidence?'))return response(ev);if(path==='/api/workspace/organization-evidence'){const body=JSON.parse(init.body);assert.equal(body.project_id,p.id);assert.equal(body.version_id,ev.version_id);assert.equal(body.association_status,undefined);saved=true;return response({status:'saved',case_id:'saved-review'});}if(path.startsWith('/api/workspace/organization-evidence?'))return response({evidence:saved?[{id:'association',case_id:'saved-review',version_id:ev.version_id,title:ev.metadata.title,source_id:'ecb',association_status:'possible',added_at:'2026-10-09',data_origin:ev.data_origin}]:[]});return response({});},'https://private.example/workbench.html?view=decisions&project_id='+p.id);await settle();await h.elements.get('organization-attention').children.find(n=>n.tagName==='button').click();await settle();assert.equal(h.calls.filter(c=>c.path==='/api/workspace/organization-evidence').length,0);await h.elements.get('organization-find-results').children[0].click();await settle();const reader=h.elements.get('organization-find-reader');assert.match(reader.textContent,/ORIGINAL RETAINED EVIDENCE.*MYR reference/);assert.match(reader.textContent,/frozen-hash/);assert.equal(h.elements.get('organization-find-results').hidden,true);assert.equal(h.elements.get('organization-find-search').hidden,true);const save=reader.children.find(n=>n.tagName==='button'&&n.textContent==='Save to this organization');assert.ok(save);await save.click();await settle();assert.equal(saved,true);assert.match(reader.textContent,/applicability remains unverified/i);await reader.children.find(n=>n.tagName==='button'&&n.textContent==='View saved evidence in overview').click();await settle();assert.equal(h.app.organizationUI.projectId,p.id);assert.match(h.elements.get('organization-related').textContent,/MYR reference.*Human association: possible.*applicability unverified/);assert.equal(h.elements.get('organization-find').hidden,true);});
await run('Late organization search and inspection cannot overwrite another organization or reopen after navigation',async()=>{const other={...normalProject,id:'other-org',title:'Other organization'},pending=deferred();const h=makeHarness((path,init)=>path==='/api/global/search'?pending.promise:organizationFetch([normalProject,other])(path,init),'https://private.example/workbench.html?view=decisions');await settle();await h.elements.get('organization-attention').children.find(n=>n.tagName==='button').click();await settle();h.app.organizationRoute('overview',other.id);await settle();pending.resolve(response({results:[{version_id:'wrong-late',title:'Late source'}]}));await settle();assert.equal(h.app.organizationUI.projectId,other.id);assert.equal(h.app.organizationUI.mode,'overview');assert.equal(h.elements.get('organization-find').hidden,true);assert.equal(h.app.organizationFindUI.results.length,0);});
