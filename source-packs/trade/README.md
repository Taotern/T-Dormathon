# World Bank TTBD safeguard-case pilot v0.17

This separate candidate provides historical international trade-remedy case facts. It does not change any accepted legal/GDP/labor/FX batch. The [official TTBD landing](https://www.worldbank.org/en/data/interactive/2021/03/02/temporary-trade-barriers-database) links the acquired safeguard ZIP and generic codebook. Both succeeded once; a third bounded read verified the exact catalog licensing page. No WTO/UNCTAD denied route, extra authentication or paid service was used.

## Useful coverage

The source workbook has 459 master rows and 458 distinct case IDs, with source `WTO_INIT_DATE` Excel date cells spanning 1995-03-29 through 2024-12-31. This component's actual raw history differs from the overall TTBD landing's broader 1980s description. The projection selects the 2020–2024 window: 61 candidates, 60 unambiguous case identities, 16 implementing-country/group labels. Cases cover China, Malaysia, India, Indonesia, EU, several African/Middle Eastern/Latin American jurisdictions and others. The exact labels and per-year counts are in the coverage matrix. Historical/state/group labels are preserved; they are not automatically ISO countries or today's political identities.

Examples include Malaysia ceramic tiles, China bovine meat, India PVC resins, Indonesia carpets, EU alloying elements and Madagascar flour. Product spellings, original HS scalar/digits/subset values and supplied measure/unit fields are retained. No missing leading zeros, HS vintage, ad-valorem interpretation, currency conversion, company exposure or customs applicability is invented.

Related product rows are capped at24 per case, final-measure rows at12, quota rows at12 and exemption rows at24. Every matched/retained count and truncation flag remains explicit. In this selected window,391 product rows and292 final-measure rows are retained; four product and11 measure groups hit a cap. Empty related tables do not prove that no exemptions, quotas or measures exist.

The workbook's `V_NUMBER` is Q4_2024; the current landing is dated March2025. The catalog's licence metadata is older and its1980/2011 temporal field is stale. No2025–2026/current monitoring or continuous every-country trade-policy archive is claimed. Some unexported notes contain2025 references despite the vintage label; they are not converted into current events.

## Rights and source uncertainties

An actual HTTP200 [Dataset0039583 catalog response](https://datacatalog.worldbank.org/search/dataset/0039583/temporary-trade-barriers-database-including-the-global-antidumping-database) declares Creative Commons Attribution4.0 and explicitly lists the same current TTBD landing as a dataset distribution. That landing links this exact safeguard asset. This documented dataset licence chain supports structured-data reuse, with source/author/licence attribution and clear normalization; no contrary archive-specific licence was found. The generic World Bank website terms have different default restrictions, so they are not treated as a blanket data licence. Exact catalog response and licence-projection hashes are retained. Original landing response bytes were not retained; its link was inspected with the official web reader and its body digest stays unknown.

The codebook actually downloaded describes antidumping variables. It does not establish all safeguard-stage definitions. Therefore every date stage keeps its original column name, raw Excel value or text marker, source cell kind and nullable day value. Labels such as P_DATE/F_DATE are not silently interpreted as confirmed current legal effect. Dots, MI, IF and empty cells remain distinct source values. Publication/update/incident instants and binding/current effectiveness stay unknown. Supplied WTO document-reference strings remain source evidence references; linked WTO/national legal bodies were not fetched.

The global master-ID check runs before time selection. THA-SG-5 is reused for conflicting2020 aluminium-foil and2016 structural H-beam records. Both original row witnesses are preserved separately in the quarantine report, and all related rows under that identity are excluded. The sole selected Thai case is therefore a declared gap. There is no generated suffix, latest-row choice or guessed attachment.

NOTES, author/contact/person fields and article/legal bodies are excluded from every portable safe payload and normalized product record. This component supplies no firm identities in the exported schema. The original ZIP/XLS/catalog bodies remain research-side only; their digests are distinct from the portable safe-data digests.

## Portable collection and replay

Python3 and Node18+ suffice for saved-payload replay. Original XLS extraction additionally needs the existing `xlrd` reader; source workbook formulas/macros are never executed and no workbook is edited.

`python run-slice.py routes`

`python run-slice.py test`

`python run-slice.py reproduce --data-dir /absolute/path/Dormathon-Trade-Data`

The last command verifies the paired policies, safe payload and all five original chunk hashes, then recreates exactly60 records without network. Tests use six independently extracted original worksheet examples and28 boundaries. Runtime test reports go into data-local or `DORMATHON_TRADE_REPORT_DIR` so source assets stay unchanged.

For a separately authorized fresh acquisition, set `DORMATHON_TRADE_DATA_DIR` to a separate runtime directory and explicitly invoke `acquire-fixed.py codebook` / `acquire-fixed.py safeguards`. Only two hardcoded official file routes are accepted, with30-second Linux overall deadlines,2MiB body caps, no redirects/retries and recorded attempts before requests. Existing attempts return their original outcomes. Denials/rate limits stop further provider requests until review. `read-catalog-rights.py` is a separate single exact rights-page read. Do not repeat these reads to import or test this retained batch.

`extract-safe.py` checks the exact BIFF worksheet headers,8MiB decoded member cap, global ID conflicts and date-cell types before selecting/joining/capping rows. New archive schemas/vintages, changed conflict identity or licence chains require new reviewed contracts. This current fixed archival export path is deterministic; source discovery, unattended OS scheduling, Windows and automatic Site sync are unverified. Raw files, safe full payloads and normalized chunks stay outside Git; small code, contracts, licences, receipts and fixtures remain portable.

Core can use the pure `readEnvelope` / `project` / `validateTradeCase` / `semanticPayload` exports. Policy facts and retrieval leaves are explicit. Only acquisition clocks are excluded from semantic content; source date stages, vintage, units, raw values and caps remain meaningful revision data. Normalized `record_kind=trade_remedy_case` is a case snapshot, not an incident or newly effective law. Source-qualified implementing jurisdiction, product and source document references are separate from publisher, operating location and affected-company evidence. Site admission must get its own reviewed manifest pin.
