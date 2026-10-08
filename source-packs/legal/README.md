# UK / US legal-publication pilot v0.16

This is a separate, disabled candidate for the existing Dormathon intelligence product. Four fixed official metadata-page acquisitions succeeded once each on 8 October 2026. No Site intake or recurring operation is claimed by this package.

The useful coverage is jurisdiction- and clock-specific:

- **UK:** the recent Atom page has 20 website publications from 2–8 October, across UK, Scottish, Welsh and Northern Ireland instrument families. Two entries are correction-slip resources for instruments from 2010 and 2025. They retain their own source resource IDs and separate related instrument IDs. The historical listing returns all 29 currently matching UK Public General Act records for instrument-year 2020. It does not reconstruct all original/revised legal text or enactment timelines. One record's website publication is in 2024 despite its instrument-year 2020.
- **US:** the latest 100 returned rules, proposed rules and notices are all dated 8 October. They are one capped page out of 605 matching records for 1–8 October. Another 100 records dated 6–7 January 2020 are one capped page out of 306 matching records for 1–7 January. The underlying Federal Register publication date is date-only: normalized `published_at` remains null. Supplied effective and comment-close dates are independent date-only facts. Presidential documents were excluded from the selected query.

Publisher countries and source jurisdiction systems are GB and US. UK instrument families do not establish territorial extent. US issuing agencies and their supplied parent/CFR/docket/RIN references do not establish effects on a company, operating location or another country. All occurrence clocks and event geography remain unknown; no binding, in-force, applicability or risk conclusion is generated. Archive availability (UK primary from 1988 / secondary from 1987 with limitations; US documented from 1994) is distinct from these four acquired pages. Continuous history has not been collected.

## Rights and content

The [UK publisher's licensing documentation](https://legislation.github.io/data-documentation/reuse-licence.html) explicitly permits commercial and noncommercial reuse under OGL v3 with attribution. This pilot excludes EU-origin and pre1987 Westlaw content. Its feed requests follow the observed five-second [robots crawl delay](https://www.legislation.gov.uk/robots.txt) and use a legitimate named research user agent. A contact address is recommended by the provider; none is fabricated. The standalone official OGL URL returned403 in the web tool; no retry or bypass was attempted. The publisher's exact scope documentation was accessible.

The [NARA Federal Register reuse statement](https://www.archives.gov/federal-register/the-federal-register/about.html) permits reproduction; the [Library of Congress collection notice](https://www.loc.gov/collections/federal-register/about-this-collection/rights-and-access/) flags possible third-party reprints. This package limits product content to titles and structured publication metadata. FederalRegister.gov is an unofficial informational rendition; linked govinfo PDFs are supplied evidence links and were not fetched or independently authenticated here.

Abstracts, summaries, author/contact fields, linked legal text and PDF bodies are excluded from all portable payloads, normalized facts and retrieval text. The actual original HTTP response digests remain immutable acquisition witnesses. Sanitized metadata projections have distinct hashes. Original-to-safe equality of all permitted parsed metadata was verified offline and recorded in `reports/original-safe-parity.json`; original response bodies stay outside the portable delivery and Git.

## Reuse / integration

Pair the small source ZIP with its separate external metadata-data ZIP. Python3 and Node18+ are required. Run:

`python run-slice.py test`

`python run-slice.py reproduce --data-dir /absolute/path/to/Dormathon-Legal-Data`

The second command validates all frozen files and rebuilds all 249 rows / five chunks from the saved safe payloads without network. It fails if source/data policy pairing, original receipt bindings, payload hashes or reconstructed bytes differ. It never starts an acquisition implicitly. `acquire-fixed.py` exposes only the original four allowlisted routes; existing attempts return their recorded outcomes and are not automatically repeated. No scheduler, Windows execution or unattended acquisition is verified.

Core can import the source-specific pure `readEnvelope(raw, scope)` / `project(record, source, clocks)` functions and `validateLegalItem(item, source)`, together with the unchanged generic `allowedText` and `semanticPayload`. Source manifests enumerate the exact permitted factual leaves and search fields. Only transport/acquisition clocks are excluded from semantic identity; supplied website clocks and legal dates remain semantic. Feed generation time is response evidence, not a document update. Stable official resource/document IDs dedupe repeat observations; conflicting same-ID records fail. Legal changes require new source evidence, never an automatic applicability join.

`delivery/manifest.json` binds five <=100-row / <=256KiB chunks, the source policy, rights review and four-dimensional coverage contract. Each source policy binds original HTTP digests and distinct safe payload digests. Keep old accepted source and dataset pins unchanged. Register this candidate with a new reviewed admission manifest; no implicit reuse of an earlier catalog pin.

The 38 offline checks use eight independently extracted real rows plus mutations for empty/schema drift, date precision, namespaces, correction identity, metadata exclusions, dedupe and semantic change. Subset fixture envelope counts are constructed test metadata and never claimed as provider upstream totals. No consumer legal interpretation or full legal text search is supported by this title/fact-only slice. Pagination, continuous history, non-UK/US law, court decisions and entity applicability remain major gaps. EUR-Lex direct rights/help reads required a JavaScript robot check and are stopped this pass.
