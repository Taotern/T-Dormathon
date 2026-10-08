# Unified GDP acquisition and exact reproduction

This small source-only extension supplies one entrypoint for all seven fixed World Bank GDP slices: 1990–1994, 1995–1999, 2000–2004, 2005–2009, 2010–2014, 2015–2019 and 2020–2026. The recent request actually returned through 2025. The adapter is the exact accepted v0.9 file, SHA256 `c1af66ad7b440184f1fa2724681495f57749c2a2e156e459fd894361e0aefc3c`; no existing source policy or data package is replaced.

Python 3 and Node 24 suffice. No packages, accounts, keys, service or Site write are required.

## Acquire a fixed scope

```sh
python run.py routes
python run.py acquire --data-dir /path/to/new-acquisition --metadata
python run.py acquire --data-dir /path/to/new-acquisition --slice wb_gdp_1995_1999 --slice wb_gdp_2000_2004
```

Acquisition permits at most two explicitly chosen requests per invocation. The hostname, indicator, exact URI and seven period ranges are fixed; arbitrary URLs/year ranges and duplicate scopes are rejected. Metadata is two reads within the same limit. Each attempt is written before requesting, redirects are rejected, the Linux overall deadline is 30 seconds and the licensed body cap is 2 MiB. Repeating an existing named attempt reads its result without another request. Access denials stay locked for review; rate limits retain actual Retry-After and cooldown. There are no automatic retries. Fresh acquisitions remain raw source inputs awaiting source-specific projection/admission; they are never mislabeled with an older accepted manifest pin.

This delivered extension made zero provider requests. Its simulated HTTP tests are explicitly offline and are not acquisition evidence. Windows acquisition and OS scheduling remain unverified.

## Reproduce every accepted historical chunk offline

Extract the separately supplied external-data artifacts for v0.9.1, v0.10.0 and v0.11.0 into three data directories. The v0.9.1 packaging includes the original acquisition receipts required for separate code/data storage. Use their retained root folders as inputs:

```sh
python run.py reproduce \
  --input-root /path/to/foundation/Dormathon-History-GDP \
  --input-root /path/to/middle/Dormathon-History-GDP-Middle \
  --input-root /path/to/completion/Dormathon-History-GDP-Completion \
  --output-dir /path/to/derived-output
```

The single shared adapter reads all seven retained responses, their immutable witnesses and exact source policies. It verifies original manifest/policy/body/dimension digests, rejects unknown or duplicate groups and conflicting/overlapping observations, and reconstructs each group's original chunk names/bytes. All 111 original chunk hashes reproduce exactly: 9,540 unique observations covering every year 1990–2025. The original three admission pins remain separate and unchanged; the output report is derived evidence rather than a replacement admission manifest.

One or two provided groups may also be reproduced independently. The report explicitly lists unloaded groups and actual reproduced years; a partial input set does not claim full historical coverage. Full input coverage has 177 provider-defined economies numeric in all 36 years. Source nulls, current-USD units, annual labels and provider vintage remain unchanged. Reporting economies/current classifications are not historical sovereign borders or incident locations.

## Offline checks

```sh
DORMATHON_GDP_TEST_INPUT_ROOTS='["/path/to/foundation","/path/to/middle","/path/to/completion"]' python test-offline.py
```

Twelve checks cover route substitution, request budgets, existing/denied attempt outcomes, access/rate locks, durable pre-request receipts, actual Retry-After handling and full exact reconstruction including twelve retained real rows. No provider or Site request occurs. Raw responses, reconstructed chunks and detailed reports remain in external artifact/runtime directories; this package contains only code, registry, small fixtures and digest/test evidence.

Primary rights: [World Bank GDP indicator CC BY4.0](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD), [dataset terms](https://data.worldbank.org/summary-terms-of-use). Preserve World Bank and original provider attribution, normalization disclosure and no endorsement. Autonomous scheduling and fresh-source admission remain separate operational gates.
