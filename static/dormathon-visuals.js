/* Dormathon visual evidence: pure rendering of supplied results, never a planner. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let chartSerial = 0;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const list = value => Array.isArray(value) ? value : [];
  const sum = value => Object.values(value || {}).filter(finite).reduce((a, b) => a + b, 0);
  const number = (value, digits = 2) => {
    if (!finite(value)) return 'Unavailable';
    if (value !== 0 && Math.abs(value) < Math.pow(10, -digits)) return value.toExponential(6);
    return value.toLocaleString('en', {maximumFractionDigits: digits});
  };
  const actionLabel = value => {const parts=String(value||'').split('_');if(parts.length!==3)return words(value);const inventory={none:'Keep stock',transfer40:'Transfer 40 units',order100:'Order 100 units'},staff={normal:'Normal staffing',support:'Service support'},energy={none:'No cooling',cool:'Cooling'};return inventory[parts[0]]&&staff[parts[1]]&&energy[parts[2]]?[inventory[parts[0]],staff[parts[1]],energy[parts[2]]].join(' · '):words(value);};
  const words = value => String(value || 'No new action').replace(/_/g, ' ');
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function svgEl(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(text, action) {
    const node = el('button', text, 'dv-button');
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function badge(text) { return el('span', text, 'dv-badge'); }
  function note(text) { return el('p', text, 'dv-note'); }
  function section(host, title, subtitle) {
    const node = el('section', null, 'dv-panel');
    node.append(el('h4', title, 'dv-title'));
    if (subtitle) node.append(note(subtitle));
    host.replaceChildren(node);
    return node;
  }
  function facts(entries) {
    const node = el('dl', null, 'dv-facts');
    for (const [label, value] of entries) {
      const row = el('div');
      row.append(el('dt', label), el('dd', value));
      node.append(row);
    }
    return node;
  }
  function dataTable(title, headers, rows) {
    const details = el('details', null, 'dv-data');
    details.append(el('summary', title));
    const wrap = el('div', null, 'dv-table-wrap'), table = el('table');
    table.append(el('caption', title, 'dv-sr-only'));
    const head = el('thead'), hr = el('tr');
    for (const text of headers) {const cell = el('th', text); cell.scope = 'col'; hr.append(cell);}
    head.append(hr); table.append(head);
    const body = el('tbody');
    for (const row of rows) {
      const tr = el('tr');
      row.forEach((value, i) => {const cell = el(i === 0 ? 'th' : 'td', value); if (i === 0) cell.scope = 'row'; tr.append(cell);});
      body.append(tr);
    }
    table.append(body); wrap.append(table); details.append(wrap);
    return details;
  }
  function disclosure(title, nodes) {
    const detail = el('details', null, 'dv-data');
    detail.append(el('summary', title), ...nodes);
    return detail;
  }
  function chart(series, options = {}) {
    const figure = el('figure', null, 'dv-chart');
    const width = 760, height = options.compact ? 154 : 270;
    const pad = {left: 110, right: 45, top: 18, bottom: options.compact ? 34 : 54};
    const id = 'dv-chart-' + (++chartSerial);
    const svg = svgEl('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-labelledby': id + '-title ' + id + '-desc', preserveAspectRatio: 'xMidYMid meet'});
    svg.append(svgEl('title', {id: id + '-title'}, options.title || 'Supplied result chart'));
    svg.append(svgEl('desc', {id: id + '-desc'}, options.description || 'Each line shows supplied values. Exact values are available in the expandable data table.'));
    const transform = value => options.log ? (finite(value) && value > 0 ? Math.log10(value) : null) : (finite(value) ? value : null);
    const points = series.flatMap(s => list(s.points).filter(p => finite(p.x) && transform(p.y) !== null));
    if (!points.length) {figure.append(note('No measured values were supplied for this metric.')); return figure;}
    const xs = points.map(p => p.x), ys = points.map(p => transform(p.y));
    let xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (xmin === xmax) xmax = xmin + 1;
    if (ymin === ymax) {ymin -= Math.max(1, Math.abs(ymin) * .08); ymax += Math.max(1, Math.abs(ymax) * .08);}
    else {const margin = (ymax - ymin) * .12; ymin -= margin; ymax += margin;}
    if (options.zero && !options.log && ys.every(y => y >= 0)) ymin = 0;
    const px = x => pad.left + (x - xmin) / (xmax - xmin) * (width - pad.left - pad.right);
    const py = y => height - pad.bottom - (transform(y) - ymin) / (ymax - ymin) * (height - pad.top - pad.bottom);
    for (let i = 0; i < 3; i++) {
      const v = ymin + (ymax - ymin) * i / 2, y = height - pad.bottom - i / 2 * (height - pad.top - pad.bottom);
      svg.append(svgEl('line', {x1: pad.left, y1: y, x2: width - pad.right, y2: y, class: 'dv-gridline'}));
      const label = options.log ? (Math.pow(10, v)).toExponential(1) : number(v, 1);
      svg.append(svgEl('text', {x: pad.left - 9, y: y + 4, 'text-anchor': 'end', class: 'dv-axis'}, label));
    }
    const xticks = options.xTicks || [xmin, (xmin + xmax) / 2, xmax];
    for (const x of xticks) {
      if (!finite(x) || x < xmin || x > xmax) continue;
      const label = options.xLabel ? options.xLabel(x) : number(x, 0);
      svg.append(svgEl('text', {x: px(x), y: height - pad.bottom + 19, 'text-anchor': 'middle', class: 'dv-axis'}, label));
    }
    if (!options.compact && options.xTitle) svg.append(svgEl('text', {x: width / 2, y: height - 5, 'text-anchor': 'middle', class: 'dv-axis'}, options.xTitle));
    if (finite(options.selectedX)) svg.append(svgEl('line', {x1: px(options.selectedX), y1: pad.top, x2: px(options.selectedX), y2: height - pad.bottom, class: 'dv-selected-line', visibility: options.selectedX < xmin || options.selectedX > xmax ? 'hidden' : 'visible'}));
    series.forEach((s, index) => {
      let path = '', connected = false;
      list(s.points).forEach(p => {
        if (!finite(p.x) || transform(p.y) === null) {connected = false; return;}
        path += (connected ? ' L ' : ' M ') + px(p.x).toFixed(2) + ' ' + py(p.y).toFixed(2); connected = true;
      });
      svg.append(svgEl('path', {d: path, fill: 'none', class: 'dv-series dv-series-' + (index % 3), 'stroke-dasharray': s.dashed ? '6 4' : 'none'}));
      list(s.points).forEach(p => {
        if (!finite(p.x) || transform(p.y) === null) return;
        const dot = svgEl('circle', {cx: px(p.x), cy: py(p.y), r: p.x === options.selectedX ? 4.5 : (options.compact ? 2 : 2.8), class: 'dv-point dv-point-' + (index % 3), fill: p.censored ? '#fff' : undefined});
        if (p.censored) dot.setAttribute('fill', '#fff');
        dot.append(svgEl('title', {}, (p.label || number(p.x)) + ': ' + number(p.y, 6) + (p.censored ? ' · censored' : '')));
        svg.append(dot);
      });
    });
    figure.append(svg);
    const caption = el('figcaption', null, 'dv-legend');
    series.forEach((s, i) => {const label = el('span'); label.append(el('i', null, 'dv-key dv-key-' + (i % 3) + (s.dashed ? ' dv-key-dashed' : '')), document.createTextNode(s.name)); caption.append(label);});
    if (options.log) caption.append(el('span', 'Logarithmic y-axis; exact losses below.'));
    figure.append(caption);
    return figure;
  }
  const metrics = [
    {key: 'stock', label: 'Closing available stock', unit: 'units', get: x => x.stock},
    {key: 'cash', label: 'Uncommitted cash', unit: 'MYR', get: x => x.cash},
    {key: 'fuel', label: 'Fuel remaining', unit: 'litres', get: x => x.fuel},
    {key: 'staff', label: 'Staff hours remaining', unit: 'hours', get: x => x.staff},
    {key: 'energy', label: 'Backup energy remaining', unit: 'kWh', get: x => x.energy},
    {key: 'temperature', label: 'Closing indoor temperature', unit: '°C', get: x => x.temperature},
    {key: 'backlog', label: 'Closing service backlog', unit: 'hours', get: x => x.backlog},
    {key: 'staff_used', label: 'Cumulative role reservations', unit: 'hours', get: x => x.staff_used},
    {key: 'energy_used', label: 'Cumulative backup allocation', unit: 'kWh', get: x => x.energy_used}
  ];
  function trajectoryRows(policy) {
    if (Array.isArray(policy?.days)) return policy.days.map((d, i) => ({
      day: d.day ?? i, date: d.date, action: list(policy.actions).filter(a => a.day === d.day).map(a => words(a.action_id)).join(' · ') || 'Retain commitments',
      stock: d.ending_available_units, opening: d.opening_post_decision_available_units, cash: d.cash_available_myr,
      fuel: d.fuel_remaining_litres, staff_used: d.cumulative_role_hours ? sum(d.cumulative_role_hours) : null,
      energy_used: d.cumulative_energy_kwh ? sum(d.cumulative_energy_kwh) : null, fulfilled: d.fulfilled_units,
      unserved: d.lost_sales_units, arrivals: list(d.receipt_ids), arrival_units: d.arrival_units,
      source_stock: d.source_ending_available_units, original: d
    }));
    return list(policy?.trajectory || policy?.trace).map((t, i) => {
      const before = t.observation || t.before_decision || {}, after = t.next_observation || t.after_step || {}, info = t.diagnostics || t.conditional_diagnostics || {};
      const daily = list(after.history).at(-1) || {};
      return {day: before.day ?? i, date: before.date, action: actionLabel(t.action_id), stock: after.inventory_units, opening: before.inventory_units,
        cash: after.cash_available_myr, fuel: after.resources?.fuel_remaining_litres, staff: after.resources?.staff_hours_remaining,
        energy: after.resources?.backup_energy_remaining_kwh, temperature: after.indoor_temperature_c, backlog: after.backlog_hours,
        fulfilled: info.fulfilled_units ?? daily.fulfilled_units, unserved: info.unserved_units, arrivals: list(daily.receipt_ids),
        arrival_units: info.received_units, source_stock: after.source_units, original: t};
    });
  }
  function packageRows(pkg, options = {}) {
    const inventory = pkg?.outcomes?.inventory || {};
    return list(inventory.days).map((d, i) => {
      const prior = i ? inventory.days[i - 1].ending_available_units : inventory.initial_available_units;
      let date;
      if (options.startDate && /^\d{4}-\d{2}-\d{2}/.test(options.startDate)) {
        const millis = Date.parse(options.startDate.slice(0, 10) + 'T00:00:00Z');
        if (Number.isFinite(millis)) date = new Date(millis + (d.day ?? i) * 86400000).toISOString().slice(0, 10);
      }
      return {day: d.day ?? i, date, action: 'No dated action changes exported', stock: d.ending_available_units, opening: prior,
        fulfilled: d.fulfilled_units, unserved: d.lost_sales_units, arrival_units: d.arrival_units,
        arrivals: list(inventory.events).filter(e => e.day === d.day).map(e => e.event_id || e.kind || 'Declared arrival'),
        package_cash: pkg?.outcomes?.cash?.uncommitted_cash_after_package_myr, original: d};
    });
  }
  function timeline(host, result, options = {}) {
    const compact = options.compact !== false, packages = options.mode === 'packages';
    const policies = packages ? [result?.selected_package || result || {}] : (list(result?.results).length ? result.results : [result || {}]);
    let chosen = Math.max(0, policies.findIndex(p => p.policy === options.policy));
    let day = 0;
    const root = section(host, options.title || 'Seven-day plan', compact ? null : 'Actual supplied simulator transitions · synthetic operational assumptions · human review only.');
    const top = el('div', null, 'dv-toolbar'); top.append(badge('SYNTHETIC SIMULATION')); if (!compact) top.append(badge('NO AUTOMATIC EXECUTION'));
    if (policies.length > 1) {
      const label = el('label', 'Method'), select = el('select'); select.setAttribute('aria-label', 'Timeline policy');
      policies.forEach((p, i) => {const opt = el('option', options.policyNames?.[p.policy] || words(p.policy)); opt.value = String(i); select.append(opt);});
      select.value = String(chosen); select.addEventListener('change', () => {chosen = Number(select.value); day = 0; draw();}); label.append(select); top.append(label);
    }
    root.append(top);
    if (result?.event_context && !compact) root.append(note('Event backdrop: ' + result.event_context.title + '. Arrival impact is a user-confirmed hypothetical assumption; company exposure is not established.'));
    const content = el('div'); root.append(content);
    function draw() {
      const policy = policies[chosen], rows = (options.rows ? list(options.rows) : (packages ? packageRows(policy, options) : trajectoryRows(policy))).slice(0, 7).map((r, i) => ({...r, day: r.day ?? i, action: r.action || 'No dated action supplied', arrivals: list(r.arrivals)}));
      content.replaceChildren();
      if (!rows.length) {content.append(note('Run a seven-day rehearsal to populate the timeline. No trajectory is invented.')); return;}
      if (packages && policy.feasible === false) content.append(badge('BLOCKED PACKAGE'));
      day = Math.min(day, rows.length - 1);
      const grid = el('div', null, 'dv-days'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Inspect a simulated day');
      rows.slice(0, 7).forEach((row, i) => {
        const b = button('', () => {day = i; draw(); content.querySelector('.dv-day[aria-pressed=true]')?.focus({preventScroll: true});}); b.classList.add('dv-day'); b.setAttribute('aria-pressed', String(day === i));
        b.setAttribute('aria-label', 'Day ' + (i + 1) + ', ' + (row.date || '') + ', ' + row.action + ', ' + row.arrivals.length + ' receipts');
        b.append(el('span', 'D' + (i + 1), 'dv-eyebrow'));
        if (row.date) b.append(el('strong', compact ? row.date.slice(5) : row.date));
        if (!compact) {
          b.append(el('span', row.action, 'dv-day-action'));
          b.append(el('span', row.arrivals.length ? row.arrivals.length + ' receipt' + (row.arrivals.length === 1 ? '' : 's') : 'No receipt', 'dv-day-receipt'));
        }
        grid.append(b);
      });
      content.append(grid);
      const thermalPrimary=options.primaryMetric==='temperature',primaryKey=thermalPrimary?'temperature':'stock';const stockSeries = [{name: thermalPrimary?'Closing temperature (°C)':'Closing stock (units)', points: rows.map((r, i) => ({x: i + 1, y: r[primaryKey], label: r.date}))}];
      if (packages && result?.baseline && result.baseline.package_id !== policy.package_id) {
        const baseline = packageRows(result.baseline, options);
        if (baseline.some(r => finite(r.stock))) stockSeries.push({name: 'No-change stock', dashed: true, points: baseline.map((r, i) => ({x: i + 1, y: r.stock, label: r.date}))});
      }
      if (rows.some(r => finite(r[primaryKey]))) content.append(chart(stockSeries, {title: thermalPrimary?'Closing temperature across the actual seven-day trace':'Closing available stock across the actual seven-day trace', selectedX: day + 1, zero: !thermalPrimary, xTicks: compact ? [1, 4, rows.length] : rows.map((_, i) => i + 1), xLabel: x => 'D' + x, xTitle: compact ? null : 'Synthetic episode day'}));
      const detail = el('div', null, 'dv-day-detail'); detail.setAttribute('role', 'status'); detail.setAttribute('aria-live', 'polite');
      const selected = rows[day];
      detail.append(el('h5', 'D' + (day + 1) + (selected.date ? ' · ' + selected.date : '')));
      if (!packages) detail.append(el('p', selected.action));
      detail.append(facts(compact ? [[thermalPrimary?'Temperature (°C)':'Stock (units)', number(thermalPrimary?selected.temperature:selected.stock)], [packages ? 'Cash after reservation (MYR)' : 'Cash (MYR)', number(packages ? selected.package_cash : selected.cash)], [packages ? 'Unserved units' : 'Backlog (h)', number(packages ? selected.unserved : selected.backlog)]] : [['Opening stock (units)', number(selected.opening)], ['Closing stock (units)', number(selected.stock)], ['Fulfilled units', number(selected.fulfilled)], ['Unserved units · evaluator only', number(selected.unserved)], ['Uncommitted cash (MYR)', number(selected.cash)], ['Receipts', selected.arrivals.length ? selected.arrivals.join(', ') : 'None']]));
      content.append(detail);
      const small = el('div', null, 'dv-resources');
      for (const metric of metrics.filter(m=>m.key!==primaryKey)) {
        if (!rows.some(r => finite(metric.get(r)))) continue;
        const card = el('article', null, 'dv-resource'); card.append(el('h5', metric.label), el('p', number(metric.get(selected)) + ' ' + metric.unit, 'dv-value'));
        card.append(chart([{name: metric.unit, points: rows.map((r, i) => ({x: i + 1, y: metric.get(r), label: r.date}))}], {title: metric.label, compact: true, selectedX: day + 1, zero: metric.key !== 'temperature', xTicks: [1, rows.length], xLabel: x => 'D' + x}));
        small.append(card);
      }
      if (small.childElementCount) content.append(compact ? disclosure('Other resource curves', [small]) : small);
      for (const event of list(options.events)) {
        const row = rows.find((r, i) => r.date === event.date || i === event.day);
        if (row) content.append(note((event.provenance || 'DECLARED ASSUMPTION') + ' · ' + row.date + ' · ' + event.title));
      }
      const caveats = [note('Resource curves keep their own units. Budgets and prior commitments carry forward. Shortages are evaluator outputs, not information supplied to a policy. A resource reservation does not establish completed service or payment.')];
      if (packages) caveats.push(note('Package output supplies daily stock, receipts and fulfilled units only. Package cash is a whole-plan post-reservation amount, not a measured daily cash trajectory. No daily staffing, fuel, energy or action schedule is inferred from the package ledger.'));
      if (result?.event_context) caveats.push(note('Public event backdrop: ' + result.event_context.title + '. Its selected arrival impact is hypothetical; actual company exposure is not established.'));
      content.append(compact ? disclosure('Metric definitions and limits', caveats) : el('div'));
      if (!compact) content.append(...caveats);
      const shownMetrics = metrics.filter(m => rows.some(r => finite(m.get(r))));
      content.append(dataTable('Exact seven-day trace values', ['Date', 'Action', 'Exact action ID', ...shownMetrics.map(m => m.label + ' (' + m.unit + ')'), 'Fulfilled', 'Unserved', 'Receipts'], rows.map(r => [r.date || 'Unavailable', r.action, r.original?.action_id || 'See original plan', ...shownMetrics.map(m => number(m.get(r), 6)), number(r.fulfilled, 6), number(r.unserved, 6), r.arrivals.join(', ') || 'None'])));
    }
    draw(); return root;
  }
  function search(host, data) {
    let traces;
    if (Array.isArray(data)) traces = data;
    else if (Array.isArray(data?.search_trace)) traces = data.search_trace;
    else traces = data?.root_actions ? [data] : [];
    const root = section(host, 'Selected-day root search');
    root.append(badge('SYNTHETIC MODEL SEARCH'));
    if (!traces.length) {
      root.append(note('The runtime exports aggregate search diagnostics only. Per-action visits and returns are unavailable, so no search tree is drawn.'));
      const diag = data?.policy_diagnostics || data?.counts || data;
      if (diag) root.append(facts([['Model transitions', number(diag.model_transitions)], ['Maximum decision depth', number(diag.maximum_tree_depth ?? diag.maximum_tree_decision_depth)]]));
      return root;
    }
    let active = 0;
    const toolbar = el('div', null, 'dv-toolbar');
    if (traces.length > 1) {
      const label = el('label', 'Decision day'), select = el('select'); select.setAttribute('aria-label', 'Search decision day');
      traces.forEach((t, i) => {const opt = el('option', t.date || 'Day ' + (i + 1)); opt.value = String(i); select.append(opt);});
      select.addEventListener('change', () => {active = Number(select.value); draw();}); label.append(select); toolbar.append(label);
    }
    root.append(toolbar); const content = el('div'); root.append(content);
    function draw() {
      content.replaceChildren();
      const trace = traces[active], raw = trace.search || trace.result || trace, rows = list(raw.root_actions);
      if (!rows.length) {content.append(note('No root-edge values were supplied for this decision.')); return;}
      const sorted = rows.slice().sort((a, b) => (b.visits || 0) - (a.visits || 0));
      const shown = sorted.slice(0, 4), n = shown.length, width = Math.max(640, n * 124), height = 224, selected = raw.action_id;
      const id = 'dv-search-' + (++chartSerial), svg = svgEl('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-labelledby': id + '-title ' + id + '-desc', class: 'dv-search-svg'});
      svg.append(svgEl('title', {id: id + '-title'}, 'Actual MCTS root action edges'));
      svg.append(svgEl('desc', {id: id + '-desc'}, 'Root connected to the four most-visited exported actions, or all if fewer. Edge width encodes visits. Exact values for every action are in the table. Chance branches are counts, not drawn invented nodes.'));
      const centre = width / 2;
      svg.append(svgEl('rect', {x: centre - 94, y: 8, width: 188, height: 45, rx: 2, class: 'dv-tree-root'}));
      svg.append(svgEl('text', {x: centre, y: 26, 'text-anchor': 'middle', class: 'dv-tree-root-label'}, 'CURRENT SIMULATED STATE'));
      svg.append(svgEl('text', {x: centre, y: 43, 'text-anchor': 'middle', class: 'dv-tree-root-label'}, number(raw.counts?.iterations ?? sum(Object.fromEntries(rows.map((r, i) => [i, r.visits]))), 0) + ' visits'));
      const max = Math.max(1, ...shown.map(r => r.visits || 0));
      shown.forEach((row, i) => {
        const x = (i + .5) * width / n, chosen = row.action_id === selected;
        svg.append(svgEl('path', {d: `M ${centre} 54 C ${centre} 80 ${x} 76 ${x} 112`, fill: 'none', class: 'dv-tree-edge', 'stroke-width': 1 + (row.visits || 0) / max * 4}));
        const box = svgEl('g'); box.append(svgEl('title', {}, words(row.action_id) + ': ' + number(row.visits, 0) + ' visits, mean modeled return ' + number(row.mean_model_return, 6) + ', ' + number(row.chance_branches, 0) + ' observation branches'));
        box.append(svgEl('rect', {x: x - 57, y: 112, width: 114, height: 90, rx: 2, class: chosen ? 'dv-tree-action dv-tree-chosen' : 'dv-tree-action'}));
        const lines = actionLabel(row.action_id).split(' · ');
        lines.slice(0, 3).forEach((line, j) => svg.append(svgEl('text', {x, y: 129 + j * 12, 'text-anchor': 'middle', class: 'dv-tree-label'}, line.length > 18 ? line.slice(0, 17) + '…' : line)));
        svg.append(svgEl('text', {x, y: 174, 'text-anchor': 'middle', class: 'dv-tree-label'}, number(row.visits, 0) + ' visits'));
        svg.append(svgEl('text', {x, y: 190, 'text-anchor': 'middle', class: 'dv-tree-label'}, 'Q ' + number(row.mean_model_return, 1)));
        if (chosen) svg.append(svgEl('text', {x, y: 218, 'text-anchor': 'middle', class: 'dv-tree-label'}, 'RECOMMENDED'));
      });
      const wrap = el('div', null, 'dv-search-wrap'); wrap.append(svg); content.append(wrap);
      content.append(el('p', 'Width = visits · Q = modeled return · ' + shown.length + '/' + rows.length + ' actions', 'dv-note'));
      content.append(disclosure('Search basis and limits', [facts([['Recommended action', words(selected)], ['Observed date', trace.observed_date || trace.date || 'Unavailable'], ['Inspection basis', trace.inspection_basis || 'Supplied actual MCTS root result'], ['Exported root actions', number(rows.length, 0)], ['Actual allocated nodes', number(raw.counts?.nodes, 0)], ['Maximum decision depth', number(raw.counts?.maximum_tree_decision_depth, 0)], ['Model transitions', number(raw.counts?.model_transitions, 0)], ['Search budget', number(raw.counts?.iterations, 0) + ' iterations']]), note('This is a recomputed selected-day root search where the runtime labels it as an inspection. Solid links are actual exported root edges. Width reflects visit count. Q is the mean modeled suffix return for that action, not confidence. Observation-history branches are counted in the table; deeper tree geometry is not exported and is not invented.')]));
      content.append(dataTable('Every exported MCTS root action', ['Action', 'Visits', 'Mean modeled return', 'Observation branches', 'Selected'], sorted.map(r => [words(r.action_id), number(r.visits, 0), number(r.mean_model_return, 6), number(r.chance_branches, 0), r.action_id === selected ? 'Yes' : 'No'])));
    }
    draw(); return root;
  }
  function pinnPanel(host, artifact) {
    const root = el('section', null, 'dv-subpanel'); root.append(el('h5', 'Physics-informed training evidence'));
    const rows = list(artifact?.training?.loss_history);
    if (!rows.length) {root.append(note('PINN loss checkpoints were not supplied. No illustrative loss curve is presented as measured training.')); host.append(root); return;}
    root.append(badge('ACTUAL TRAINING LOG · AUTHORED ODE'),note('Lower loss is better.'));
    root.append(chart([
      {name: 'Total loss', points: rows.map(r => ({x: r.step, y: r.total_loss}))},
      {name: 'Physics residual MSE', dashed: true, points: rows.map(r => ({x: r.step, y: r.physics_residual_mse}))}
    ], {title: 'Recorded PINN loss checkpoints', log: true, xTitle: 'Adam training steps', description: 'Recorded total loss and ODE-residual MSE on a logarithmic y-axis. These are actual saved training checkpoints for a synthetic scalar ODE.'}));
    root.append(disclosure('Loss definition and validation', [note('Loss definition: ' + (artifact.training.loss || 'Unavailable') + '. Synthetic sparse labels are exact ODE samples. This curve measures fit to an authored scalar equation, not company forecasting accuracy.'), facts([['Saved artifact', artifact.version || 'Unavailable'], ['Trainable parameters', number(artifact.architecture?.trainable_parameters, 0)], ['Off-grid validation points', number(artifact.validation?.heldout_midpoint_count, 0)], ['Off-grid decay RMSE', number(artifact.validation?.decay_rmse, 6)], ['ODE residual RMSE', number(artifact.validation?.ode_residual_rmse, 6)]]), note('Exact analytic RC remains the simpler, more accurate reference. The PINN has a bounded domain and exact fallback; no speed, operational-fidelity or planning advantage is established.')]));
    root.append(dataTable('Exact saved PINN checkpoints', ['Step', 'Total loss', 'Residual MSE', 'Sparse synthetic data MSE'], rows.map(r => [number(r.step, 0), finite(r.total_loss) ? r.total_loss.toExponential(6) : 'Unavailable', finite(r.physics_residual_mse) ? r.physics_residual_mse.toExponential(6) : 'Unavailable', finite(r.sparse_synthetic_data_mse) ? r.sparse_synthetic_data_mse.toExponential(6) : 'Unavailable'])));
    host.append(root);
  }
  function training(host, summary) {
    const root = section(host, 'Saved training checkpoints');
    const rows = list(summary?.training?.curves || summary?.curves);
    if (rows.length) {
      const seeds = [...new Set(rows.map(r => r.training_seed))].sort((a, b) => a - b), top = el('div', null, 'dv-toolbar');
      top.append(badge('ACTUAL Q-LEARNING LOG · SYNTHETIC ENVIRONMENT'));root.append(note('Higher return is better.'));
      const label = el('label', 'Training seed'), select = el('select'); select.setAttribute('aria-label', 'Q-learning training seed');
      seeds.forEach(seed => {const opt = el('option', String(seed)); opt.value = String(seed); select.append(opt);}); label.append(select); top.append(label); root.append(top);
      const content = el('div'); root.append(content);
      function draw() {
        const chosen = rows.filter(r => String(r.training_seed) === select.value).sort((a, b) => a.episodes - b.episodes);
        content.replaceChildren();
        content.append(chart([
          {name: 'Greedy validation mean return', points: chosen.map(r => ({x: r.episodes, y: r.greedy_validation_mean_return}))},
          {name: 'Exploratory training mean return', dashed: true, points: chosen.map(r => ({x: r.episodes, y: r.exploratory_mean_return}))}
        ], {title: 'Recorded Q-learning return checkpoints', xTitle: 'Training episodes', description: 'Actual saved checkpoints for the selected seed. Returns use synthetic reward coefficients. Validation return may rise or fall; it is not forecasting accuracy.'}));
        content.append(disclosure('Return definition and checkpoint details', [facts([['Measured checkpoint count', number(chosen.length, 0)], ['Final recorded episodes', number(chosen.at(-1)?.episodes, 0)], ['Final validation mean return', number(chosen.at(-1)?.greedy_validation_mean_return, 4)], ['Final validation fallback rate', finite(chosen.at(-1)?.validation_fallback_rate) ? number(chosen.at(-1).validation_fallback_rate * 100, 2) + '%' : 'Unavailable']]), note('Return definition: sum of declared synthetic rewards over a seven-day episode; higher is better under those coefficients. Exploratory behavior and greedy validation are different policies. Checkpoints reuse a diagnostic validation seed block and are not untouched external tests. Returns are not accuracy percentages.')]));
        content.append(dataTable('Exact Q-learning checkpoint values', ['Episodes', 'Exploratory mean return', 'Greedy validation mean return', 'Validation fallback rate', 'Visited states'], chosen.map(r => [number(r.episodes, 0), number(r.exploratory_mean_return, 6), number(r.greedy_validation_mean_return, 6), finite(r.validation_fallback_rate) ? number(r.validation_fallback_rate * 100, 4) + '%' : 'Unavailable', number(r.states, 0)])));
      }
      select.addEventListener('change', draw); draw();
    } else if (!(summary?.pinn || summary?.pinn_training_and_validation || summary?.thermal?.pinn_training_and_validation || summary?.training?.loss_history)) root.append(note('Q-learning checkpoints were not supplied. A daily accuracy or improvement curve is not inferred.'));
    const primary = list(Array.isArray(summary?.second_study?.summary) ? summary.second_study.summary : summary?.second_study?.summary?.policies).find(p => p.policy === 'trained_q_seed41');
    if (primary?.paired_reward_minus_heuristic) {
      const delta = primary.paired_reward_minus_heuristic;
      root.append(disclosure('Frozen policy comparison', [note('Saved heldout comparison: primary Q minus calibrated controller mean return ' + number(delta.mean, 4) + (Array.isArray(delta.approx_95pct_interval) ? '; approximate 95% interval ' + delta.approx_95pct_interval.map(v => number(v, 4)).join(' to ') : '') + '. Inspect the frozen evaluation separately; training loss alone does not establish policy superiority.')]));
    }
    const pinn = summary?.pinn || summary?.pinn_training_and_validation || summary?.thermal?.pinn_training_and_validation || (summary?.training?.loss_history ? summary : null);
    if (rows.length) {const pinned = el('div'); pinnPanel(pinned, pinn); root.append(disclosure('Saved PINN training', [pinned]));}
    else pinnPanel(root, pinn);
    return root;
  }
  function fromDatedObservations(observations, count = 60) {
    const bounded = Math.max(1, Math.min(60, Number.isInteger(count) ? count : 60));
    const thermal = list(observations?.thermal);
    return {data_mode: observations?.data_mode || 'UNKNOWN', observed_real_company_data: false, source_id: observations?.source_id,
      daily_accuracy_available: false, days: list(observations?.demand).slice(-bounded).map(row => {
        const matching = thermal.filter(t => t.date === row.date && finite(t.ending_temperature_c));
        return {date: row.date, fulfilled_units: row.fulfilled_units, censored: row.censored, thermal_rows: matching.length,
          mean_ending_temperature_c: matching.length ? matching.reduce((n, r) => n + r.ending_temperature_c, 0) / matching.length : null, daily_accuracy: null};
      })};
  }
  function replay(host, input) {
    const data = input?.replay || (Array.isArray(input?.demand) ? fromDatedObservations(input) : input) || {};
    const forecastRows = list(data.forecast_rows), errorProvenance = data.forecast_error_provenance;
    const errorSupported = errorProvenance?.mode === 'RETROSPECTIVE_PAST_ONLY_CALCULATION';
    const byDate = new Map(forecastRows.map(row => [row.date, row]));
    const sourceRows = list(data.days).length ? data.days : list(data.rows);
    const rows = sourceRows.slice(-60).map(row => {
      const forecast = errorSupported ? byDate.get(row.date) || row : {};
      return {...row, fulfilled_units: row.fulfilled_units ?? row.actual_units,
        forecast_units: forecast.forecast_units, baseline_forecast_units: forecast.baseline_forecast_units,
        absolute_error_units: row.censored ? null : forecast.absolute_error_units,
        baseline_absolute_error_units: row.censored ? null : forecast.baseline_absolute_error_units,
        forecast_calibration_version: forecast.calibration_version, forecast_latest_training_date: forecast.latest_training_date};
    });
    const hasErrors = errorSupported && rows.some(r => !r.censored && finite(r.absolute_error_units));
    const root = section(host, '60-day synthetic replay');
    root.append(badge(hasErrors ? 'RETROSPECTIVE SYNTHETIC ERRORS' : 'SYNTHETIC ONLY'));if(hasErrors)root.append(note('Lower error is better.'));
    if (data.data_mode !== 'SYNTHETIC_INTERNAL' || data.observed_real_company_data === true) {
      root.append(note('This synthetic-replay renderer requires explicit SYNTHETIC_INTERNAL provenance. Unsupported data is not relabeled.')); return root;
    }
    if (!rows.length) {root.append(note('No dated synthetic records were supplied. No history is generated by this view.')); return root;}
    let selected = rows.length - 1, metric = hasErrors ? 'absolute_error_units' : 'fulfilled_units';
    const top = el('div', null, 'dv-toolbar'), metricLabel = el('label', 'Metric'), select = el('select'); select.setAttribute('aria-label', 'Synthetic history metric');
    for (const [key, text] of [...(hasErrors ? [['absolute_error_units', 'Absolute error (units, retrospective)']] : []), ['fulfilled_units', 'Sales (units/day)'], ['mean_ending_temperature_c', 'Thermometer (°C)'], ...(list(data.fit_history).length ? [['demand_innovation_rmse_log_units', 'Demand fit RMSE (log units, in-sample)'], ['thermal_training_rmse_c', 'Thermal fit RMSE (°C, in-sample)']] : [])]) {const opt = el('option', text); opt.value = key; select.append(opt);}
    select.value = metric;
    metricLabel.append(select); top.append(metricLabel, el('span', rows[0].date + '–' + rows.at(-1).date + ' · ' + rows.length + ' days', 'dv-note')); root.append(top);
    const content = el('div'); root.append(content);
    function draw() {
      content.replaceChildren(); const isSales = metric === 'fulfilled_units', isError = metric === 'absolute_error_units', isFit = metric.endsWith('rmse_log_units') || metric === 'thermal_training_rmse_c', row = rows[selected];
      const names = {absolute_error_units: 'Past-only absolute error (units)', fulfilled_units: 'Fulfilled units', mean_ending_temperature_c: 'Mean thermometer (°C)', demand_innovation_rmse_log_units: 'Demand RMSE (log units, in-sample)', thermal_training_rmse_c: 'Thermal RMSE (°C, in-sample)'};
      const fitByDate = new Map(list(data.fit_history).map(fit => [fit.as_of?.slice(0, 10), fit]));
      const chartData = rows.map((r, i) => ({x: i, y: isFit ? fitByDate.get(r.date)?.[metric] : r[metric], label: r.date, censored: isSales && r.censored}));
      const measuredIndices = chartData.filter(p => finite(p.y)).map(p => p.x), firstX = measuredIndices[0] ?? 0, lastX = measuredIndices.at(-1) ?? rows.length - 1;
      const chartSeries = [{name: names[metric], points: chartData}];
      if (isError && rows.some(r => finite(r.baseline_absolute_error_units))) chartSeries.push({name: 'Baseline error (units)', dashed: true, points: rows.map((r, i) => ({x: i, y: r.baseline_absolute_error_units, label: r.date}))});
      content.append(chart(chartSeries, {title: isFit ? 'Saved rolling-fit residual checkpoints' : isError ? 'New retrospective past-only synthetic error calculation' : 'Supplied ' + rows.length + '-day synthetic observation replay', selectedX: selected, zero: isSales || isFit || isError, xTicks: [firstX, Math.floor((firstX + lastX) / 2), lastX], xLabel: x => rows[Math.round(x)]?.date?.slice(5) || ''}));
      const controls = el('div', null, 'dv-replay-controls');
      function step(delta, selector) {selected = Math.max(0, Math.min(rows.length - 1, selected + delta)); draw(); const target = content.querySelector(selector); (target?.disabled ? content.querySelector('input[type=range]') : target)?.focus({preventScroll: true});}
      const previous = button('Previous', () => step(-1, '[data-replay-step=previous]')), next = button('Next', () => step(1, '[data-replay-step=next]')); previous.dataset.replayStep = 'previous'; next.dataset.replayStep = 'next'; previous.disabled = selected === 0; next.disabled = selected === rows.length - 1;
      const label = el('label', 'Inspect day'), range = el('input'); range.type = 'range'; range.min = '0'; range.max = String(rows.length - 1); range.step = '1'; range.value = String(selected); range.setAttribute('aria-label', 'Replay day'); range.setAttribute('aria-valuetext', row.date);
      range.addEventListener('input', () => {selected = Number(range.value); updateSelected();}); label.append(range);
      const output = el('p', row.date, 'dv-selected-date'); output.setAttribute('aria-live', 'polite'); controls.append(previous, label, next); content.append(controls, output);
      const detail = el('div', null, 'dv-day-detail'); content.append(detail);
      function updateSelected() {
        const r = rows[selected]; range.setAttribute('aria-valuetext', r.date); output.textContent = r.date; previous.disabled = selected === 0; next.disabled = selected === rows.length - 1;
        const fit = fitByDate.get(r.date);
        detail.replaceChildren(facts(isError ? [['Error (units)', number(r.absolute_error_units, 4)], ['Baseline error (units)', number(r.baseline_absolute_error_units, 4)], ['Censored', r.censored ? 'Yes · excluded' : 'No']] : isFit ? [['Fit as-of', fit?.as_of?.slice(0, 10) || 'Not supplied'], [metric === 'thermal_training_rmse_c' ? 'RMSE (°C)' : 'RMSE (log units)', number(fit?.[metric], 6)], ['Forecast error (units)', hasErrors ? number(r.absolute_error_units, 4) + ' · retrospective' : 'Unavailable']] : isSales ? [['Sales (units)', number(r.fulfilled_units, 4)], ['Censored', r.censored ? 'Yes' : 'No'], ['Forecast error (units)', hasErrors ? number(r.absolute_error_units, 4) + ' · retrospective' : 'Unavailable']] : [['Thermometer (°C)', number(r.mean_ending_temperature_c, 4)], ['Rows', number(r.thermal_rows, 0)], ['Forecast error (units)', hasErrors ? number(r.absolute_error_units, 4) + ' · retrospective' : 'Unavailable']]));
        const line = content.querySelector('.dv-selected-line');
        const chartPoints = rows.map((x, i) => finite(isFit ? fitByDate.get(x.date)?.[metric] : x[metric]) ? i : null).filter(finite);
        if (line && chartPoints.length) {const low = Math.min(...chartPoints), high = Math.max(...chartPoints), x = 110 + (selected - low) / Math.max(1, high - low) * 605; line.setAttribute('x1', String(x)); line.setAttribute('x2', String(x)); line.setAttribute('visibility', selected < low || selected > high ? 'hidden' : 'visible');}
      }
      updateSelected();
      content.append(disclosure('Definitions and provenance', [note('Existing authored dates, not observed MR D.I.Y. operating history. This view replays supplied records; it does not claim a live feed or two months of deployed learning.'), note(isError ? 'Metric definition: supplied absolute forecast error in units, newly calculated with a past-only model on dated synthetic records. Dashed values are the supplied baseline errors on the same uncensored days. Missing or censored errors stay missing; this is not recorded historical deployment accuracy.' : isSales ? 'Metric definition: recorded authored fulfilled sales. Hollow points mark capacity-censored days; latent demand is not reconstructed from them.' : isFit ? 'Metric definition: actual saved fit residual from the rolling-window artifact at its replay as-of date. It is an in-sample fitting diagnostic, not an out-of-sample accuracy result or a claim of training on that calendar day. No fit is invented for gaps.' : 'Metric definition: arithmetic mean of independent synthetic ending-thermometer observations on the date. This is not a continuously tracked company room temperature.'), note(hasErrors ? 'Original records contain no historical deployment score. Newly supplied retrospective errors are shown with their separate protocol. Repeated fitting on this known synthetic dataset is not an untouched external evaluation or daily Q/PINN retraining.' : data.daily_accuracy_unavailable_reason || 'Daily forecast error is unavailable: this window has no exported paired pre-release daily forecasts and uncensored outcomes. No error trend is invented. Refitting can worsen performance; consumed holdout dates cannot remain an untouched test.'), note('Source: ' + (data.source_id || 'Source identifier unavailable') + '. Existing record values are retained. Calendar dates belong to the authored replay, not to deployed training or real operations.')]));
      if (hasErrors) content.append(disclosure('Retrospective error protocol', [note(errorProvenance.description || 'These error values were newly calculated from past-only dated synthetic records. They are retrospective diagnostics, not saved historical deployment accuracy. Absolute error is the supplied absolute forecast-minus-uncensored-outcome difference in units. Censored days are excluded. No daily retraining of frozen Q or PINN weights is implied.'), dataTable('Forecast inputs and errors', ['Date', 'Past-only forecast', 'Authored outcome', 'Absolute error', 'Baseline forecast', 'Baseline error', 'Censored', 'Latest fitted date', 'Model version'], rows.map(r => [r.date, number(r.forecast_units, 6), number(r.fulfilled_units, 6), number(r.absolute_error_units, 6), number(r.baseline_forecast_units, 6), number(r.baseline_absolute_error_units, 6), r.censored ? 'Yes' : 'No', r.forecast_latest_training_date || 'Unavailable', r.forecast_calibration_version || 'Unavailable']))]));
      content.append(dataTable('Exact replay records', ['Date', 'Fulfilled units', 'Censored', 'Mean thermometer °C', 'Thermal rows', 'Retrospective error units'], rows.map(r => [r.date, number(r.fulfilled_units, 6), r.censored ? 'Yes' : 'No', number(r.mean_ending_temperature_c, 6), number(r.thermal_rows, 0), hasErrors ? number(r.absolute_error_units, 6) : 'Unavailable'])));
      if (list(data.fit_history).length) content.append(dataTable('Saved fit artifacts', ['Replay as-of', 'Version', 'Window start', 'Latest fitted date', 'Demand innovation RMSE (log units)', 'Thermal fit RMSE °C', 'Holdout rows used'], data.fit_history.map(f => [f.as_of, f.version, f.window_start, f.latest_training_date, number(f.demand_innovation_rmse_log_units, 6), number(f.thermal_training_rmse_c, 6), number(f.holdout_rows_used, 0)])));
    }
    select.addEventListener('change', () => {metric = select.value; draw();}); draw(); return root;
  }
  function dynamics(host, result) {
    const root = section(host, 'Simulator state');
    const traceHost = el('div'); root.append(traceHost); timeline(traceHost, result?.coupled || result, {title: 'Seven-day temperature trace',primaryMetric:'temperature'});
    const thermal = result?.thermal;
    if (thermal) root.append(disclosure('RC / PINN comparison', [facts([['PINN artifact', thermal.pinn_artifact_version || 'Unavailable'], ['Neural workday segments', number(thermal.neural_workday_segment_calls, 0)], ['Exact workday segments', number(thermal.exact_workday_segment_calls, 0)], ['Max daily mean RC / PINN difference (°C)', number(thermal.maximum_daily_mean_temperature_error_c, 6)]]), note('Actual supplied solver output under a fixed authored schedule. This simplified synthetic simulator is not a validated company digital twin. Exact analytic RC is the reference; the nonzero PINN difference is retained at six decimal places.')]));
    const pinned = el('div'); pinnPanel(pinned, thermal?.pinn_training_and_validation || result?.pinn_training_and_validation); root.append(disclosure('Saved PINN training', [pinned]));
    return root;
  }
  global.DormathonVisuals = Object.freeze({timeline, search, training, replay, dynamics, fromDatedObservations, trajectoryRows, packageRows, version: 'dormathon.visual-evidence.v1'});
})(typeof window === 'undefined' ? globalThis : window);
