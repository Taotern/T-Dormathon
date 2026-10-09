# Source-shaped information types

Policy `source-shaped-information-types-v1` derives one primary type from the registered source's material kind or an explicit approved source-adapter scope. It does not rewrite immutable metadata, change evidence hashes, infer causality, or classify article meaning with an LLM. Secondary facets are links to the same record, not duplicated rows.

| Primary type | Working view | Current source scope |
| --- | --- | --- |
| `reference` | 基础资料 | Source-qualified entity/area/political-organization identities; embedded filing references remain secondary |
| `observation` | 状态与数值 | Native statistics, prices and states, preserving units, scaling, periods, regions, modeled/estimated values and nulls |
| `event` | 事件与变化 | Source-reported hazards, warning issuance, official announcements, legal publications and procedural cases; underlying occurrence, implementation and effects remain separately unverified |
| `interpretation` | 解释与预期 | News/press/speech metadata with fact/opinion unknown; explicit forward forecasts and warning metadata lacking an issuance fact |
| `unknown` | 待分类 | Insufficient typed source metadata; never silently removed from common search |

METMalaysia's structured forecast has primary interpretation and a secondary numerical-observation facet, with `forecast=true`. It does not report observed weather. A MET warning with a nonempty source `facts.warning_issue.issued` has primary event / source-reported warning issuance and secondary interpretation; it does not prove a forecast hazard occurred. A release timestamp establishes publication, not policy implementation. Legal instrument years, publication/effective dates and current legal effect stay distinct. Source-issued notice labels do not establish business outcomes. Source licensing and uploaded-unverified origin remain independent of these information types.

## Read API

`GET /api/global/types` returns primary-type counts across the complete current saved corpus. Source snapshot coverage and the separate outcome layer are not inferred from those counts.

`GET /api/global/items?information_type=observation&limit=50` filters on the server before paging. Existing source, origin, reporting-jurisdiction, first-seen date and statistical-observation period controls can be combined. Browse cursors retain the existing numeric offset contract; this is current-record browsing, not an immutable historical snapshot.

`POST /api/global/search` accepts `information_type` alongside the existing lexical query and filters. For example:

```js
const filters = {
  query: 'Malaysia', information_type: 'observation', limit: 20,
  observation_grain: 'year', observation_from: '2020', observation_to: '2025'
};
const first = await fetch('/api/global/search', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(filters)
}).then(r => r.json());
if (first.next_cursor) {
  const next = await fetch('/api/global/search', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...filters, cursor: first.next_cursor})
  }).then(r => r.json());
}
```

Lexical search cursors bind the query, filters and page size. Changing them rejects a cursor. Paging is over the current search corpus, with a stable ID tie-break, and is not advertised as a frozen ranking while new data is admitted. The immutable document-export watermark contract remains separate.

Each browse/search/evidence/document envelope adds `information_type` with policy, primary, secondary, facet and source basis. It retains the original immutable version/content hash and origin. The common all-record route and unknown-type route stay usable. History actor/outcome trajectories are accessed as their own workflow from the event workspace; CVD171 is not added to the intelligence type totals.

## Verified saved-corpus coverage before this release

The complete retained 51,471 current records reconcile to reference12,872; observation37,727; event754; interpretation118; unknown0. These are information-grain counts, not every-country, every-entity or every-domain coverage. The underlying corpus remains369 direct +114 uploaded-unverified +50,988 reviewed snapshots. Source periods, acquisition clocks and source-qualified geography are still separate; fine event-time, forecast-validity and current legal-effect filtering are not implied by the statistical-period controls.

The independent source review reused all saved source bodies without provider or Site requests. Its accepted classifier SHA256 is `d3e3979a5cc79d5334ed6bddeec3b9e3c263df115384fd164b428eca47a24bd7`; full saved counts were unaffected by the separately checked SQL whitespace-presence correction. Windows/unattended operation and automatic synchronization remain unverified.
