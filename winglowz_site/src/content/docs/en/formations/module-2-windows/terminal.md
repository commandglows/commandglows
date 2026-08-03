---
title: "Terminal & Command Line"
description: "Know when CLI is actually worth it on Windows, start from the right base, and keep a simple but high-return terminal stack."
sidebar:
  label: "Terminal"
  order: 6
---

The terminal is not a religion. It is leverage. It becomes useful when it gives you more speed, repeatability<sup>[1](#concept-cognitive-offloading)</sup>, or control.

> The right use of the terminal is not doing everything in CLI. It is using it where the mouse becomes slow, repetitive, or fragile.

## The real issue: cross the right threshold

Many people reject the terminal because they imagine they have to learn everything at once. Others adopt it as a posture and end up complicating tasks that would be perfectly fine in a GUI.

The right logic is simpler<sup>[2](#concept-cognitive-load)</sup>:
- GUI for one-off, visual, obvious tasks
- CLI for repetitive, large-scale, scriptable, and reproducible work

## The CommandGlows decision framework

Before using the terminal, ask four questions:

1. **Am I doing this once or often?**
2. **Am I handling 3 items or 300?**
3. **Do I need a reproducible result or just a one-off action?**
4. **Is the mouse saving time here, or forcing me through the same sequence again and again?**

If the task is<sup>[3](#concept-task-switching-cost)</sup>:
- repetitive
- high-volume
- text-heavy
- or meant to be replayed

then the terminal often becomes the better tool.

## The right Windows baseline

### 1. Windows Terminal

**Windows Terminal** remains the healthiest base for most Windows users.

Why:
- tabs
- split panes
- multiple profiles
- command palette
- strong Windows integration

I would not recommend starting elsewhere unless you have a specific need.

### 2. PowerShell 7, not CMD

The real shell to start with today is **PowerShell 7**.

Why:
- more modern
- better usability
- more coherent for scripts
- better future than `cmd`

`CMD` can still survive for very old habits or a few simple commands, but it is no longer the base worth teaching first.

So:
- **Windows Terminal** for the container
- **PowerShell 7** for the main shell

## When WSL is worth it

**WSL** is excellent, but only if you have a real reason.

I recommend it if:
- you regularly use Linux tools
- you do web or backend development that depends heavily on the Linux ecosystem
- you want an environment closer to a server or Unix-like machine

I would not recommend it as a first step if your needs are only:
- navigating folders
- running a few basic commands
- doing light text or file search

So:
- **PowerShell 7** first
- **WSL** when your workflow truly justifies it

## Terminal use cases that pay off fastest

You do not need to become an expert to get a real return.

The first cases where CLI usually pays off are:
- searching text across many files
- finding files quickly
- batch renaming or moving
- installing or updating multiple tools
- chaining a few commands you want to reuse

In other words, CLI becomes worth it as soon as the work has a repeatable structure.

## The small modern stack that really deserves a place

You do not need twenty utilities.

### Highest-return tools

| Tool | Why it is worth keeping |
|------|--------------------------|
| **ripgrep (`rg`)** | Very fast text search |
| **fd** | Simpler file search than classic commands |
| **bat** | More readable file viewing |
| **zoxide** | Faster movement between frequent folders |
| **fzf** | Interactive fuzzy filtering when you want faster search |

### More optional

| Tool | When it becomes useful |
|------|------------------------|
| **eza** | If you want more readable listings and tree views |

The right adoption order is simple:
- `rg`
- `fd`
- `zoxide`
- then the rest if you feel the need

## Installation: keep the base simple

If you want to install these tools, **Scoop** remains a good secondary layer for CLI tools.

But keep the broader module hierarchy in mind:
- `winget` for the general software baseline
- `Scoop` mainly to enrich the terminal environment

## Alternatives to Windows Terminal

Other emulators do exist:
- **WezTerm**
- **Alacritty**
- **Tabby**
- **Hyper**

But I do not recommend them as the starting point for most users.

They become interesting if you want:
- deeper configuration
- a particular style
- a specific need around SSH, multiplexing, or aesthetics

Otherwise, staying with **Windows Terminal** avoids unnecessary complexity.

## What to avoid

- adopting CLI as an identity instead of using it as leverage
- installing too many tools before you have a real use case
- jumping to WSL without a clear reason
- forcing a purely visual one-off task into the terminal

## Recommended workflow

**Minimal**:
- Windows Terminal
- PowerShell 7
- a few useful commands

**Pragmatic**:
- `rg`, `fd`, `zoxide`
- terminal for search, batch work, and installs
- saved commands or scripts when a task repeats

**Personal system**:
- PowerShell 7 as the base
- WSL when justified
- a small stable CLI stack you actually master

:::note[Practical exercise]
Find one task you often do with the mouse:

1. find a file
2. search text
3. rename a batch
4. install several tools

Pick just one and learn the terminal version. If it saves you time twice in a row, it deserves a place in your system. If not, stay in the GUI without guilt.
:::

### Chapter References (Go Further)

<a id="ref-cognitive-offloading"></a>1) **Cognitive offloading** — Evan F. Risko & Sam J. Gilbert (2016), *Cognitive Offloading* — [Trends in Cognitive Sciences, Cell Press](https://www.sciencedirect.com/science/article/pii/S1364661316300468)

<a id="ref-cognitive-load"></a>2) **Cognitive load (working memory load)** — Fred Paas & Jeroen J. G. van Merriënboer (2020), *Cognitive-Load Theory: Methods to Manage Working Memory Load in the Learning of Complex Tasks* — [Current Directions in Psychological Science, SAGE](https://journals.sagepub.com/doi/10.1177/0963721420922183)

<a id="ref-task-switching"></a>3) **Task switching costs** — Joshua S. Rubinstein, David E. Meyer & Jeffrey E. Evans (2001), *Executive Control of Cognitive Processes in Task Switching* — [Journal of Experimental Psychology: Human Perception and Performance, APA](https://psycnet.apa.org/record/2001-06771-013)

<a id="ref-windows-terminal"></a>4) **Windows Terminal (official documentation)** — Microsoft Learn — [Windows Terminal](https://learn.microsoft.com/windows/terminal/)

### Technical Concept Deep Dives

<a id="concept-cognitive-offloading"></a>#### Cognitive offloading (repeatability)
A saved command, script, or reusable procedure offloads part of the control problem: you no longer have to keep the full sequence “in mind” each time.
Scientific source: [1](#ref-cognitive-offloading)

<a id="concept-cognitive-load"></a>#### Cognitive load (when GUI becomes slow)
When a task requires too many small decisions, clicks, and exceptions, working memory gets consumed by “piloting” instead of the outcome. A good CLI often reduces this extraneous load.
Scientific source: [2](#ref-cognitive-load)

<a id="concept-task-switching-cost"></a>#### Task switching costs (repeating a sequence)
The more you chain micro-steps and back-and-forth moves, the more you pay resumption costs (where was I, what is next). Reproducible workflows reduce those restarts.
Scientific source: [3](#ref-task-switching)
