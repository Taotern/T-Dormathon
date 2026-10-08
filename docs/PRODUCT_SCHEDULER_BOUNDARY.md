# Deterministic product execution and the remaining trigger boundary

Recorded2026-10-08. The source collectors, validation, bounded retry, dedupe, immutable evidence, deterministic rules, and durable D1 writes are product code. Each source now has its own independently testable adapter under worker/adapters and executable entrypoint under scripts/sources. lib/daily-collector.mjs owns the routine; scripts/collect-daily.mjs is its model-free machine entrypoint. No routine requires a language model, agent prompt, browser, or human analysis.

## Verified GPT-Site surface

The current documented/exposed Sites hosting path provides Worker ESM publication, logical D1/R2 bindings, optional verified plugins/connectors and supported capabilities. Actual project configuration is D1 bindingDB, R2unused, no plugin/MCP. Native tools expose source/version/deployment, runtime environment, private access, and read-only D1 inspection. No supported cron/queue/workflow/DurableObject-alarm provisioning or trigger readback operation is exposed in this current surface. Recurring Sites guidance describes cloud task automations, not a code-only provisioned Worker clock.

This is a current capability/access boundary, not a claim that Cloudflare cannot support scheduling. [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) require both the scheduled handler and configured trigger. [Bindings for platform Workers](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/bindings/) must be explicitly attached by the platform. The current Sites manifest does not document those declarations. Therefore merely adding scheduled(), unsupported cron/queue keys or an environment variable does not establish an autonomous product trigger.

An ordinary HTTP timer is not a substitute. [Cloudflare duration limits](https://developers.cloudflare.com/workers/platform/limits/#duration) allow request work while a client remains connected; waitUntil adds at most30seconds after response/disconnect. No persistent while-loop, page polling, or unbound scheduled export is being represented as production autonomy.

## Current execution status

The temporary personal-assistant task is paused and has not executed a scheduled round. It is not an independent product-owned scheduler. The current Site contains19,935indexed records:369Site-direct,100uploaded/unverified and19,466reviewed retained acquisitions. Importing that batch does not enable those snapshot sources for automated fetching. Source caps, retention and unknown upstream appearance remain explicit.

## Current owner-selected path

The owner selected a local deterministic collector, with SQLite persistence and a foreground daily due/catch-up loop. The local program must remain open on an awake computer; no OS scheduled task has been registered. The private GPT-Site accepts a bounded manual snapshot upload through the owner session. That handoff avoids persistent machine credentials and exposes integrity, source-authenticity and history limitations. See [local snapshot handoff](LOCAL_SNAPSHOT_HANDOFF.md).

The exact missing GPT-Site prerequisite remains a supported configurable/verifiable code-only trigger provisioning/readback path in the current exposed contract. This is not a categorical statement that the platform could never provide one. No unsupported trigger fields or alternative infrastructure have been provisioned.

The earlier Site-targeting portable script remains a development/temporary-operator tool with transient sanctioned same-Site access. Its credentials are not repurposed as a durable local bridge. The local collector contacts only fixed public source endpoints and needs no Site credentials; export/import is manual.
