---
name: private-to-public-gift-site
description: Turn a private, reality-inspired, prototype, classroom, community, or internal project into a safe public gift website or shareable artifact. Use when publishing something built from sensitive source material, real people, private observations, local experiments, or internal engineering notes, and the work needs anonymization, surface-language cleanup, asset packaging, README/deployment polish, and a clear boundary between private source and public repo.
---

# Private To Public Gift Site

Use this skill when the private project is valuable but the public version must feel like a gift, not a source dump. Separate inspiration from publication.

## Core Boundary

Maintain two spaces:

- **Private source workspace**: raw notes, experiments, real-world inspiration, internal engineering state, prompts, temporary assets, and sensitive context.
- **Public gift repo**: polished site, safe assets, public README, deployment instructions, and only the files needed to run or understand the gift.

Do not publish private source material just because it helped create the artifact.

## Publication Workflow

1. Define the recipient-facing offer.
   State what the public artifact is in one plain sentence. Avoid explaining all private backstory.

2. Inventory sensitive material.
   Check names, images, private observations, prompts, keys, logs, local paths, comments, metadata, screenshots, and docs.

3. Choose public naming.
   Use fictional, anonymized, or role-neutral names when real people inspired the work. Avoid one-to-one identifiable details.

4. Collapse internal labels.
   Replace debug terms, model audit vocabulary, source archetype names, internal jokes, and implementation labels with user-facing language.

5. Keep the first screen as the gift.
   Make the public page open directly into the experience when possible. Avoid turning the site into a process explanation.

6. Package only public assets.
   Include runtime images, styles, scripts, and docs needed by the public site. Exclude source prompts, raw generations, private notes, unused drafts, and secrets.

7. Write a restrained README.
   Include what it is, how to open it, how to run locally, and what optional services exist. Do not overexplain private motivations.

8. Verify the deployed surface.
   Open the public page, check broken links/assets, inspect visible text, and confirm no private material appears in the default UI.

## Anonymization Checks

Before publishing, search for:

- real names
- class, company, client, or internal group names when not intended for public use
- phone, email, address, ID, account, or key-like strings
- local absolute paths
- source filenames that reveal private context
- debug labels such as `shadow`, `audit`, `prototype`, `local补齐`, or internal role tags
- metadata in images or documents when relevant

When the public artifact is intentionally for a known group, keep only the names and context the user explicitly wants public.

## Public Language

Prefer language that lets the artifact stand on its own:

- "open the town"
- "read today's town paper"
- "see where residents are"
- "optional local text service"

Avoid exposing construction scaffolding:

- "model shadow mode"
- "guard rejected"
- "real source archetype"
- "private behavior pack"
- "LLM audit panel"

Keep technical setup available but secondary.

## Repository Shape

For a simple static gift site, prefer:

```text
index.html
styles.css
src/
gift-assets/
README.md
```

For extracted reusable knowledge, use a separate public folder such as:

```text
skills/
  skill-name/
    SKILL.md
    agents/openai.yaml
```

Do not mix private engineering handoffs into the public root unless they are intentionally part of the public story.

## Final Gate

Before pushing:

- run the site or open the HTML
- scan visible UI text
- search for sensitive strings
- verify README links
- ensure optional model keys are not persisted or committed
- check git status for unrelated private files
- confirm the public repo can stand without the private workspace
