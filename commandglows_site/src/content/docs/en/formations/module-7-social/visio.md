---
title: "Meetings & Video Calls"
description: "Cut unnecessary meetings, improve the quality of your video calls, and automate note-taking with AI tools."
sidebar:
  label: "Meetings & Video Calls"
  order: 3
---

The problem with meetings is not just the number of them. It is that they often become the default repair mechanism for badly prepared communication.
On video calls, there is also a specific fatigue component (nonverbal overload) that accumulates quickly.<sup>[1](#concept-video-meeting-fatigue)</sup> And every reactive meeting creates a structural interruption in your day.<sup>[2](#concept-interruptions)</sup>

A useful meeting is an **escalation path**:
- when async communication is no longer enough
- when a decision is blocked
- when a group needs real-time alignment now

> A good meeting does not exist to "move things forward" in general. It exists to unblock, decide, or synchronize what writing cannot resolve fast enough.

## When a meeting is justified

- you need a decision from multiple stakeholders
- you need to arbitrate between options in real time
- there is tension or ambiguity that gets worse in writing
- you need immediate team alignment

## When it probably is not

- simple information sharing
- passive document review
- a status update with no decision attached
- something that could have been clarified in a message, note, or short video

If the meeting mostly exists so people can read together what should have been sent earlier, it is not a necessary meeting. It is preparation debt.

## The CommandGlows decision framework

Before scheduling, ask four questions:

1. **Can the goal be reached another way?** document, Loom, comment, email
2. **What concrete output must exist at the end?**
3. **Who is truly required?**
4. **Can it be shorter?** 15 or 25 minutes instead of 30 or 60

The **[Should It Be a Meeting](https://shoulditbeameeting.com/)** tool gives you an interactive questionnaire to make the call. The CommandGlows rule: if the goal can be achieved with a 2-minute Loom video, it is not a meeting.

## The real goal

The real goal is not to have "nicer" meetings. It is:
- fewer default meetings
- fewer unnecessary participants
- more explicit decisions
- actions that actually leave the meeting

## The scheduling layer

If a meeting is legitimate, scheduling should stay light.

**[Rallly](https://rallly.co/)** is the open-source alternative to Doodle: clean interface, no sign-in required for participants, real-time voting on proposed times. Available as SaaS or self-hosted for better control over your data.

## The platform layer

Most of the time, the right choice is not the most innovative video platform. It is the one that is simplest for your participants.

| Tool | Strength | Price |
|------|----------|-------|
| **Google Meet / Zoom / Teams** | Standard tools, easy to deploy, broadly compatible | Variable |

When you choose a video platform, prioritize deployment simplicity, compatibility with the people you talk to, and technical reliability.

## The notes and follow-up layer

A meeting with no clear output simply recreates work later. That is where AI notetakers help.

These assistants join or accompany your calls, transcribe them, and extract decisions, summaries, and actions.

| Tool | Specialty | Privacy | Price |
|------|-----------|---------|-------|
| **[Otter.ai](https://otter.ai/)** | Real-time transcription, broad integrations, general-purpose adoption | Standard | Freemium |
| **[tl;dv](https://tldv.io/)** | Sales coaching, cross-meeting insights, European posture | High (EU) | Freemium |
| **[Fireflies.ai](https://fireflies.ai/)** | Search and query your meetings in natural language | Standard | Freemium |
| **[Superpowered](https://superpowered.me/)** | No bot, no recording, transcription from your device audio | Maximum | Paid |

:::tip[Choose based on your need]
- **General use**: Otter.ai
- **Sales and coaching**: tl;dv
- **Advanced insights**: Fireflies.ai
- **Critical confidentiality**: Superpowered
:::

## What to avoid

- scheduling a meeting with no expected output
- inviting extra people "just in case"
- using 60 minutes as the default duration
- using the meeting to share context that should have arrived earlier
- ending with no owner and no next action

## Multi-time-zone coordination

**Timezone Checker** lets you see everyone's local time at a glance and find reasonable slots without useless back-and-forth.

## Recommended workflow

**Minimalist**: Should It Be a Meeting + Google Meet or Zoom + clean human notes. Enough if you have few calls but too many bad habits.

**Pragmatic**: Rallly + Meet or Zoom + Otter.ai or tl;dv + Timezone Checker. A good fit for distributed teams.

**Confidential / demanding**: Rallly + Zoom/Meet/Teams + Superpowered. Prefer this when you want to limit bots and recording.

## Best practices

**Before**: share the agenda, define the expected output, distribute pre-reads, configure the notetaker if needed.

**During**: start on time, stick to the agenda, make decisions, and record action items with owner and deadline.

**After**: share notes quickly, move actions into your task manager, and notify owners.

:::note[Practical exercise]
For two weeks, track every meeting:

1. why it existed
2. what decision came out of it
3. how many people were truly useful
4. which ones could have been async or a written note

Goal: reduce meeting volume, but more importantly increase decision density per meeting.
:::

### Chapter references (to go further)

<a id="ref-video-meeting-fatigue"></a>1) **Video-meeting fatigue (Zoom fatigue)** — Jeremy N. Bailenson (2021), *Nonverbal Overload: A Theoretical Argument for the Causes of Zoom Fatigue* — [APA TMB](https://tmb.apaopen.org/pub/nonverbal-overload)

<a id="ref-interruptions"></a>2) **Interruptions and resumption cost** — Gloria Mark, Daniela Gudith, Ulrich Klocke (2008), *The Cost of Interrupted Work: More Speed and Stress* — [UCI PDF](https://www.ics.uci.edu/~gmark/chi08-mark.pdf)

### Technical concept deep dive

<a id="concept-video-meeting-fatigue"></a>#### Video-meeting fatigue (nonverbal overload)
Video calls add nonverbal overload (gaze, self-view, framing, constrained movement), which can make calls more draining than in-person conversations. The systems takeaway: reduce duration/frequency, allow camera-off when appropriate, and make outcomes explicit.
Scientific source: [1](#ref-video-meeting-fatigue)

<a id="concept-interruptions"></a>#### Interruptions and resumption cost
A badly placed meeting does not only cost its duration: it cuts a work session and imposes resumption cost. The systems takeaway: treat meetings as escalation and protect interruption-free blocks.
Scientific source: [2](#ref-interruptions)
