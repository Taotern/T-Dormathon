/** Versioned point-baseline engine. Never silently fills missing history. */
export const ENGINE_VERSION = 'dormathon.sales-engine.0.4.1';
const DAY = 86400000;
const parseDay = d => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? '')) return null;
  const t = Date.parse(d + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0,10) === d ? t : null;
};
const dateAfter = (d, h) => new Date(parseDay(d) + h * DAY).toISOString().slice(0, 10);
export function forecast(request) {
  const out = {
    schema_version: 'dormathon.forecast.v1', engine_version: ENGINE_VERSION,
    org_id: request.org_id ?? null, brand_scope: request.brand_scope ?? null,
    scenarioDataMode: request.scenarioDataMode ?? null, provenance_refs: request.provenance_refs ?? [],
    assumption_set_id: request.assumption_set_id ?? null, request_id: request.request_id ?? 'local-forecast',
    input_refs: request.input_refs ?? [], knowledge_as_of: request.knowledge_as_of ?? null,
    world_time: request.world_time ?? null, knowledge_mode: request.knowledge_mode ?? null,
    data_revision: request.data_revision ?? null, delivery_mode: 'live_local_calculation',
    status: 'insufficient_data', warnings: [], item_id: request.item_id ?? null,
    target_definition: 'Daily positive item transaction sales, units; demand proxy',
    horizon: request.horizon ?? 7, prediction_type: 'point', uncertainty: null,
    uncertainty_reason: 'Point baseline; no calibrated prediction intervals', forecasts: []
  };
  const fail = reason => { out.warnings.push(reason); return out; };
  if (!['SYNTHETIC_INTERNAL', 'EXTERNAL_BENCHMARK'].includes(out.scenarioDataMode)) return fail('Explicit dataset mode required.');
  if (!out.org_id || !out.item_id || !out.assumption_set_id) return fail('Stable organization/item and assumption-set references required.');
  if (out.horizon !== 7) return fail('This engine contract supports exactly seven daily horizons.');
  const model = request.model ?? 'moving_average_28';
  if (!['seasonal_naive_7', 'moving_average_28'].includes(model)) { out.status = 'unsupported'; return fail('Use one of the evaluated point baselines. Bounded ridge is available only through the separately trained benchmark artifact.'); }
  const input = request.history;
  if (!Array.isArray(input) || input.length < 28) return fail('At least 28 complete calendar days of history required.');
  const cutoffDate = out.knowledge_as_of?.slice(0, 10);
  if (parseDay(cutoffDate) === null || Number.isNaN(Date.parse(out.knowledge_as_of))) return fail('Valid knowledge_as_of timestamp required.');
  const seen = new Set(); let last = null;
  for (const r of input) {
    const date = parseDay(r.date);
    if (date === null || seen.has(r.date) || (last !== null && date <= last)) return fail('History dates must be valid, unique and strictly chronological.');
    if (r.date > cutoffDate) return fail('Future history exceeds knowledge cutoff.');
    if (r.date === cutoffDate && !/T23:59:59/.test(out.knowledge_as_of) && r.complete_day !== true) return fail('Current partial day is not a complete history label.');
    if (r.available_at && (Number.isNaN(Date.parse(r.available_at)) || Date.parse(r.available_at) > Date.parse(out.knowledge_as_of))) return fail('A history label was unavailable at the knowledge cutoff.');
    seen.add(r.date); last = date;
  }
  const history = input.slice(-28);
  for (let i = 0; i < history.length; i++) {
    const r = history[i];
    if (!['observed', 'source_declared_complete'].includes(r.observation_status)) return fail('Unknown observation date remains missing; no zero fill is permitted.');
    if (!Number.isFinite(r.positive_sales) || r.positive_sales < 0) return fail('Positive-sales labels must be finite, nonnegative units.');
    if (i && parseDay(r.date) - parseDay(history[i - 1].date) !== DAY) return fail('History must cover consecutive calendar days; a missing date is not zero sales.');
  }
  out.training_cutoff = history.at(-1).date;
  out.model_version = ENGINE_VERSION + ':' + model;
  out.model = model;
  const mean = history.reduce((s, r) => s + r.positive_sales, 0) / 28;
  out.forecasts = Array.from({length: 7}, (_, i) => ({date: dateAfter(out.training_cutoff, i + 1), horizon: i + 1, predicted_units: model === 'seasonal_naive_7' ? history[21 + i].positive_sales : mean}));
  out.status = 'ok';
  if (out.scenarioDataMode === 'SYNTHETIC_INTERNAL') out.warnings.push('Synthetic company sequence demonstrates mechanics only; external benchmark accuracy does not transfer.');
  out.warnings.push('Recorded sales may be demand-censored; no latent-demand, stockout, delivery or savings claim.');
  return out;
}
