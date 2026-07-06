---
name: ai-sim-fact-ledger
description: Design AI-assisted simulations where language models propose plans, dialogue, reports, risks, or flavor while deterministic local rules own facts, state mutation, ledgers, validation, and audit. Use when building NPC towns, management games, social simulations, class/community/company ecologies, or any app where LLM output must not directly change money, health, inventory, relationships, schedules, debt, scores, or timeline facts.
---

# AI Sim Fact Ledger

Use this skill to keep a generative simulation alive without letting the model become the source of truth. Treat the model as a candidate generator and prose layer; keep facts in local rules, ledgers, and immutable snapshots.

## Core Boundary

Define two layers before writing model prompts:

- **Fact layer**: deterministic local code owns state, numerical changes, action execution, relationship deltas, inventory, debt, scores, timelines, and permanent records.
- **Model layer**: the LLM may propose actions, dialogue, risk notes, summaries, or report prose, but every proposed fact must bind back to local input or be rejected.

Never let model text become a ledger write by itself. If a model output should affect the world, convert it into a typed candidate and pass it through local policy.

## Build Workflow

1. List the facts that cannot be invented.
   Include currencies, health, energy, inventory, relationships, locations, contracts, weather, scores, debt, dates, IDs, and timeline snapshots.

2. Assign each fact to a local owner.
   Use modules such as `action-policy`, `state-ledger`, `relationship-ledger`, `timeline`, or domain equivalents. Each owner should expose public summaries but keep write authority local.

3. Define model outputs as candidates.
   Prefer small JSON outputs: action IDs, interaction intents, conversation drafts, report sections, or risk notes. Avoid asking the model to return a whole mutated world state.

4. Bind every candidate to local evidence.
   Require known IDs: resident IDs, activity IDs, log IDs, memory IDs, week IDs, item IDs, or contract IDs. Reject orphaned suggestions.

5. Audit every acceptance path.
   Track accepted, rejected, downgraded, repaired, and locally-filled outputs. Store enough reason text to debug whether failure came from model coverage, invalid JSON, bad evidence, local policy, or quality collapse.

6. Render only public truth.
   UI and reports may show model-polished prose, but visible facts should come from local accepted state. Keep internal motives, hidden scores, and rejected model text out of the default surface.

## Candidate Pattern

Use a shape like this for model-controlled planning:

```json
{
  "plans": [
    {
      "actorId": "v01",
      "slots": ["YF-03", "AC-01", "TC-03"],
      "intent": {
        "targetId": "v03",
        "mode": "talk",
        "slot": "afternoon",
        "evidenceIds": ["mem-v01-012"]
      },
      "note": "public audit note only"
    }
  ]
}
```

Then locally validate:

- `actorId`, `targetId`, and all IDs exist.
- Activity IDs are in the local dictionary.
- Slots are allowed.
- Evidence IDs are visible to the actor.
- Physical, economic, relationship, and timing constraints still pass.
- The plan does not overwrite facts outside its authority.

## Ledger Pattern

Keep each ledger append-oriented or snapshot-backed:

- Write facts through named local functions, not prompt text.
- Store daily or periodic snapshots for reports.
- Freeze snapshots used by model summaries.
- Let reports cite snapshot IDs instead of recalculating mutable history.
- Make model-generated reports explicitly non-authoritative.

## Prompt Rules

Put these constraints in prompts and enforce them again in code:

- Use only provided IDs and facts.
- Do not create people, places, numbers, inventory, debts, or outcomes.
- Return strict JSON, not Markdown.
- Keep prose grounded in visible logs.
- If evidence is weak, return fewer candidates instead of inventing.

## Validation Checklist

Before calling the simulation stable, test:

- Local-only mode works without model access.
- Invalid model IDs are rejected.
- Missing actors, slots, or evidence are rejected.
- Model outages fall back to local policy.
- Reports cannot change facts.
- Long runs preserve plausible ranges for critical resources.
- Audit output distinguishes model failure from local rejection.

## Failure Smells

Refactor when you see:

- The model returns a full world state.
- UI reads numbers from model prose.
- Reports silently rewrite history.
- A rejected candidate disappears without audit.
- The prompt contains rules that no code enforces.
- Local fallback produces a different world shape than model-assisted mode.
