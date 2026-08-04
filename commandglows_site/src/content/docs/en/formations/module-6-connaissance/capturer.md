---
title: "Capture & Collect"
description: "Tools and methods for archiving the web, recording your screen, managing media, and never losing anything."
sidebar:
  label: "Capture"
  order: 2
---

Capture is the first step in PKM. If you do not capture it, you will forget it. And what you forget cannot inspire you or serve you later.

> Capture first, organize later. The worst enemy of capture is organizational perfectionism.

Capturing is building **external memory**: you move information out of your head so it becomes retrievable and reusable<sup>[1](#concept-cognitive-offloading)</sup>. But capture is not learning: if you want to retain, you need to return to it and practice **active recall** (retrieval practice)<sup>[2](#concept-retrieval-practice)</sup>.

## The real question: where does what you capture actually go?

The classic PKM trap is stacking capture tools without deciding **where the material will live afterward**.

Before choosing an extension, scraper, or archiving tool, ask yourself:
- do I mainly want to **store references**
- **write and connect notes**
- or build an **advanced memory layer** for my digital activity

### Minimum viable PKM stack

For many people, the best starting point is not a complicated system. It is a simple trio:

- **Obsidian** if you want a real linked-note space, backlinks, a local graph, and a flexible thinking environment
- **Karakeep** if you want to save links, images, short notes, and web references in a retrievable way
- **Monolith** if you want to archive certain web pages durably as a single file

That trio already covers the essentials:
- **reference**
- **note**
- **archive**

### If you prefer thinking in blocks rather than pages

**Logseq** remains a very good alternative to Obsidian if you prefer:
- outlining
- blocks linked to each other
- a more daily / journal-driven flow
- a local, graph-first approach

In other words:
- **Obsidian** if you want a highly flexible note-and-backlink system
- **Logseq** if you want a system that naturally thinks in blocks and journals

The important point is not to choose "the absolute best tool." It is to choose a tool you will actually want to return to every day.

### What is advanced, not mandatory

Tools like **Screenpipe** become interesting when you want to go further:
- recording your screen activity locally
- retrieving information you saw but did not manually capture
- creating a deeper contextual memory layer

But that is not a starting point. It is an advanced layer.

So:
- **Obsidian / Logseq** for thinking and linking
- **Karakeep** for retrievable collection
- **Monolith** for durable archiving
- **Screenpipe** only if you want an augmented work-memory layer

## What beginner PKM systems often miss

Many systems fail not because they capture too little, but because they capture without a destination logic.

If you want to avoid overload:
- keep **one main notes tool**
- keep **one main collection tool**
- only add extra layers when a real problem appears

The goal is not to build a museum of the web. The goal is to keep what can realistically be retrieved, linked, reread, and reused.

## Web archiving

### [Monolith](https://github.com/Y2Z/monolith)

Monolith saves a complete web page as a single HTML file - images, CSS, and scripts included. No external dependencies, no broken links.

| Advantage | Detail |
|----------|--------|
| **Single file** | Everything is embedded in one .html file |
| **Offline** | Works without an internet connection after saving |
| **Command line** | Easy to automate in scripts |
| **Fidelity** | Rendering is almost identical to the original page |

### [Webscape](https://webscape.co.za/)

Webscape is a central hub for organizing everything you capture:

- **Collections** to categorize information by topic or project
- **Workspaces** to separate your different work contexts
- **Full-text search** across all your saved content
- **Quick actions** - create a Google Calendar event, send a LinkedIn message, all without leaving the app

### [Karakeep](https://karakeep.app/)

Karakeep, formerly **Hoarder**, is the more accurate recommendation today if you want a self-hostable bookmarking tool that goes beyond simple bookmarks:

- **Automatic saving** of the full page content
- **Full-text search** across everything you have saved
- **Tags and collections** for topic-based organization
- **Open API** for integrating it into your workflow

### When Karakeep is the right choice

Karakeep makes sense if:
- you capture lots of links
- you want to retrieve them without relying on memory
- you like the idea of a self-hosted or more controllable system

By contrast, if your main need is to **think**, **connect ideas**, and **build durable notes**, the core of your system should remain Obsidian or Logseq. Karakeep plays more of a **reference inbox** role.

---

## Screen recording

### [Screenpipe](https://screenpi.pe/)

Screenpipe continuously records everything happening on your screen and makes it searchable. It is a visual memory of your work.

- **Continuous capture** - everything is recorded in the background
- **Built-in OCR** - on-screen text is recognized and indexed
- **Time-based search** - find what you were doing at any moment
- **Local only** - your data stays on your machine

### When not to use Screenpipe

Screenpipe is impressive, but it should not be treated as a default tool.

I would mainly recommend it if:
- you work with lots of fleeting information
- you often miss details you saw on screen
- you want a deeper contextual memory layer

I would not recommend it first if:
- your notes system is still chaotic
- you do not yet have a simple capture habit
- you are likely to create another data layer you will never revisit

---

## Compression and media tools

Before you store anything, compress it. A lighter file is a healthier disk.

| Tool | Type | Use |
|-------|------|-----|
| [FFmpeg](https://www.ffmpeg.org/) | Video/audio | Compression, conversion, track extraction |
| [ImageMagick](https://imagemagick.org/) | Images | Resizing, batch conversion |
| [7-Zip](https://www.7-zip.org/) | Archives | Maximum compression, open format |

---

## Media readers

### [Thorium Reader](https://thorium.edrlab.org/en/)

Thorium Reader is an open-source ebook reader that supports EPUB, PDF, and audiobooks:

- **Clean interface** for distraction-free reading
- **Annotations and highlights** you can export
- **OPDS catalog support** for accessing online libraries
- **Accessibility** - text-to-speech, typography customization

---

## Photo management

### [Tonfotos](https://tonfotos.com/)

Tonfotos organizes your photo library with face recognition and geolocation, all locally:

- **Face recognition** to find photos of a person
- **Automatic timeline** view
- **No cloud** - everything stays on your drive
- **Duplicate detection** to free up space

---

## Digital file organization

### Core principles

1. **One folder = one project or one area** - no giant "Misc" folder
2. **Naming convention**: `YYYY-MM-DD_description_v1.ext`
3. **Single inbox**: one intake folder, emptied every week
4. **Max 3 levels** of depth in the folder tree
5. **Archive does not mean delete**: move to an Archive folder instead of deleting

### Digital asset management

For creatives and information collectors:

- **Separate sources from outputs** - raw material vs finished content
- **Version important files** - `_v1`, `_v2`, or better yet, a Git repository
- **Tag metadata** whenever possible - it makes future retrieval easier
- **Use 3-2-1 backups**: 3 copies, 2 different media, 1 off-site

### Chapter references (go further)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading / external memory** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-extended-mind"></a>2) **Extended mind / extended cognition** — Clark & Chalmers (1998), *The Extended Mind* — [paper (consc.net)](https://consc.net/papers/extended.html)

<a id="ref-retrieval-practice"></a>3) **Retrieval practice / test-enhanced learning** — Roediger & Karpicke (2006), *Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention* — [Psychological Science (SAGE)](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)

### Deep dive: Technical concepts

<a id="concept-cognitive-offloading"></a>#### Cognitive offloading (operational external memory)
You “offload” when you place information into a reliable artifact (note, capture, file, link) so you no longer have to actively maintain it in working memory. The value appears when that artifact is **retrievable** and **reinjectable** into future work.
Scientific source: [1](#ref-cognitive-offloading)

<a id="concept-extended-mind"></a>#### The extended mind (extended cognition)
Some tools function as external cognitive components: they do not only store, they support reasoning and action (as long as access stays fluid and reliable).
Scientific source: [2](#ref-extended-mind)

<a id="concept-retrieval-practice"></a>#### Retrieval practice (active recall)
Capturing is not enough to learn. To consolidate, you must force retrieval: recall the idea, rephrase it, apply it, or explain it, then correct against the source.
Scientific source: [3](#ref-retrieval-practice)
