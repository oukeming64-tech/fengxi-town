---
name: resident-cognition-loop
description: Design audited multi-agent resident or NPC cognition loops using local memory streams, scratch state, perception packets, retrieval, candidate plans, interaction intents, local policy review, execution, and optional reflection. Use for towns, classrooms, communities, teams, management sims, narrative games, or other simulations where many characters should appear to think independently without letting the LLM mutate facts directly.
---

# Resident Cognition Loop

Use this skill to make many simulated residents feel independent while keeping the simulation auditable. Borrow the useful shape of generative agents, but keep facts local and make model cognition a candidate layer.

## Loop Shape

Use this chain:

```text
perceive -> retrieve -> propose plan / react -> local audit -> execute -> record public memory -> optional reflection
```

Keep the loop day-based or turn-based unless the product truly needs real-time ticks. A slower loop is easier to audit, test, and explain.

## Local Data Layers

Create these local structures before prompting a model:

- **Resident profile**: stable ID, public name, public role, traits, skills, constraints, current location, inventory/status summary.
- **Scratch**: today goal, current action, short plan, fatigue/health pressure, cooldowns, recent public memory pointers.
- **Memory stream**: public, evidence-backed memory nodes with IDs, source log IDs, place, participants, keywords, salience, and expiry.
- **Perception packet**: what this resident can currently observe: nearby residents, local events, visible risk, relationship hints, and retrieved memories.
- **Candidate schema**: allowed action IDs, allowed interaction modes, slots, and evidence requirements.

Do not put private source notes, real identities, hidden author judgments, or raw relationship ledgers into the model packet.

## Memory Rules

Use public memory as evidence, not as omniscient mind-reading:

- Derive memory from local logs, public reports, accepted interactions, and immutable snapshots.
- Store IDs and source references for every memory node.
- Add expiry or relevance decay.
- Keep model reflection optional and non-authoritative.
- Do not write model `reflectionNote` directly into long-term memory unless local policy accepts it.

## Interaction Intent

Use small typed intents instead of freeform social outcomes:

```json
{
  "targetResidentId": "v03",
  "mode": "talk",
  "slot": "afternoon",
  "evidenceMemoryIds": ["mem-v01-012"],
  "reflectionNote": "short public note"
}
```

Allowed modes should be domain-specific and finite, such as `talk`, `wait`, `avoid`, `help`, `gift`, or `appreciate`.

Local review must check:

- target exists and is not self
- slot is legal
- target is visible or reachable
- evidence memories exist and are visible to the actor
- cooldowns allow the interaction
- health, fatigue, risk, and schedule constraints pass
- the intent maps to a safe local action

## Planning Rules

Ask models for proposed action IDs, not full prose schedules. Keep each prompt scoped to the current resident shard or small group when many residents exist.

Useful prompt inputs:

- town or system public state
- action dictionary
- current resident scratch
- perception packet
- retrieved memories
- recent local logs
- latest immutable timeline snapshot

Useful output:

- three-slot action plan
- optional interaction intent
- optional short public note

## Execution Boundary

After audit, execute only through local action policy:

1. Normalize candidate IDs.
2. Reject invalid actors, slots, actions, or evidence.
3. Score candidates against local needs and resident constraints.
4. Accept, downgrade, replace, or fill missing slots.
5. Execute accepted actions through the state ledger.
6. Generate local logs.
7. Build memory nodes from accepted public logs.

## UI Boundary

Show observable behavior:

- location
- current action
- visible status
- public conversation
- public clues
- reports based on local logs

Avoid default displays of hidden motivation scores, private relationship numbers, source archetype labels, or model audit internals. Keep audits available for debugging, not as the main fantasy.

## Stability Checks

Before shipping:

- Run with the model disabled.
- Run with incomplete model coverage.
- Reject self-targeted interactions.
- Reject invisible evidence.
- Confirm fallback actions still create plausible days.
- Confirm repeated days do not collapse into one identical schedule.
- Confirm memory growth is bounded or pruned.
