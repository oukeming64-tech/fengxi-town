---
name: world-rules-normalizer
description: Convert narrative worldbuilding, lore, game rules, product settings, or social-system notes into traceable, executable modules with source preservation, normalized contracts, code mappings, and audit logs. Use when a user gives a long setting document or rules patch and wants it turned into runtime configuration, model prompts, simulation rules, validation fixtures, or implementation-ready architecture.
---

# World Rules Normalizer

Use this skill when raw world material is rich but not yet executable. Preserve the user's source, extract a normalized rule layer, and map that layer into code, prompts, UI, and tests.

## Folder Model

Use a two-layer source structure when possible:

```text
world/
  00_source/
    original-rule-file.md
    action-patch.md
  modules/
    01_world.md
    02_systems.md
    03_model_contract.md
    04_audit_log.md
    05_activity_rules.md
    06_state_ledger.md
```

Keep `00_source/` as traceable input. Do not treat it as runtime truth. Make `modules/` the normalized contract that code and prompts read.

## Normalization Workflow

1. Preserve the raw source.
   Copy or reference the original material without silently rewriting it. Record title, author/source if known, date, and version.

2. Identify contradictions and correction points.
   Examples: population counts, names, duplicated regions, impossible economy, missing dates, mismatched IDs. Do not bury corrections in code; record them in the normalized modules and audit log.

3. Split the world into modules.
   Use stable boundaries:
   - world shell: places, institutions, time period, population
   - systems: weather, crops, trade, work, relationships, events
   - model contract: what AI can see, output, and never modify
   - activity rules: action dictionary, locations, costs, public copy
   - state ledger: inventories, facilities, debts, contracts, reports
   - audit log: source mapping, corrections, validation history

4. Assign runtime owners.
   Map each normalized rule to code modules, config files, prompts, UI surfaces, and validation scripts. Mark whether each owner can read, write, summarize, or only display the rule.

5. Produce IDs before prose.
   Give locations, activities, residents, items, facilities, contracts, events, and reports stable IDs. Let prose reference IDs rather than becoming the identifier.

6. Write validation fixtures.
   Create tests that load the normalized modules or their code equivalents and verify counts, IDs, forbidden terms, public/private boundaries, and model contract assumptions.

## Module Content

For each normalized module, include:

- version string
- source file references
- scope
- accepted corrections
- stable IDs and names
- runtime mapping
- boundaries and forbidden changes
- validation notes

Avoid turning modules into essays. Put executable facts, decisions, and mapping tables first.

## Model Contract Extraction

When the world will use LLMs, extract:

- what the model may see
- what the model must not see
- what the model may propose
- what the model cannot directly modify
- required JSON shapes
- evidence IDs required for dialogue, reports, or actions
- forbidden words, real-world references, or privacy boundaries
- fallback behavior when output is invalid

Every model rule should have a corresponding local guard or validation check when feasible.

## Audit Log Rules

Use the audit log for decisions future agents will otherwise rediscover:

- source date and version
- corrections from raw source to normalized module
- why a count, name, or system changed
- which code file implements the rule
- which validation command verifies the rule
- what remains intentionally deferred

Do not use the audit log for daily chatter. Keep it as a durable trace of rule ingestion and mapping.

## Completion Checklist

Before treating the world as implemented, verify:

- raw source is preserved
- normalized modules are the authoritative layer
- every important count or ID has one owner
- model-visible material excludes private or source-only details
- code mappings point at real files
- validation checks cover the fragile contracts
- public UI terms match the intended world surface
