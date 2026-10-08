/** Same-origin local API. Browser forms never accept or store provider credentials. */
export class ApiError extends Error {
  constructor(message, status, payload) { super(message); this.name = 'ApiError'; this.status = status; this.payload = payload; }
}
export async function request(path, data, method = 'POST') {
  const options = { headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (data !== undefined) {
    options.method = method;
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
    if (new TextEncoder().encode(options.body).length > 2 * 1024 * 1024) throw new ApiError('提交内容超过站点接口的 2 MiB 限制，请拆分文件。', 413, {});
  }
  let response;
  try { response = await fetch(path, options); } catch { throw new ApiError('无法连接私人站点服务。请确认服务运行后重试。', 0, {}); }
  let payload;
  try { payload = await response.json(); } catch { throw new ApiError('服务没有返回可读取的 JSON 响应。', response.status, {}); }
  if (!response.ok) throw new ApiError(payload.message || payload.error || `请求失败（${response.status}）`, response.status, payload);
  return payload;
}
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function safeURL(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') { if (cell) throw new Error('CSV 引号前存在未转义内容。'); quoted = true; }
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(v => v !== '')) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('CSV 中有未闭合的双引号。');
  if (cell || row.length) { row.push(cell); if (row.some(v => v !== '')) rows.push(row); }
  if (!rows.length) throw new Error('文件为空。');
  const headers = rows.shift().map(s => s.trim());
  if (headers.some(s => !s)) throw new Error('CSV 表头包含空字段。');
  if (new Set(headers).size !== headers.length) throw new Error('CSV 表头包含重复字段。');
  const records = rows.map((r, i) => { if (r.length !== headers.length) throw new Error(`第 ${i + 2} 行有 ${r.length} 列，应为 ${headers.length} 列。`); return Object.fromEntries(headers.map((h, j) => [h, r[j]])); });
  return { headers, records };
}
export function parseImport(text, format) {
  if (format === 'csv') return parseCSV(text);
  const parsed = JSON.parse(text); const records = Array.isArray(parsed) ? parsed : parsed?.records;
  if (!Array.isArray(records)) throw new Error('JSON 应为记录数组，或包含 records 数组的对象。');
  if (records.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('每条记录都应为字段对象。');
  return { headers: [...new Set(records.flatMap(r => Object.keys(r)))], records };
}
export function formatValue(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '未提供';
  if (typeof value === 'number') return Number.isFinite(value) ? new Intl.NumberFormat('zh-CN', {maximumFractionDigits:digits}).format(value) : '未提供';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
