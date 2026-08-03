---
title: "Retrieve & Search"
description: "Build a multi-layer retrieval system for notes, files, references, and scattered information without depending only on memory."
sidebar:
  label: "Retrieve"
  order: 5
---

Your knowledge base loses much of its value if you cannot retrieve what you need quickly.

> The best filing system in the world is not enough if retrieving information is still slow, fragile, or dependent on the perfect keyword.

## The real issue: retrieval, not just text search

Retrieval does not only mean typing a word into a box.

In a strong PKM system, you retrieve information in several ways:
- through **direct search**
- through **context**
- through **links**
- through **fast access**

In cognitive science, retrieval is heavily dependent on the **cues** available when you search<sup>[1](#concept-retrieval-cues)</sup>. A strong PKM manufactures those cues (links, naming, tags, context) and lowers access cost, which makes reuse more frequent and more reliable<sup>[2](#concept-cognitive-offloading)</sup>.

If your system depends only on perfect text search, it remains fragile.

## The CommandGlows decision framework

When you cannot find something, ask four questions:

1. **Am I looking for a note, a file, a link, or information scattered across apps?**
2. **Do I know the exact keyword, or only the context?**
3. **Is the problem search, organization, or the wrong storage location?**
4. **Do I need a search engine, a launcher, or a network of linked notes?**

This prevents confusing:
- a retrieval problem
- with a capture problem
- or with an organization problem

## The 4 retrieval layers that actually matter

### 1. Search inside notes

You want to retrieve:
- an idea
- a note
- a synthesis
- a conceptual link

The core here remains:
- **Obsidian** or **Logseq** for notes
- plus **backlinks** and sometimes the **graph** when you want to restart from a related idea

The real PKM gain is not only retrieving by title. It is also climbing back through relationships.

### 2. Search inside web references

You want to retrieve:
- a saved article
- a video
- a web resource
- an important link

The right center here remains:
- **Karakeep**

Because its whole role is making your references retrievable without depending on memory.

### 3. Search inside local files

You want to retrieve:
- a document
- a PDF
- an export
- a text or office file

On Windows, the two most useful layers remain:
- **Everything** for file names
- **AnyTXT Searcher** for content search

In other words:
- **Everything** when you roughly know what you are looking for
- **AnyTXT** when you remember the content, not the file name

### 4. Unified search across apps

You want to retrieve something, but you no longer remember whether it was:
- in an email
- in a doc
- in a cloud app
- in a browser
- in a local folder

That is where a unified search tool becomes useful.

## Curiosity: the strongest current recommendation for unified search

Today, **Curiosity** is the most defensible recommendation in this layer.

Why:
- local and cloud search in one interface
- search across files, emails, apps, browsers, and other connected sources
- global shortcut
- strong focus on fast retrieval

It becomes useful when:
- your work lives across several apps in parallel
- you lose time wondering where information lives
- you want a cross-app search layer without reorganizing everything elsewhere

The right use is not:
- “I will stop organizing and just search later”

The right use is:
- decent organization
- plus genuinely strong cross-app search

## What I recommend less here

### Findr

`Findr` no longer feels like the strongest recommendation for this lesson today. I would not keep it as a primary course recommendation in this layer.

### Redundant launchers

Launchers are still useful, but they should not blur this lesson.

For the “launch quickly” layer, the course already has a dedicated page for **Flow Launcher**. Here, the main subject is:
- retrieval
- not only launching

So I keep the launcher idea as a secondary layer, without making it the center.

## Launchers: secondary, but still useful

A launcher still pays off when you want to:
- open an app quickly
- access a recent file fast
- remove a few frequent clicks

### Credible option

**ueli** remains a valid current option as a simple keyboard launcher.

But the course hierarchy stays:
- **Flow Launcher** for the main Windows launcher/workflow layer
- `ueli` as a credible alternative, not the center of this page

## Browser search

Part of daily retrieval still happens through:
- bookmarks
- history
- open tabs

You can already cover a lot with:
- native browser search functions
- **Quick Commands** in Vivaldi
- bookmark/history search
- connected browser search through a tool like Curiosity

The right reflex is not to install one more extension if the browser or your unified layer already covers the need.

## Minimum viable retrieval

If you want a simple and robust system, cover these 4 cases first:

- **retrieve a linked note** -> Obsidian or Logseq
- **retrieve a web reference** -> Karakeep
- **retrieve a local file** -> Everything + AnyTXT when needed
- **retrieve information scattered across apps** -> Curiosity

If those 4 cases are covered, your PKM already becomes much more reliable.

## What to avoid

- relying on the perfect keyword for everything
- installing several tools that almost do the same thing
- compensating for poor organization with endless indexing
- confusing fast access with true retrieval

## Recommended workflow

**Minimal**:
- searchable notes
- Everything
- a clear reference system

**Pragmatic**:
- backlinks in your note tool
- Karakeep for references
- Everything + AnyTXT for files

**Personal system**:
- multi-layer retrieval
- Curiosity for cross-app search
- launcher as a secondary fast-access layer when needed

:::note[Practical exercise]
Take 4 things you searched for recently:

1. one note
2. one link
3. one file
4. one piece of information you could no longer place

For each one, ask:
- in which layer should I have retrieved it?
- what slowed retrieval down?

If you use the same tool for everything, or never know where to search, your problem is not memory. It is retrieval architecture.
:::

### Chapter references (go further)

<a id="ref-encoding-specificity"></a>1) **Retrieval cues / encoding specificity** — Tulving & Thomson (1973), *Encoding specificity and retrieval processes in episodic memory* — [Psychological Review (APA)](https://doi.org/10.1037/h0020071)

<a id="ref-cognitive-offloading"></a>2) **Cognitive offloading / external memory** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-retrieval-practice"></a>3) **Retrieval practice / test-enhanced learning** — Roediger & Karpicke (2006), *Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention* — [Psychological Science (SAGE)](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)

### Deep dive: Technical concepts

<a id="concept-retrieval-cues"></a>#### Retrieval cues and encoding specificity
You retrieve better when the cues available at search time resemble those present at encoding time. That is why links, stable titles, context, and metadata matter: they create multiple entry points.
Scientific source: [1](#ref-encoding-specificity)

<a id="concept-cognitive-offloading"></a>#### External memory (cognitive offloading)
A PKM reduces the need to “hold everything in mind” by externalizing information into searchable artifacts (notes, links, files). The less you depend on a perfect keyword in biological memory, the more reliable retrieval becomes.
Scientific source: [2](#ref-cognitive-offloading)

<a id="concept-retrieval-practice"></a>#### Retrieval practice
When you reuse your notes (write, explain, decide), you are doing a form of active recall. The more your system makes that reuse easy, the more you convert stored information into usable knowledge.
Scientific source: [3](#ref-retrieval-practice)
