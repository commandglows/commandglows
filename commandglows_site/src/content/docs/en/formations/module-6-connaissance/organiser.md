---
title: "Organize & Manage"
description: "Master file management, metadata tagging, and organizing your digital assets."
sidebar:
  label: "Organize"
  order: 4
---

Without organization, your knowledge base becomes a graveyard of files. Organizing is not about tidying for the sake of it - it is about spending 5 minutes now to save 30 later.

> The best organization system is the one you actually use. Simplicity beats perfection.

At this level, you are already doing **knowledge management**: turning scattered know-how into reusable artifacts (notes, files, procedures)<sup>[1](#concept-knowledge-management)</sup>. You also reduce cognitive load by externalizing decisions and cues (names, tags, locations) into the system<sup>[2](#concept-cognitive-offloading)</sup>.

## Minimum viable PKM: do not organize everything in the same place

The classic mistake is trying to put into a single tool:
- reflective notes
- saved links
- heavy files
- web archives
- photos and media

In practice, a healthier system separates a few simple layers:
- **Obsidian or Logseq** for notes, backlinks, and connected ideas
- **Karakeep** for links, web captures, and fast references
- **a clean file system** for documents, media, and exports

The goal is not to multiply apps. The goal is to avoid forcing one tool to do everything badly.

### What should live where?

You can keep this simple rule:
- **idea, note, reflection, conceptual link** -> Obsidian or Logseq
- **article, video, bookmark, highlight, web reference** -> Karakeep
- **PDF, image, archive, export, heavy resource** -> folders + clean naming

When that boundary is clear, your PKM becomes much lighter to maintain.

## Advanced file managers

### [TUIFIManager](https://github.com/GiorgosXou/TUIFIManager)

TUIFIManager is a terminal-based file manager (TUI) that combines speed and lightness:

- **Ultra-fast keyboard navigation**
- **File previews** directly in the terminal
- **Batch operations**: rename, move, copy with multi-selection
- **Lightweight** - no heavy dependencies, runs everywhere

### [Q-Dir](https://www.q-dir.com/): the alternative to Windows Explorer

Q-Dir displays up to four folders side by side in a single window:

| Function | Advantage |
|----------|----------|
| **4 panes at once** | Compare and move files between folders without alt-tabbing |
| **Quick filters** | Show only files of a specific type |
| **Favorites** | Instant access to your most-used folders |
| **Portable** | Runs from a USB drive, nothing to install |

---

## File organization systems

### The area-based structure

```text
Documents/
  Projects/      -> active commitments
  Areas/         -> ongoing responsibilities
  Resources/     -> reference material
  Archives/      -> finished projects
  Inbox/         -> everything lands here, sorted weekly
```

### Naming conventions

- **Dates first**: `2026-03-08_client-report.pdf`
- **No spaces**: use hyphens or underscores
- **No special characters**: avoid accents in file names
- **Version suffix**: `brief_v2.pdf` or better, use Git

### Metadata tagging

Tags make files retrievable even when you forget where you stored them:

- **Use consistent tags** - build a taxonomy of 15-20 tags max
- **Tag categories**: project, type, status, priority
- **Tools**: [TagSpaces](https://www.tagspaces.org/) (open source, cross-platform) adds tags to any file

### Backlinks beat endless taxonomies

When you organize notes, the real modern gain does not come only from folders or tags. It also comes from **links between notes**.

With tools like **Obsidian**, **backlinks** show which notes already point to the note you are writing. That is where PKM becomes more than filing: it starts helping connections emerge.

In other words:
- **folders** reduce chaos
- **tags** help you filter
- **backlinks** help you think

If you had to under-invest somewhere, I would under-invest in a complicated taxonomy before I under-invest in the ability to connect ideas.

---

## Digital footprint

### [Yorba](https://yorba.co/)

Yorba helps you manage your digital footprint by centralizing your online accounts and data:

- **Inventory** of all your online accounts
- **Detection** of data breaches affecting you
- **Guided deletion** of unused accounts
- **Overview** of your digital presence

---

## Photo and video organization

### [Immich](https://immich.app/)

Immich is a self-hosted alternative to Google Photos:

| Function | Detail |
|----------|--------|
| **Auto backup** | Sync from your phone |
| **Face recognition** | Group photos by person |
| **Map** | View your photos by location |
| **Sharing** | Shared albums with family and friends |
| **AI search** | Search by description ("beach at sunset") |

### Choosing a cloud is not only choosing a price

When you store your files, photos, or documents with a large provider, you are usually also buying:
- convenience
- collaboration
- presence across every device

But you also accept a dependency:
- on a provider
- on its interface
- on its policy changes
- on the way it handles your data and metadata

If you want more control, you have several possible levels:
- **self-host** part of your system with tools like Immich
- choose a provider that is more privacy-oriented
- keep a mixed architecture instead of centralizing everything with one actor

One option worth knowing in that context is [Internxt](https://internxt.com/), which positions itself as a European privacy-oriented cloud alternative. That does not mean you should migrate everything automatically. The useful lesson is broader: organizing your knowledge and files also means choosing where they live and how free you remain to leave.

### [MoviePrint](https://www.movieprint.org/)

MoviePrint generates contact sheets from videos - ideal for visually cataloging your video library:

- **Automatic extraction** of frames at regular intervals
- **Customizable sheets** - number of columns, margins, headers
- **High-resolution image export**
- **Useful for**: cataloging tutorials, spotting scenes, documenting video content

---

## Best practices

1. **Empty your Inbox every Friday** - 15 minutes is enough
2. **One file = one location** - no duplicates across three folders
3. **Archive instead of deleting** - storage is cheap, your data is not
4. **Automate what can be automated** - batch renaming, date sorting, automatic moves
5. **Review your structure every 3 months** - adapt it to your current projects

### Chapter references (go further)

<a id="ref-knowledge-management"></a>1) **Knowledge management (tacit to explicit)** — Nonaka (1994), *A Dynamic Theory of Organizational Knowledge Creation* — [Organization Science (INFORMS)](https://doi.org/10.1287/orsc.5.1.14)

<a id="ref-cognitive-offloading"></a>2) **Cognitive offloading / external memory** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

### Deep dive: Technical concepts

<a id="concept-knowledge-management"></a>#### Knowledge management
The goal is not “nice folders.” The goal is making knowledge transferable and actionable through stable naming, stable locations, metadata, and maintenance routines.
Scientific source: [1](#ref-knowledge-management)

<a id="concept-cognitive-offloading"></a>#### Cognitive offloading and externalized decisions
Good organization prevents you from repeatedly “recomputing” where things live. You externalize micro-decisions (where to store, how to name, how to find) into stable conventions.
Scientific source: [2](#ref-cognitive-offloading)
