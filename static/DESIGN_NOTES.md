# Dormathon UI visual direction and verification

## Reference research
The requested Pinterest search was viewed in the dedicated cloud browser on 2026-10-07. The public web-fetch route had failed; this is distinct from the successful browser observation.

- Primary non-sponsored Pin actually inspected: https://www.pinterest.com/pin/127719339430853877/
- Supporting non-sponsored Pin visible in the same search grid: https://www.pinterest.com/pin/9429480462959578/
- Search entry: https://www.pinterest.com/search/pins/?q=%E5%A4%AE%E7%BE%8E%E8%AE%BE%E8%AE%A1
- A Squarespace sponsored card was excluded.

The Pin images are references only. No source image was downloaded, copied into the application, or represented as licensed production artwork. Original-author attribution and commercial image licensing were not established.

## Original interface translation
Solid black navigation, white/gray evidence panels and a small muted green state accent translate the requested 虚实解构 direction into a functional interface. Thin rules separate analytical layers and connect evidence to actions. Whitespace establishes hierarchy. No fog, backdrop blur, invented chart data, ornamental non-working control or old OCR interface is used. Body and primary evidence text are 16px; metadata is at least 13px. Charts use all available heldout time-series points and expose exact values.

## Functionality
The primary path is real public-data intelligence for supply, procurement, service and energy. Each domain displays provenance, sample scope, baseline evaluation where valid, limitations, source evidence and action creation. Enterprise records are separate optional imports. Predictions are distinguished from evaluation-only outcome replay; replay is hidden until explicitly requested. Supply SKU confidence limitations and stale energy snapshot warnings are prominent. RAG retrieval is separate from LLM generation; an unconfigured LLM is disabled and no generated answer is fabricated.

## Verification gate
JS syntax, dependency-free mocked DOM render tests, import parser tests, XSS escaping, API error states and responsive CSS static checks have passed. The documented cloud browser's first attempt at http://127.0.0.1:8765 returned net::ERR_BLOCKED_BY_CLIENT. That route was stopped, without security changes or alternative browser bypass. Actual browser clicks, screenshot/layout verification and mobile viewport inspection remain unverified. Mocked DOM checks are not visual acceptance. The final unit smoke includes request-generation/view tokens for navigate-away/return, concurrent Search/Generate, stale failed responses, overlapping refreshes and replaced evidence dialogs.
