import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const sourcePath=fileURLToPath(new URL('../static/collector-workbench.js',import.meta.url));
const source=fs.readFileSync(sourcePath,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'2e0b17027c0d8f85785fe7170eff8551a1a681ee9c618de700a396666f2a084c','Rebind reviewed behavior tests only after intentional client changes');

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
    const results = (this.listeners.get(type) || []).map((listener) => listener(event));
    await Promise.all(results);
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
  focus(){this.focused=true;}
  click() { return this.fire('click'); }
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

function makeHarness(fetchOverride = null) {
  const ids = [
    'notice', 'collect-source', 'filter-source', 'collect', 'source-rows', 'run-rows',
    'reporting-country','saved-from','saved-to','filter-sort','observation-grain','observation-from','observation-to','counts', 'runtime','reviewed-intake-state', 'index-status', 'index', 'filter-form', 'record-detail',
    'item-scope', 'item-results', 'next-items', 'group-results', 'snapshot-save',
    'snapshot-state', 'reload', 'clear-filter', 'filter-query', 'filter-category',
    'filter-origin', 'filter-language', 'documents', 'snapshot-file', 'evidence', 'main',
    'prototype-start','prototype-form','prototype-status','prototype-fields','prototype-layers','prototype-branches','prototype-db-supply','prototype-db-procurement','prototype-db-service','prototype-db-energy','prototype-knowledge-clock','prototype-world-clock','prototype-assumptions','prototype-objectives','prototype-constraints','prototype-horizon','prototype-scenarios','prototype-seed','prototype-freeze-state','prototype-state-status','prototype-map-form','prototype-map-submit','prototype-mapping-evidence','prototype-mapping-record','prototype-mapping-value','prototype-mapping-from','prototype-mapping-to','prototype-mapping-note','prototype-public-evidence','prototype-save','prototype-metrics','prototype-findings','prototype-ports','prototype-evidence','prototype-history','prototype-decide','prototype-feedback-save','prototype-decision-form','prototype-decision-title','prototype-decision-note','prototype-feedback-form','prototype-feedback','prototype-feedback-note','document-results', 'evidence-close', 'outcome-form','outcome-grain','outcome-source','outcome-from','outcome-to','outcome-query','outcome-status','outcome-scope','outcome-results','outcome-detail','outcome-next','outcome-clear','outcome-export','outcome-train-end','outcome-validation-end',
  ];
  const elements = new Map(ids.map((id) => {
    const tag = ['filter-form','outcome-form','prototype-form','prototype-map-form','prototype-decision-form','prototype-feedback-form'].includes(id) ? 'form'
      : ['collect-source', 'filter-source', 'filter-category', 'filter-origin','observation-grain','prototype-mapping-evidence','prototype-mapping-record'].includes(id) ? 'select'
      : ['filter-query', 'filter-language', 'snapshot-file','observation-from','observation-to'].includes(id) ? 'input'
      : id === 'collect' || id === 'index' || id === 'snapshot-save' || id === 'reload' || id === 'clear-filter' || id === 'next-items' || id === 'documents' ? 'button'
      : 'div';
    return [id, new MockElement(tag)];
  }));
  const panes = ['collect', 'filter', 'organize', 'ingest','outcomes'].map((view) => {
    const node = new MockElement('section');
    node.dataset.pane = view;
    return node;
  });
  const views = ['collect', 'filter', 'organize', 'ingest','outcomes'].map((view) => {
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
      if (selector === '[data-view]') return views;
      return [];
    },
    createElement(tag) { return new MockElement(tag); },
  };
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
  vm.createContext(context);
  // The exposure is appended only in the VM so the immutable input file remains untouched.
  vm.runInContext(`${source}\n;globalThis.__test = { state, loadItems, selectItem, readSnapshot,outcomeRead,outcomeSelect,outcomeUI,show,filterValues,writeLocation,restoreLocation,prototypeUI,prototypeRead,prototypeAnalyze,prototypeRenderMappingTargets,prototypeRenderHoldout };`, context, { filename: sourcePath });
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
await run('formal reader places source evidence actions before expandable clocks and keeps unknown fields exact',async()=>{const h=await readyHarness();h.evidence={version_id:'version-initial',metadata:{title:'Native GDP',url:'https://data.worldbank.org/',source_id:'stat_worldbank_gdp_annual',facts:{indicator_label:'GDP',observation_period:'2025',value:null,unit:'current_USD',vintage:{dataset_last_updated_date:'2026-07-13'}}},data_origin:'reviewed_external_snapshot',material_kind:'statistical_observation'};h.context.fetch=async()=>response(h.evidence);await h.app.selectItem(initialItem);const nodes=h.elements.get('record-detail').children;const actions=nodes.findIndex(n=>n.className==='detail-actions');const clocks=nodes.findIndex(n=>n.tagName==='details'&&n.textContent.includes('Clocks, geography and version acquisition'));assert.ok(actions>=0&&actions<clocks);assert.match(textOf(nodes[actions]),/Verify original source.*Export evidence JSON/);assert.match(textOf(h.elements.get('record-detail')),/2025/);assert.match(textOf(h.elements.get('record-detail')),/Not provided/);assert.match(textOf(h.elements.get('record-detail')),/2026-07-13/);});

await run('four information pages use the server primary filter and search pagination instead of filtering an already loaded sample',async()=>{const h=await readyHarness();h.app.show('event');await settle();assert.ok(h.calls.some(c=>c.path.startsWith('/api/global/items?')&&new URL(c.path,'https://private.example').searchParams.get('information_type')==='event'));h.elements.get('filter-query').value='km';let pages=0;h.context.fetch=async(path,init)=>{const body=JSON.parse(init.body);assert.equal(body.information_type,'event');if(++pages===1){assert.equal(body.cursor,undefined);return response({results:[{...initialItem,version_id:'first-search',metadata:{title:'First matching source event'}}],next_cursor:'bound-next'});}assert.equal(body.cursor,'bound-next');return response({results:[{...initialItem,version_id:'next-search',metadata:{title:'Next matching source event'}}],next_cursor:null});};await h.app.loadItems();await h.app.loadItems(true);assert.equal(h.app.state.items.length,2);assert.equal(h.app.state.items[1].version_id,'next-search');assert.equal(h.app.state.cursor,null);});

await run('terminal query errors restore the previous result caption and never leave the loading caption over cached evidence',async()=>{const h=await readyHarness();const previous=h.elements.get('item-scope').textContent;h.context.fetch=async()=>response({message:'Bounded query rejected'},{ok:false,status:422});h.elements.get('filter-query').value='failed query';await h.app.loadItems();assert.match(h.elements.get('item-scope').textContent,/No new results received/);assert.ok(h.elements.get('item-scope').textContent.startsWith(previous));assert.doesNotMatch(h.elements.get('item-scope').textContent,/Reading/);assert.equal(h.app.state.items[0].version_id,initialItem.version_id);assert.match(textOf(h.elements.get('notice')),/Bounded query rejected/);});


async function prototypeHarness(){const h=await readyHarness();h.context.window.location={href:'https://private.example/workbench.html?view=decisions&case_id=proto_case_linked_ops_v02'};const query=h.document.querySelector.bind(h.document);h.document.querySelector=selector=>{if(selector.startsWith('#proto-')){for(const label of h.elements.get('prototype-fields').children)for(const n of label.children)if('#'+n.id===selector)return n;}return query(selector);};const fixture=JSON.parse(fs.readFileSync(new URL('../data/prototype/linked-operations.v0.2.json',import.meta.url)));h.context.fetch=async path=>path.startsWith('/api/prototype?')?response({fixture,case:{reviews:[],evidence:[],actions:[{id:'newest',title:'Newest decision',created_at:'later'},{id:'older',title:'Older decision',created_at:'earlier'}]}}):response({metrics:[],findings:[],missing_fields:[]});h.app.state.view='decisions';await h.app.prototypeRead();return h;}
await run('Evidence mappings can target only explicitly selected D1 supply records',async()=>{const h=await prototypeHarness();h.app.prototypeUI.dataRecords={supply:[{id:'selected-supply',occurred_at:'2026-10-01T00:00:00Z'},{id:'unselected-supply',occurred_at:'2026-10-02T00:00:00Z'}]};h.app.prototypeUI.selectedRecordIds=new Set(['selected-supply']);h.app.prototypeRenderMappingTargets();const options=h.elements.get('prototype-mapping-record').options;assert.deepEqual(options.map(item=>item.value).filter(Boolean),['selected-supply']);assert.equal(h.elements.get('prototype-mapping-record').disabled,false);});
await run('UI labels synthetic held-out fidelity with units and keeps operational accuracy claims separate',async()=>{
 const h=await prototypeHarness();
 const holdout={claims:'synthetic simulator fidelity only',configurations:[{configuration_id:'heldout-demand',horizon_days:14,metrics:{
  one_day:{fulfilment_gap_days:{count:4,mean_absolute_error:1.25,empirical_holdout_coverage:0.75}},
  rollout:{energy_consumed_kwh:{count:4,mean_absolute_error:8.5,empirical_holdout_coverage:0.5}}
 }}]};
 h.app.prototypeRenderHoldout({model:{holdout_evaluation:holdout}});
 assert.match(textOf(h.elements.get('prototype-ports')),/Synthetic held-out model fidelity/);
 assert.match(textOf(h.elements.get('prototype-ports')),/MAE 8.50 kWh/);
 assert.match(textOf(h.elements.get('prototype-ports')),/no operational outcomes used/);
});
await run('Feedback targets the newest displayed decision once, with a visible exact target',async()=>{const h=await prototypeHarness();assert.equal(h.app.prototypeUI.actionId,'newest');assert.match(textOf(h.elements.get('prototype-history')),/Feedback target: Newest decision/);});
await run('An in-flight saved analysis cannot enable a decision after newer input edits',async()=>{const h=await prototypeHarness(),pending=deferred();h.context.fetch=async()=>pending.promise;const save=h.app.prototypeAnalyze(true);await h.elements.get('prototype-form').fire('input');pending.resolve(response({metrics:[],findings:[],missing_fields:[],analysis_id:'stale-analysis'}));await save;assert.equal(h.app.prototypeUI.savedAnalysis,null);assert.equal(h.elements.get('prototype-decide').disabled,true);});
await run('English error surface retains an untranslated diagnostic only in a labelled disclosure',async()=>{const h=await prototypeHarness();h.context.fetch=async()=>response({message:'指定工作区记录不存在'},{ok:false,status:400});await h.app.prototypeRead();assert.match(h.elements.get('prototype-status').textContent,/Invalid or unsupported input/);assert.doesNotMatch(h.elements.get('prototype-status').textContent,/工作区/);assert.match(textOf(h.elements.get('notice')),/Original service diagnostic/);const detail=h.elements.get('notice').children.find(n=>n.tagName==='details');assert.ok(detail);assert.match(textOf(detail),/指定工作区记录不存在/);});

await run('Same-case unsaved inputs survive the public-evidence navigation round trip',async()=>{const h=await prototypeHarness();h.document.querySelector('#proto-stock_units').value='400';await h.elements.get('prototype-form').fire('input');h.app.show('filter');h.app.state.view='decisions';await h.app.prototypeRead();assert.equal(String(h.document.querySelector('#proto-stock_units').value),'400');assert.equal(h.app.prototypeUI.savedAnalysis,null);});

await run('Initial route restores the saved case before URL normalization and preserves query/source-period context',async()=>{const h=await prototypeHarness();h.app.prototypeUI.caseId=null;h.context.window.location={href:'https://private.example/workbench.html?view=decisions&case_id=proto_case_linked_ops_v02&query=MYR&source_id=stat_ecb_fx_daily_reference&observation_grain=day&observation_from=2026-10-08&observation_to=2026-10-08'};h.context.window.history={replaceState(_s,_t,url){h.context.window.location.href=url;}};const initial=h.app.restoreLocation();assert.equal(h.app.prototypeUI.caseId,'proto_case_linked_ops_v02');h.app.show(initial);await new Promise(resolve=>setTimeout(resolve,0));const url=new URL(h.context.window.location.href);assert.equal(url.searchParams.get('case_id'),'proto_case_linked_ops_v02');assert.equal(url.searchParams.get('query'),'MYR');assert.equal(url.searchParams.get('observation_from'),'2026-10-08');assert.match(h.elements.get('prototype-status').textContent,/Linked workspace case/);assert.equal(h.app.prototypeUI.actionId,'newest');});
