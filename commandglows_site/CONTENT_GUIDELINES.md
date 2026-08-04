# Content Guidelines

## Purpose

This document defines the editorial standard for turning raw source notes from `CONTENU/` into premium training content under `src/content/docs/...`.

Its purpose is simple:

- create lessons that change how the reader thinks and acts
- prevent low-value content dumps
- keep the training premium, clear, and decision-shaping

This is **not** a generic brand manifesto. It is a working standard for course writing and source triage.

## Core Standard

We bring value. We do not list tools.

A premium lesson does not feel like:

- a bookmark collection
- a startup directory
- a notes dump
- a list of “cool things”

A premium lesson feels like:

- an expert clarifying what really matters
- a guide that diagnoses the hidden problem
- a framework that improves decisions
- a system that the learner can apply immediately

Tools can support this. They do not replace it.

## Product Documentation Standard

When a page or content block describes a product, the documentation must make the product legible before it becomes promotional.

Each declared product should have, at minimum:

- a clear product name and role
- a short description of what it does
- the intended audience
- the delivery mode or fulfillment path
- the canonical public surface if the product is sold or marketed

If a product is sold, the repo should also make the purchase path easy to verify:

- sales page
- product page
- checkout or entitlement path
- demo or screenshot evidence when relevant

Do not turn a product page into generic hype. The copy should help a reviewer understand what is sold, how it is delivered, and why it is a legitimate digital product.

## Core Principles

### Concepts come before tools

Always explain:

- the real problem
- why it matters
- the cost of ignoring it
- the principle or framework that solves it

Only after that should tools appear.

### Tools are illustrations, not the lesson

A tool is useful only if it helps explain or apply a better workflow.

If the text would still be strong without the tool name, the content is probably healthy.

If removing the tool name leaves nothing behind, the content was weak.

### Premium means depth, not bloat

Longer is not automatically better. Premium content earns attention by increasing clarity and leverage.

Good depth usually means:

- better diagnosis
- stronger distinctions
- sharper tradeoffs
- more realistic examples
- more useful action

Not:

- more names
- more features
- more links
- more filler

### The learner must leave smarter

Every important section should improve at least one of these:

- judgment
- prioritization
- system design
- execution
- adaptation to real life

If the learner only leaves with “some tools to try,” the section is below standard.

### Links support value, they do not create value

A clickable link is helpful.

A clickable link without explanation is not value.

The role of a link is to extend a recommendation that is already justified in the text.

## What Good Training Content Looks Like

A strong section usually includes most of the following:

1. The real problem
2. The hidden cost
3. The core principle or framework
4. The practical translation into behavior or workflow
5. The tradeoffs or limits
6. The tools or examples, if needed

In other words:

- diagnosis first
- operating logic second
- examples third

## Tool Recommendation Standard

Keep a tool in the course only if at least one of these is true:

- it is category-defining
- it removes major friction for the learner
- it is a uniquely strong example of a concept
- it helps explain a broader workflow especially well

If a tool is kept, the content should usually answer:

- What is it?
- What problem does it solve?
- Why does it matter?
- Who is it for?
- When should you avoid it?

If the tool remains in the lesson as a real recommendation, add:

- an official link when available
- otherwise the most stable canonical reference

### Freshness is part of quality

Recommendations must be checked for freshness before they enter the course.

At minimum, verify:

- whether the product still exists
- whether it is still maintained
- whether it has been sunset, acquired, merged, renamed, or deprecated
- whether the recommended access path still works
- whether the recommendation is still strategically relevant today

This matters especially for:

- apps
- browser extensions
- SaaS tools
- APIs
- social platforms
- AI products

If freshness changes the recommendation, the lesson should say so clearly.

Examples:

- “the official desktop app no longer exists”
- “the standalone website has been folded back into another product”
- “the tool still exists, but only as a secondary option now”

A recommendation is not premium if it is already outdated when the learner reads it.

## What “Good Enough” Is Not

These are below standard on their own:

- “Tool X is useful for Y.”
- “App Z is great.”
- “This helps productivity.”
- “Here are five tools you can use.”

These may survive only if they are supported by explanation and placement inside a stronger section.

## Anti-Patterns

Do not:

- dump app names with one-line descriptions
- keep a tool because it is clever, trendy, or niche
- confuse “real product” with “belongs in the course”
- turn a lesson into a comparison table with no editorial judgment
- recommend tools without explaining their role
- add links blindly just because a tool is named
- retain outdated or sunset tools as if they were still strategic recommendations
- present unstable or recently changed products without checking their current status first

## Source Triage Rules

Every source block should end up in one of five buckets:

- **Integrate into core content**
- **Integrate as secondary example**
- **Move to “go further”**
- **Archive**
- **Discard**

### Integrate into core content

Use this when the source materially improves:

- understanding
- decision quality
- execution quality
- system design

### Integrate as secondary example

Use this when the idea is useful, but not structural.

Examples:

- a specific tool that illustrates a broader workflow
- a niche implementation that some learners may benefit from

### Move to “go further”

Use this when:

- the source is useful but non-essential
- it serves curious readers
- it supports the lesson without carrying it

“Go further” is for:

- extra tools
- references
- adjacent resources
- niche utilities

It is not a dumping ground for weak content.

### Archive

Use this when:

- the idea may be useful later
- the source is not strong enough for the live lesson
- the content belongs to future articles, annexes, or research notes

### Discard

Use this when:

- the source adds no real leverage
- it is redundant
- it is too weak, too vague, too outdated, or too off-topic
- it is no longer current enough to justify learner trust

Something can be true and still not deserve a place in the course.

## Depth Standard for Premium Lessons

Important lessons should go beyond “what.”

They should try to include:

- why this matters psychologically, cognitively, or strategically
- what failure looks like
- how the mistake usually appears in real life
- how to apply the concept concretely
- how to adapt it by profile, context, or maturity

Good premium content often creates a useful mental shock:

- a false assumption gets broken
- a hidden cost becomes visible
- an obvious but neglected behavior becomes undeniable

That is the level we want.

## Writing Standard

Write with:

- clarity
- directness
- expert judgment
- practical intent

Avoid:

- vague hype
- generic SaaS-style claims
- lazy superlatives
- empty inspiration
- overcomplicated wording

Prefer:

- strong distinctions
- concrete examples
- tradeoffs
- mechanisms
- useful contrasts

## Checklist Before Keeping a Section

Ask:

- Does this teach, or does it just mention?
- Does this improve the learner’s understanding?
- Does this create better decisions?
- Does this make action easier?
- Does this feel premium or like source notes?

If the answer is weak, the section needs to be rewritten, demoted, archived, or removed.

## Checklist Before Keeping a Tool

Ask:

- Is this tool really worth course space?
- Is it central, secondary, or only “go further”?
- Have we explained why it matters?
- Have we explained who should use it?
- Have we explained its limits?
- Is the tool still current and credible?
- Do we have a clean link?
- Have we checked whether anything important changed recently?
- Would the learner understand the current status of the product after reading this?

If not, it is not ready.

## Current Workflow Standard

During the current source triage phase:

1. Preserve what creates real value
2. Remove what is merely referential
3. Archive what may be useful later
4. Keep tools only when they clearly support the lesson

After triage is complete:

1. Enrich already-written lessons
2. Increase depth where the course is still too tool-heavy
3. Improve transitions, examples, and adaptation guidance

The current priority is not “link everything.”

The current priority is:

- finish triage
- protect quality
- prevent weak content from entering the course

## Quick Test

If a section sounds like this:

> “Checker Plus gives advanced Gmail notifications and previews.”

That is not premium enough.

It becomes premium when it sounds more like this:

> Gmail often trains you to keep checking your inbox manually. Checker Plus matters because it externalizes that vigilance: you can monitor new emails, preview key messages, and manage multiple accounts without living inside Gmail all day. It is useful if email remains operationally important for you, but not if your goal is total interruption minimization.

That is the standard.
