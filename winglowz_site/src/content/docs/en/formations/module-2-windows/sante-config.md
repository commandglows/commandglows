---
title: "System Health & Configuration"
description: "Build a healthy Windows baseline: visible storage, credible backup, clean installs, coherent networking, and hardware that is actually sufficient."
sidebar:
  label: "System Health"
  order: 2
---

Before adding productivity tools, you need a system that is not already slowing you down underneath.

> A productive Windows workstation does not begin with tweaks. It begins with a base that is healthy, visible, backed up<sup>[1](#concept-backup-recovery)</sup>, and coherent enough for your real work.

## The real issue: stabilize the foundation

This page is not about “optimizing Windows” in a vague sense. It is about the few layers that truly change the experience:
- knowing where storage is going
- avoiding data disaster
- installing cleanly
- correcting a few network or system bottlenecks
- judging whether your machine is truly insufficient or just poorly maintained

## The CommandGlows decision framework

When a machine feels slow, unstable, or painful, ask four questions:

1. **Is this a real hardware problem, or mainly clutter, disorder, and maintenance debt?**
2. **Do I actually know where my important files live and how to recover them?**
3. **Are my installs and settings replayable<sup>[2](#concept-configuration-management)</sup>, or is everything stored only in my memory?**
4. **What is the real bottleneck: storage, RAM<sup>[3](#concept-working-set)</sup>, network, software noise, or insufficient hardware?**

## 1. See before you clean

You cannot improve what you cannot see.

Before deleting anything, make storage usage visible.

### Tools that still make sense

| Tool | Role |
|------|------|
| **WizTree** | Fastest way to identify what is taking space on NTFS |
| **SpaceSniffer** | Best if a visual block map helps you spot large items |
| **TreeSize Free** | Good tree-style reading if you think in folders |

The right choice depends more on how you think than on technical superiority:
- **WizTree** if you want the fastest path to the answer
- **SpaceSniffer** if the visual map helps
- **TreeSize** if you prefer a clean folder tree

Then the right move is:
- do not delete randomly
- identify caches, duplicates, old exports, forgotten archives, large videos, and stale installs

## 2. The real storage issue: recovery

Storage is not only about free space. It is about continuity of work.

A badly managed file layer creates:
- perceived slowness
- confusion
- incomplete backups
- chaotic recovery after failure, theft, or mistakes

So the right question is not:
- “how many GB are left?”

The right question is:
- **if this PC dies tomorrow, what do I recover cleanly?**

## 3. Backup: invisible layer, enormous return

The minimum serious distinction is:
- **working storage**
- **backup**

A few simple rules already go far:
- keep important files in clear locations
- do not depend on one drive or one device
- keep at least one local or external copy
- ideally combine local and remote backup for what truly matters

Backup is not an “IT admin” topic. It is a productivity topic because it determines:
- recovery time
- stress level
- your ability to continue after an incident

## 4. DNS: a small setting, only when there is a real need

DNS is not a magic tweak. It is simply a resolution layer that can sometimes become a small bottleneck or a useful control point.

### The most useful profiles

| Option | When to use it |
|--------|----------------|
| **Cloudflare** | If you mainly want a fast, simple DNS |
| **Quad9** | If you want a basic network security layer |
| **NextDNS** | If you want more filtering, rules, and control |

The right reading is:
- **Cloudflare** = simple speed
- **Quad9** = simple security
- **NextDNS** = finer control

I would not change DNS by reflex. Do it if:
- the network feels inconsistent
- you want a broader filtering layer
- you know why you want that control

Otherwise, keep this secondary.

## 5. Install cleanly, rebuild fast

A strong modern Windows setup is not one where you download everything manually from 15 sites.

The best baseline reflex is:
- **winget** first
- Microsoft Store if that is cleaner for a well-integrated app
- manual download only as a last resort

### Why `winget` remains the serious base

Because it gives you:
- cleaner installs
- more coherent updates
- a tool list that is easier to replay
- an environment that is easier to document

The real gain is not the command line for its own sake. The real gain is reproducibility.

### What about the other package managers?

**Scoop** still makes sense mainly for:
- CLI tools
- more technical environments
- no-admin workflows

**Chocolatey** can still be useful in some cases, but it is no longer the starting point I would recommend first in the course.

So:
- **winget** for the base
- **Scoop** if you go deeper into CLI tools
- **Chocolatey** only if you have a specific reason

## 6. Portable vs installed: a control question

Many Windows tools exist in two forms:
- **installed**
- **portable**

The real question is not “which is better?” but:
- do I want comfortable integration?
- or do I want something more self-contained, movable, and easy to isolate?

In practice:
- **installed** for core workstation tools
- **portable** for testing, transport, or reduced system footprint

Understanding where apps and settings live is already part of mastering the workstation.

## 7. Desktop app vs SaaS: do not confuse convenience with control

A local app often gives you:
- more control
- better offline behavior
- more direct access to files and the system

A SaaS often gives you:
- more collaboration
- more synchronization
- more access everywhere

The right choice depends on your real work, but the right caution stays the same:
- the more convenient something is, the more invisible dependency you often accept

This is not about being dogmatic. It is about choosing consciously.

## 8. Is your machine actually insufficient?

Many people think they need a new PC when what they really have is:
- too many tabs
- not enough RAM for their workload
- an old HDD instead of an SSD
- too much software noise
- no discipline around closure or cleanup

### The components that truly change the experience

**RAM**
- `8 GB`: quickly limiting
- `16 GB`: comfortable baseline for most people
- `32 GB`: useful for serious multitasking, creation, dev, and heavier projects

**SSD**
- often the single biggest comfort jump if the machine is still on a spinning disk

**CPU**
- important if you compile, export, transform, or multitask heavily
- less useful to obsess over if the real issue lies elsewhere

The right reasoning is not:
- “what does the benchmark say?”

The right reasoning is:
- **where does my machine actually break my real flow?**

## Recommended workflow

**Minimal**:
- visualize the disk
- clean what is obvious
- keep a clear backup
- install with `winget`

**Pragmatic**:
- readable storage
- credible backup strategy
- DNS changed only for a real reason
- clear distinction between core apps and test tools

**Personal system**:
- documented, replayable setup
- clean software baseline
- consciously chosen dependencies
- hardware judgment based on workflow, not marketing

:::note[Practical exercise]
Do a simple machine audit:

1. identify what is really taking space
2. note where your important files live
3. write down how you would reinstall your main tools
4. name your real bottleneck: storage, RAM, network, software noise, or hardware

If you cannot answer those 4 points clearly, the problem is not yet “optimize Windows.” The problem is first to make the workstation legible.
:::

## Chapter References (Go Further)

<a id="ref-nist-contingency"></a>1) **Backup and recovery (contingency planning)** — NIST (2010), *SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems* — [NIST](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)

<a id="ref-nist-config-mgmt"></a>2) **Configuration management** — NIST (2011), *SP 800-128: Guide for Security-Focused Configuration Management of Information Systems* — [NIST](https://csrc.nist.gov/publications/detail/sp/800-128/final)

<a id="ref-working-set"></a>3) **Working set (memory, RAM, paging)** — Peter J. Denning (1968), *The Working Set Model for Program Behavior* — [DOI](https://doi.org/10.1145/363095.363141)

<a id="ref-winget"></a>4) **Windows Package Manager (winget)** — Microsoft Learn — [winget](https://learn.microsoft.com/windows/package-manager/winget/)

<a id="ref-storage-sense"></a>5) **Storage Sense (automatic cleanup)** — Microsoft Support — [Storage Sense in Windows](https://support.microsoft.com/windows/storage-sense-in-windows-5f6753f0-4b99-42a7-8f6e-5a9a0b8dfc8e)

## Technical Concept Deep Dives

<a id="concept-backup-recovery"></a>#### Backup and recovery (continuity)
A backup strategy is a productivity lever because it determines your resumption time after an incident (failure, theft, mistake). The goal is not “zero risk”, but clear, fast recovery.
Scientific source: [1](#ref-nist-contingency)

<a id="concept-configuration-management"></a>#### Replayable setup (configuration management)
Making an install “replayable” is about explicitly managing configuration (what is installed, how, and in what order). You reduce reliance on memory and reduce drift over time.
Scientific source: [2](#ref-nist-config-mgmt)

<a id="concept-working-set"></a>#### Working set (RAM, tabs, multitasking)
When your working set exceeds available RAM, the system compensates with disk activity (paging), which severely hurts responsiveness. That is why “too many tabs” plus “not enough RAM” quickly becomes real friction.
Scientific source: [3](#ref-working-set)
