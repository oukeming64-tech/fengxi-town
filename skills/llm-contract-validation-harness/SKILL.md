---
name: llm-contract-validation-harness
description: Build validation harnesses for structured LLM integrations, including JSON extraction, schema guards, payload scoping, mock providers, sharded requests, coverage checks, retry hints, quality audits, and regression fixtures. Use when an app consumes model JSON for actions, reports, dialogue, tool calls, plans, summaries, or other outputs that must be accepted, rejected, repaired, or audited deterministically.
---

# LLM Contract Validation Harness

Use this skill when model output must enter a program as structured data. Validate the contract around the model, not just the prompt.

## Contract Layers

Build the harness in layers:

1. **Payload cleaner**: whitelist what the model may see.
2. **Prompt builder**: assemble messages from cleaned payloads.
3. **Provider client**: isolate API calls, JSON mode, model settings, and fallback behavior.
4. **JSON parser**: strip fences, recover the first JSON value, and report parse failures.
5. **Output guard**: normalize IDs, check enums, remove unknown fields, reject invalid structures.
6. **Domain policy**: verify facts, evidence, permissions, and local constraints.
7. **Quality audit**: detect plausible-but-bad output such as missing coverage, repeated choices, or collapsed diversity.
8. **Regression fixtures**: test mock success, malformed output, missing coverage, and retry behavior.

Keep each layer small enough that failures reveal where the contract broke.

## Shard Large Requests

When one prompt must cover many entities, split it:

- shard by resident, account, document, page, or task group
- cap shard size
- limit parallelism by available key/provider capacity
- merge results by stable IDs
- track missing entities and missing required slots
- keep the best complete result across retries

Do not fall back to one huge prompt just because sharding is inconvenient.

## Coverage Metrics

For entity-slot outputs, track:

- expected entity count
- returned entity count
- missing entity IDs
- expected slot count
- valid slot count
- invalid ID count
- duplicate or conflicting outputs
- parse/provider errors
- retry count

Return these metrics in an audit object even when the user-facing UI hides them.

## Retry Hints

When retrying, send concise, machine-readable hints back to the model:

```json
{
  "retry": {
    "reason": "missingCoverage",
    "missingIds": ["v07", "v18"],
    "invalidActivityIds": ["BAD-01"],
    "requiredSlots": ["morning", "afternoon", "evening"]
  }
}
```

Do not send a long scolding prompt. Tell the model exactly which contract failed.

## Quality Audits

Add audits for outputs that are valid JSON but operationally weak:

- too many entities choose the same action
- all evening actions land in the same risky zone
- a schedule repeats the same action in every slot
- interaction intents lack evidence
- summaries introduce unsupported numbers
- dialogue references people not in the evidence logs

Decide whether each quality failure triggers rejection, retry, downgrade, or debug-only warning.

## Mock Provider

Include a deterministic mock provider or fixture path whenever real model calls are expensive or unstable. The mock should cover:

- valid full response
- malformed JSON
- valid JSON with missing coverage
- invalid IDs
- quality-collapse output
- provider error
- retry success

Use mock tests to protect local guards and merge logic. Use real provider tests only for smoke checks.

## Validation Commands

Create one top-level validation command that calls the smaller fixtures. Keep output readable:

```text
PASS payload scoping
PASS output guard rejects unknown ids
PASS sharded merge preserves 30/30 entities
PASS retry keeps best complete shard
PASS quality audit flags repeated slot collapse
```

Fail loudly on contract drift. A prompt change that breaks guards should be treated as a code regression.

## Completion Checklist

Before shipping an LLM contract:

- model can be disabled without breaking the app
- payload cleaners exclude secrets and private fields
- JSON parser handles common wrapper formats
- guards reject unknown IDs and enum values
- evidence-bound outputs check real local evidence
- sharded calls report coverage
- retry hints are tested
- quality audits catch valid-but-useless output
- UI reads accepted local state, not raw model output
