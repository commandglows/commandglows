---
title: "Make The Web Accessible"
description: "Reduce web friction: a cleaner browser, RSS, calmer reading, and faster access to the content that matters."
sidebar:
  label: "Web Accessible"
  order: 2
---

The problem with the web is not only the amount of information. It is the friction: ads, trackers, infinite feeds, too many open tabs, poor interfaces, and too many useless steps between you and the content that matters.

> Making the web accessible does not mean making everything visible. It means removing what stands between you and the right content.

And “accessible” should not only mean “more comfortable for you.” If you publish or share content, web accessibility is also a baseline requirement (structure, navigation, contrast, keyboard focus). WCAG gives a concrete framework<sup>[1](#concept-wcag)</sup>.

## What this is really about

A well-configured web setup should let you:
- reach what you want quickly
- read in good conditions
- follow sources without being trapped by platforms
- keep few tabs, little noise, and few detours

## The CommandGlows decision framework

Whenever you change your browser or web flows, ask three questions:

1. **Does this reduce friction or add it?**
2. **Does this bring me closer to content or closer to the feed?**
3. **Does this deserve to be always visible, or only accessible when needed?**

That leads to three useful layers:

- **Layer 1: cleanup** - block noise, limit distraction
- **Layer 2: access** - shortcuts, bookmarks, profiles, simple organization
- **Layer 3: follow-up** - RSS, read-later, chosen streams

## What to avoid

- using the browser home page as a distraction portal
- keeping 80 tabs open "for later"
- following important sites only through social media
- stacking extensions with no logic
- confusing accessibility with permanent overload

## Accessibility (WCAG): invisible friction

When a page is poorly structured, low-contrast, or impossible to navigate with a keyboard, you add cognitive friction that is easy to miss but expensive across every reading session.

The right mental model is the same as for building a “calm web”:
- make content **perceivable**
- make interfaces **operable** (keyboard, focus, navigation)
- make flows **understandable**
- make things **robust** (compatible with assistive tech)

These are WCAG’s POUR principles<sup>[2](#concept-pour)</sup>.

## The cleanup layer

Start by removing structural noise.

Extensions that are still clearly defensible:
- **[uBlock Origin](https://ublockorigin.com/)** for ads and trackers
- **[Dark Reader](https://darkreader.org/)** if visual comfort genuinely helps you
- **[Bitwarden](https://bitwarden.com/)** to move passwords out of your head and random notes

The right principle is: fewer extensions, but extensions that remove friction instead of adding it.

## The access layer

Your browser should give you quick access, not become a chaotic storage surface.

Simple rules:
- keep only 5 to 8 truly useful bookmarks
- separate work and personal browsing with profiles
- pin your core tools
- turn frequent searches into keywords or shortcuts

If you always open the same things in the same contexts, the problem is not memory. It is the absence of shortcuts.

## The tab layer

An open tab is not a reliable system.

You have three healthy options:
- read now
- save into a real reading or archive layer
- close it

For Firefox users, **[Tab Stash](https://addons.mozilla.org/en-US/firefox/addon/tab-stash/)** remains a clean option for emptying tabs without losing them.

## The RSS layer

RSS is still the best way to follow the web without algorithms.

It just needs a better primary recommendation.

### Main recommendation: [Inoreader](https://www.inoreader.com/)

Inoreader is now the strongest recommendation if you want a solid all-purpose RSS reader:
- clean web reading
- folders, tags, and rules
- newsletters and feeds in the same system
- simple enough to start, strong enough to keep

### Strong alternative: [Feedly](https://feedly.com/news-reader)

Feedly is still excellent if you want:
- a very accessible interface
- a more reader-oriented experience than a power-user dashboard
- the option to grow into more professional monitoring later

### Feedboard: secondary option

**[Feedboard](https://feedboard.app/)** still exists and may appeal to people who like a column-based dashboard style. But I would no longer recommend it as the main choice for this lesson.

## The reading layer

When you find something good, you then need to read it calmly.

Depending on your need:
- **RSS reader** to follow sources
- **Reader / read-later** to actually read later
- **bookmark manager** to archive

The bad system is keeping everything inside tabs.

## Which browser to choose

The right browser is not the one with the longest feature list. It is the one in which your system stays simple.

- **[Firefox](https://www.mozilla.org/firefox/)** if you value privacy, containers, and a calmer environment
- **[Vivaldi](https://vivaldi.com/)** if you want a very configurable browser with many built-in tools
- **[Brave](https://brave.com/)** if you want fast Chromium plus built-in blocking with minimal setup

The real question is: which one requires the least extra tinkering to get you a calm web?

### Chapter references (to go further)

<a id="ref-wcag-22"></a>1) **WCAG 2.2 (standard)** — W3C (2023), *Web Content Accessibility Guidelines (WCAG) 2.2* — [W3C TR](https://www.w3.org/TR/WCAG22/)

<a id="ref-wai-understanding-intro"></a>2) **Understanding WCAG (intro)** — W3C WAI, *Introduction to Understanding WCAG 2.2* — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/intro)

<a id="ref-mdn-understanding-wcag"></a>3) **Practical guide** — MDN, *Understanding the Web Content Accessibility Guidelines (WCAG)* — [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG)

### Deeper technical concepts

<a id="concept-wcag"></a>#### WCAG (Web Content Accessibility Guidelines)
WCAG provides a testable standard for web accessibility. Even without a compliance goal, following WCAG reduces reading/navigation friction and improves overall quality.
Sources: [1](#ref-wcag-22), [2](#ref-wai-understanding-intro)

<a id="concept-pour"></a>#### POUR (Perceivable, Operable, Understandable, Robust)
POUR is a compact framing of WCAG’s intent: make content perceivable, interfaces operable, flows understandable, and implementations robust across devices and assistive tech.
Source: [1](#ref-wcag-22)

## Recommended workflow

**Minimalist**:
- one well-configured browser
- uBlock Origin
- a few clean bookmarks
- one RSS reader

**Pragmatic**:
- separate profiles
- search shortcuts
- RSS plus a reading tool
- strict tab discipline

**Calm power user**:
- Firefox or Vivaldi
- Inoreader or Feedly
- separate reading / archive layer
- zero native feeds you did not explicitly choose

## Simple rules

1. your browser should open on something neutral
2. chosen streams beat algorithmic platforms
3. a tab is not a note
4. what you use often should be one click or one command away

:::note[Practical exercise]
For one week:

1. clean your home page and bookmarks
2. remove or disable weak extensions
3. choose one main RSS reader
4. force yourself to either close or save each tab instead of accumulating it
:::
