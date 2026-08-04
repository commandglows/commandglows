---
title: "Flow Launcher"
description: "Use a keyboard launcher to retrieve apps, files, bookmarks, and notes without breaking flow on Windows."
sidebar:
  label: "Flow Launcher"
  order: 6
---

[Flow Launcher](https://www.flowlauncher.com/) is not just an app launcher. Inside a PKM system, it is an **access layer** that lowers the cost of retrieving or opening what you already know you need.

> A good knowledge system is worth much less if every access still sends you back through the mouse, File Explorer, or the Start menu.

In practice, a launcher becomes an extension of your **external memory**: it lowers access cost, so you reuse what you already have (notes, files, bookmarks) more often<sup>[1](#concept-cognitive-offloading)</sup>. It also increases the chance you hit the right **cue** (approximate name, context, app)<sup>[2](#concept-retrieval-cues)</sup>.

## The real issue: reduce access friction

After capture, organization, and search, one more problem remains:
- too many clicks
- too many context switches
- too much micro-friction to open what you already want

A keyboard launcher becomes useful when you want to:
- launch an app in 2 seconds
- retrieve a file without navigating
- open a bookmark without entering the browser first
- stay on the keyboard

The real gain is not only time. It is continuity of attention.

## The CommandGlows decision framework

Before installing or over-configuring a launcher, ask four questions:

1. **Am I really losing time to searching, or mainly to deciding?**
2. **Do I mostly need quick access to apps, files, bookmarks, or notes?**
3. **Is my real problem fast access, or poor organization?**
4. **Will a launcher simplify my flow, or just add another configuration layer?**

The right role split is simple:
- launcher for access
- search engine for retrieval
- clear structure so you do not compensate for deeper chaos

## Why Flow Launcher remains a strong choice

Flow Launcher is still a credible Windows recommendation if you want a free, extensible, and fast launcher.

It becomes relevant when you want:
- a global hotkey (`Alt + Space` by default)
- lightweight app and file search
- useful plugins without being locked into a heavy ecosystem
- a portable version to keep your configuration

### What it does well

- **launch apps quickly**
- **search files** through Windows Search or [Everything](https://www.voidtools.com/)
- **open bookmarks**
- **run shell commands**
- **do calculations**
- **add targeted plugins**

The important point is not to turn it into a cockpit. It is to make it a reliable front door.

## The best pairing: Flow Launcher + Everything

If you want a real sense of speed on Windows, the cleanest pairing is often:

- **Flow Launcher** for the access bar
- **Everything** for instant file-name indexing

Flow Launcher can already use Everything, which gives you a simple result:
- keyboard shortcut
- a few letters
- immediate result

In other words:
- **Flow Launcher** = access interface
- **Everything** = file-name engine

## When a launcher matters more than a neat folder tree

A good PKM system should not rely only on manual navigation.

You can easily have:
- decent folders
- good notes
- a solid search engine

and still lose time because frequent actions still take 4 or 5 steps.

At that point, the launcher becomes a **shortcut layer for habits**.

It is especially useful when you often open:
- your Obsidian notes
- work bookmarks
- a few project folders
- the same tools several times a day

## Recommended setup

### Keep it restrained

- **hotkey**: `Alt + Space` is still a strong default
- **visible results**: 5 or 6 is enough
- **plugins**: only enable the ones tied to real use
- **theme**: choose readability over novelty

If you spend more time customizing the launcher than using it, the benefit is gone.

### Portable version: good if you want stability

Flow Launcher also ships as a portable version. That is useful when you want to:
- keep your config in one simple place
- back it up easily
- avoid rebuilding everything later

## Plugins that actually deserve their place

### 1. Everything

The most useful integration if your main need is:
- retrieving files
- launching recent documents
- avoiding File Explorer for quick access

### 2. Bookmarks

Useful if you work from many bookmarks and want to avoid:
- opening the browser first
- digging through bookmark folders
- breaking context to find a resource

With Vivaldi, the Bookmarks plugin can point to your bookmarks file and let you retrieve resources directly from the launcher.

### 3. Calculator

Simple, but worth it. No need to open a separate app for quick math.

### 4. Shell

Useful if you already know what you want to run and want to remove a few more clicks. Unnecessary if you almost never use the terminal.

## Most credible premium use cases

### Retrieve a Vivaldi bookmark

If many work resources live in your bookmarks:
- configure the **Bookmarks** plugin
- point it to the Vivaldi bookmarks file
- keep or remove an action keyword depending on preference

The gain is straightforward: you retrieve a working link without opening and browsing inside the browser first.

### Open a note or project file

With Flow Launcher + Everything, you can retrieve in a few keystrokes:
- a brief
- an Obsidian note
- an export
- an active folder

### Keep the keyboard as the main interface

The more your flow depends on:
- writing
- searching
- notes
- quick commands

the more a launcher pays off.

## What to avoid

- installing a launcher to compensate for a completely chaotic system
- multiplying plugins “just in case”
- turning configuration into a hobby
- thinking a launcher replaces a real retrieval system

## Recommended workflow

**Minimal**:
- Flow Launcher alone
- a few frequent apps
- one or two web shortcuts

**Pragmatic**:
- Flow Launcher
- Everything
- Bookmarks plugin if you rely heavily on saved links

**Personal system**:
- portable version
- access to notes, files, bookmarks, and shell
- light but stable configuration

:::note[Practical exercise]
Choose 5 things you open several times per day:

1. one app
2. one folder
3. one file
4. one bookmark
5. one note

Configure Flow Launcher so you can open all 5 from the keyboard. If it does not create real fluidity after a few days, your main problem was probably not access speed.
:::

### Chapter references (go further)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading / external memory** — Risko & Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1364661316300714)

<a id="ref-encoding-specificity"></a>2) **Retrieval cues / encoding specificity** — Tulving & Thomson (1973), *Encoding specificity and retrieval processes in episodic memory* — [Psychological Review (APA)](https://doi.org/10.1037/h0020071)

### Deep dive: Technical concepts

<a id="concept-cognitive-offloading"></a>#### External memory (cognitive offloading) and access cost
When access is fast, you reconnect present actions to past artifacts (notes, files, bookmarks) more often. That regular reuse is a key condition for external memory to actually pay off.
Scientific source: [1](#ref-cognitive-offloading)

<a id="concept-retrieval-cues"></a>#### Retrieval cues
A launcher lets you quickly try multiple cues (a few letters, a context, an app). More entry points increases the odds of retrieval even when your memory is fuzzy.
Scientific source: [2](#ref-encoding-specificity)
