import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const sourcePath=fileURLToPath(new URL('../static/collector-workbench.js',import.meta.url));
const source=fs.readFileSync(sourcePath,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'fb9dd7b9d7a8df8ff8aeedf6f5c3047f8142d90c72d032b5aae5c87fb43d6e1f','Rebind reviewed behavior tests only after intentional client changes');

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
    'saved-from','saved-to','filter-sort','counts', 'runtime','reviewed-intake-state', 'index-status', 'index', 'filter-form', 'record-detail',
    'item-scope', 'item-results', 'next-items', 'group-results', 'snapshot-save',
    'snapshot-state', 'reload', 'clear-filter', 'filter-query', 'filter-category',
    'filter-origin', 'filter-language', 'documents', 'snapshot-file', 'evidence', 'main',
    'document-results', 'evidence-close',
  ];
  const elements = new Map(ids.map((id) => {
    const tag = id === 'filter-form' ? 'form'
      : ['collect-source', 'filter-source', 'filter-category', 'filter-origin'].includes(id) ? 'select'
      : ['filter-query', 'filter-language', 'snapshot-file'].includes(id) ? 'input'
      : id === 'collect' || id === 'index' || id === 'snapshot-save' || id === 'reload' || id === 'clear-filter' || id === 'next-items' || id === 'documents' ? 'button'
      : 'div';
    return [id, new MockElement(tag)];
  }));
  const panes = ['collect', 'filter', 'organize', 'ingest'].map((view) => {
    const node = new MockElement('section');
    node.dataset.pane = view;
    return node;
  });
  const views = ['collect', 'filter', 'organize', 'ingest'].map((view) => {
    const node = new MockElement('button');
    node.dataset.view = view;
    return node;
  });
  const skip = new MockElement('a');
  skip.className = 'skip';

  const controls = ['filter-query', 'filter-source', 'filter-category', 'filter-origin', 'filter-language'].map((id) => elements.get(id));
  controls.push(new MockElement('button'));
  elements.get('filter-form')._formControls = controls;

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
  vm.runInContext(`${source}\n;globalThis.__test = { state, loadItems, selectItem, readSnapshot };`, context, { filename: sourcePath });
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
  assert.match(detail,/本站没有回源/);assert.match(detail,/源记录更新时间/);
  if(sourceId==='stat_twse_monthly_revenue'){assert.match(detail,/2026-08/);assert.match(detail,/金额币种与缩放单位未知/);assert.match(detail,/未年化、换汇或推断风险/);assert.match(detail,/原始数值/);assert.match(detail,/源字段明确 %/);assert.doesNotMatch(detail,/unit_status/);}
  if(sourceId==='enterprise_notice_twse'){assert.match(detail,/2026-10-07/);assert.match(detail,/当地日期 \/ 时钟未确定时区/);assert.match(detail,/发生/);}
  if(sourceId==='political_eu_council_releases_fr'){assert.match(detail,/相对原始取得时刻/);assert.match(detail,/栏目语言 fr/);assert.match(detail,/不代表发布时间/);}
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
  assert.match(textOf(harness.elements.get('snapshot-state')), /超过1.5MiB/);
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

await run('narrow detail has a focused single surface and Back preserves query/scroll/row',async()=>{const h=await readyHarness();h.context.innerWidth=500;h.elements.get('filter-query').value='preserved draft';const row=h.elements.get('item-results').children[0].children[0];await h.app.selectItem(initialItem,row);assert.equal(h.elements.get('item-results').hidden,true);assert.equal(h.elements.get('filter-form').hidden,true);assert.equal(h.elements.get('record-detail').focused,true);const back=h.elements.get('record-detail').children[0];assert.equal(back.textContent,'返回结果');await back.click();assert.equal(h.elements.get('item-results').hidden,false);assert.equal(h.elements.get('filter-form').hidden,false);assert.equal(h.elements.get('filter-query').value,'preserved draft');assert.equal(row.focused,true);assert.equal(h.context.window.lastScroll,136);});
