---
title: "Automation"
description: "Automate repetitive Windows tasks with macros, scripts, and launchers."
sidebar:
  label: "Automation"
  order: 5
---

> If you do the same thing more than three times, it is time to automate it.

## How to spot good automation opportunities

The classic mistake is trying to automate what looks impressive instead of what is genuinely costly. Good automation does not start with a tool. It starts with a clear source of friction.

Start by looking for tasks that have several of these traits:
- they happen often
- they usually follow the same steps
- they consume attention more than judgment
- they create errors when you do them tired or too fast
- they feel like work even though you are mostly executing a routine<sup>[2](#concept-habit-formation)</sup>

The best quick wins are often simple:
- opening the same apps every morning
- inserting the same replies or message structures
- renaming files according to a recurring pattern
- extracting the same fields from emails or PDFs
- moving through the same sequence of screens to complete an action

The right reflex is:
1. write down the exact repetitive task
2. describe the real steps, not the idealized version
3. ask whether the process is stable or constantly changing
4. then choose the right level of automation

Not every problem needs the same tool:
- a simple visual routine can start with a macro recorder
- durable personal logic often justifies AutoHotkey
- repetitive web workflows can go through Automa
- heavier business processes may belong in RPA<sup>[3](#concept-automation-bias)</sup>

The goal is not to "do automation." The goal is to remove mechanical work from your system so your attention stays available for what actually requires judgment.

## Macro recorders

The idea is simple: record a sequence of actions (clicks, keystrokes), then replay it whenever you want. No coding required.

### Recommended tools

| Tool | Complexity | Strengths |
|------|------------|-----------|
| **TinyTask** | Very simple | Single file, no installation, ideal for quick macros |
| **Jitbit Macro Recorder** | Medium | Clear interface, can edit steps after recording |
| **Pulover's Macro Creator** | Advanced | Generates AutoHotkey code, bridge to advanced automation |

**Typical use cases**: filling out a recurring form, renaming files in bulk, sending a template message, running a testing routine.

### Macro recorder limitations

Recorded macros are fragile. If a window moves or a button shifts, the macro fails. For robust automation, you need scripting.

### When a recorded macro is enough, and when to move to scripting

A recorded macro is often enough if:
- the steps are always exactly the same
- the interface rarely changes
- you want a fast win without technical investment
- occasional failure does not carry a meaningful cost

Examples:
- opening the same sequence of menus
- running a small testing routine
- reproducing a very stable chain of clicks

You should move to scripting as soon as:
- windows are not always in the same place
- you need conditions or variants
- you want to chain actions intelligently instead of replaying a movie
- the automation becomes important to your actual work

In other words:
- a recorded macro is a good starting point
- a script is the right tool when you want durability, logic, and long-term leverage

If you feel like you spend more time repairing a macro than gaining time from it, that is usually the signal to move to AutoHotkey or another more robust form of automation.

## AutoHotkey: automation without limits

AutoHotkey (AHK) is a scripting language built for Windows. It lets you create shortcuts<sup>[1](#concept-implementation-intentions)</sup>, remap keys, automate tasks, and even build graphical interfaces.

This point matters: **AutoHotkey is not just a text expander**. It is a real Windows automation toolbox. If you want to turn your system into a custom-built workshop, it is probably one of the highest-leverage tools you can learn.

### Concrete examples

**Remap a key:**
```txt
; Turn Caps Lock into Escape
CapsLock::Esc
```

**Create a text shortcut:**
```txt
; Typing "@@" inserts your email address
::@@::your.email@example.com
```

**Launch an app with a shortcut:**
```txt
; Win + N opens Notepad
#n::Run, notepad.exe
```

**Shortcut for multi-line text:**
```txt
; Ctrl + Shift + S inserts a signature
^+s::
SendInput, Best regards,{Enter}Your Name{Enter}Your Title
return
```

### What AutoHotkey can actually do

Beyond hotstrings, AHK can help you:
- create custom system-wide **hotkeys**
- fully **remap** your keyboard
- launch apps, files, URLs, or searches
- chain multiple actions into a **macro**
- detect windows, switch focus, and send keys to the right program
- automate text, but also clicks, menus, dialogs, and repetitive UI behavior
- display small **GUIs** or input boxes
- build personal workflows that Windows does not provide out of the box

In other words, AHK can cover:
- text expansion
- keyboard automation
- productivity macros
- part of window management
- a lot of glue logic between tools

### How to get started with AHK

1. Install AutoHotkey v2 from the official website
2. Create a `.ahk` file with Notepad
3. Write your first script (start with a simple remap)
4. Double-click the file to run it
5. Put your essential scripts in the Startup folder so they launch automatically

## Snippet managers: reuse text instead of retyping it

A snippet manager is not a clipboard manager. Its purpose is not to remember what you just copied, but to let you instantly insert blocks of text you reuse often.

Typical examples:
- email signatures
- customer support replies
- outreach messages
- AI prompts
- report structures
- frequent links and resources

The simplest way to get this behavior on Windows is often to use **AutoHotkey** as a text expander, especially if you also want to go further into automation.

Example:

```txt
; Typing /sig inserts a full signature
::/sig::Best regards,{Enter}Your Name{Enter}CommandGlows
```

For more advanced needs, you can also look at dedicated tools like **Beeftext** or **PhraseExpress**. What matters most is not the tool but the reflex: any text you keep retyping should probably become a snippet.

### Which tool should you choose?

| Tool | Best use | Best for |
|------|----------|----------|
| **AutoHotkey** | Snippets + hotkeys + macros + scripts | Windows users who want a long-term leverage tool |
| **Trigr** | Visual hotkeys + macros + text expansion | Windows users who want a no-code bridge before scripting |
| **QuickTextPaste** | Text shortcuts plus quick command/program launching | A good middle ground if you want speed before moving into scripting |
| **Beeftext** | Simple local open-source text expansion | A clean choice if you just want reliable snippets without heavy complexity |
| **PhraseExpress** | Advanced snippet library, forms, multiple triggers, deep organization | Better for intensive users or professional/team needs, with much more power and more complexity |

**Our take**:
- if you want a simple free tool to replace text everywhere, **Beeftext** is very clean
- if you want to combine visual hotkeys, macros, and text expansion without writing scripts yet, **Trigr** is worth testing as a newer no-code bridge
- if you also want to bind snippets to shortcuts or launch a few simple commands without writing scripts yet, **QuickTextPaste** is a strong bridge tool
- if you want a rich template system with advanced features, **PhraseExpress** is extremely powerful
- if you want to learn one tool that goes far beyond text expansion, **AutoHotkey** has the highest leverage ceiling

Trigr is especially interesting when you are not ready to maintain AutoHotkey scripts but already feel the need for several layers at once: global hotkeys, simple macros, and reusable text. Treat it as an evaluation candidate, not as a replacement for the underlying decision framework. The question remains the same: which repeated action costs enough attention to deserve a trigger?

## Browser automation

### Automa

Automa is a browser extension that lets you automate web workflows through a visual block-based interface. No code required.

**What you can do:**
- Fill out forms automatically
- Extract data from web pages (light scraping)
- Chain actions across multiple pages
- Schedule recurring runs

### Browser Automation Studio (BAS)

BAS is more powerful than Automa, but also more complex. It handles proxies, multiple profiles, and advanced scenarios. Use it when Automa is no longer enough.

### Parsio

Parsio is useful when your real problem is no longer "opening an email," but **extracting the same information over and over** from messages, attachments, or documents.

Typical use cases:
- automatically capturing data from order confirmations
- extracting fields from PDFs received by email
- sending that data into Google Sheets, Zapier, Make, or another workflow

It is not a focus tool. It is a tool for removing repetitive manual work. That is exactly why it matters: every administrative copy-paste you eliminate gives you back time and attention.

## Application launchers

Opening an app through the Start menu is slow. A launcher lets you type a few letters and open anything instantly.

### Launcher comparison

| Launcher | Speed | Extra features | Open-source |
|----------|-------|----------------|-------------|
| **Flow Launcher** | Fast | Plugins, calculator, web search | Yes |
| **Listary** | Very fast | Explorer integration, file search | No (freemium) |
| **Wox** | Fast | Plugins, themes | Yes |
| **PowerToys Run** | Fast | Built into PowerToys, no separate install | Yes |

**Our recommendation**: Flow Launcher for its active community and plugin ecosystem, or PowerToys Run if you already use PowerToys.

### How to choose your launcher

Not every launcher solves the same problem:
- **Flow Launcher**: the best starting point if you want a modern, extensible, still-living launcher
- **PowerToys Run**: a very good choice if you want something simple, clean, and already integrated into your Windows setup
- **Listary**: especially strong if your real bottleneck is not app launching itself, but moving quickly through files and Explorer

You may also come across older tools like **Wox** or **Find and Run Robot**. They are still worth knowing as references or secondary alternatives, but we do not put them at the center of the course:
- **Wox** mattered historically, but is less compelling today next to Flow Launcher
- **Find and Run Robot** remains a solid veteran launcher for some power users, but it is more a legacy tool than a modern premium recommendation

### Universal shortcut

Set your launcher to `Alt + Space`. That is the de facto standard. Press it, type, validate - three gestures to open anything.

### Think in launch sequences, not only isolated apps

The real win does not only come from opening one application faster. It comes from **rebuilding a full work context** in seconds.

Examples of useful sequences:
- **Morning routine**: email, calendar, tasks, daily note
- **Writing session**: editor, minimal browser, music, project folder
- **Client session**: CRM, drive, messaging, meeting, follow-up note
- **Research session**: browser with the right tabs, read-later tool, capture tool

As soon as you often open the same set of tools together, you should stop rebuilding that setup manually every day.

You can launch this kind of sequence in several ways:
- with a launcher and well-chosen favorites
- with an AutoHotkey script
- with shortcuts to folders, web pages, or specific apps
- with a browser that can reopen a prepared workspace or session

The principle is simple: the cleaner your session startup is, the less friction you face before the real work begins.

## Launch programs at startup

To launch a program or script automatically:

1. Press `Win + R`, type `shell:startup`, and confirm
2. Drop a **shortcut** (not the original file) for your program into that folder
3. That is it. At the next boot, it will launch automatically.

For a more deliberate review of which apps should launch at boot, also see the [Ergonomics](./ergonomie) chapter, which covers startup management through Task Manager.

## Introduction to RPA

RPA (Robotic Process Automation) takes automation to the professional level. Instead of automating one task, you automate whole processes.

**OpenIAP** is an open-source RPA platform that lets you:
- Orchestrate workflows across multiple applications
- Manage task queues
- Connect software robots to APIs

It is an advanced topic, but if you work with repetitive processes at scale, it is worth a look.

## Official resources

- [AutoHotkey](https://www.autohotkey.com/) - the core tool for hotkeys, hotstrings, and Windows scripts.
- [Trigr](https://usetrigr.com/) - a Windows tool positioned around visual hotkeys, macros, and text expansion without scripting.
- [QuickTextPaste](https://www.softwareok.com/?seite=Microsoft/QuickTextPaste) - the lightweight utility for text insertion and shortcut-triggered commands.
- [Beeftext](https://beeftext.org/) - a simple local text expander.
- [PhraseExpress](https://www.phraseexpress.com/) - a more advanced snippet library for heavy use.
- [Flow Launcher](https://www.flowlauncher.com/) - the launcher we recommend for keyboard-first workflows.
- [Microsoft PowerToys](https://github.com/microsoft/PowerToys) - useful if you also want PowerToys Run in the same suite.
- [Listary](https://www.listary.com/) - very strong if you spend a lot of time navigating files and Explorer.
- [Wox](https://github.com/Wox-launcher/Wox) - a historical alternative that is now more secondary.
- [Find and Run Robot](https://www.donationcoder.com/Software/Mouser/findrun/index.html) - a veteran launcher still worth knowing for some advanced users.

## Chapter References (Go Further)

<a id="ref-implementation-intentions"></a>1) **Implementation intentions (“if-then” plans)** — Peter M. Gollwitzer (1999), *Implementation intentions: Strong effects of simple plans* — [American Psychologist, APA](https://psycnet.apa.org/record/1999-10179-001)

<a id="ref-habit-formation"></a>2) **Habit formation** — Phillippa Lally et al. (2010), *How are habits formed: Modelling habit formation in the real world* — [European Journal of Social Psychology, Wiley](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674)

<a id="ref-automation-misuse"></a>3) **Automation: misuse / disuse / complacency** — Raja Parasuraman & Victor Riley (1997), *Humans and Automation: Use, Misuse, Disuse, Abuse* — [Human Factors](https://journals.sagepub.com/doi/10.1518/001872097778543886)

<a id="ref-autohotkey-docs"></a>4) **AutoHotkey (official documentation)** — [AutoHotkey Documentation](https://www.autohotkey.com/docs/)

<a id="ref-windows-startup-folder"></a>5) **Startup folder / run at startup (official guidance)** — Microsoft Support — [Add an app to run automatically at startup in Windows](https://support.microsoft.com/windows/add-an-app-to-run-automatically-at-startup-in-windows-0f7b75b5-62c5-4a4f-a8c4-1c8f24321d86)

## Technical Concept Deep Dives

<a id="concept-implementation-intentions"></a>#### Implementation intentions (hotkeys, rules, triggers)
“If-then” plans (for example: “if I open a project, then I launch this exact app set”) turn a vague intention into a concrete trigger. This maps well to hotkeys, hotstrings, startup routines, and lightweight automation.
Scientific source: [1](#ref-implementation-intentions)

<a id="concept-habit-formation"></a>#### Habit formation (routines)
When a sequence is stable and repeated, it becomes more automatic and requires less deliberate effort. Automation tends to pay off most when it stabilizes a routine that truly comes back.
Scientific source: [2](#ref-habit-formation)

<a id="concept-automation-bias"></a>#### Automation bias / complacency (RPA)
The more reliable an automation seems, the easier it is to loosen monitoring (missed errors, later detection). For RPA, keep guardrails: logging, checks, and clear stop points.
Scientific source: [3](#ref-automation-misuse)
