---
title: "Coder sur mobile — Introduction"
description: "Développer depuis un terminal mobile (Termux) : setup, connexion SSH/Mosh, et workflow pour travailler depuis n'importe où."
sidebar:
  label: "Introduction"
  order: 1
---

Coder depuis un téléphone n'est pas qu'une solution de secours. C'est une **productivité discrète** qui te permet de progresser depuis n'importe où, sans sac, sans ordinateur.

> Quand tu n'as qu'un écran tactile, tu deviens plus clair, plus concis, plus direct.

## Le vrai sujet

Ce module te montre comment :
- configurer Termux pour un accès serveur optimisé
- comprendre pourquoi SSH ≠ Mosh pour les outils IA
- coder avec OpenCode/KiloCode depuis mobile
- structurer ton workflow pour la mobilité

## Architecture du workflow

```
[Ton téléphone]           [Ton serveur Hetzner]
┌─────────────────┐        ┌──────────────────────┐
│  Termux (app)   │        │  Serveur Linux       │
│                 │        │                      │
│  ┌───────────┐  │   SSH  │  ┌────────────────┐  │
│  │ Terminal  │─────────→│  │ SSH daemon     │  │
│  └───────────┘  │        │  └────────────────┘  │
│                 │        │                      │
│  ┌───────────┐  │   Mosh │  ┌────────────────┐  │
│  │   Mosh    │─────────→│  │ Mosh daemon    │  │
│  └───────────┘  │        │  └────────────────┘  │
└─────────────────┘        └──────────────────────┘
```

## Ce que tu vas recevoir

- Un serveur qui tourne 24/7 avec tous les outils IA
- Termux comme client terminal minimal
- SSH pour le codage intensif (TUI)
- Mosh pour la navigation mobile (reconnexion automatique)

:::note[À savoir avant de commencer]
Termux ne supporte **pas** l'installation d'outils IA lourds. Claude, OpenCode, KiloCode, Codex tournent sur ton serveur, pas sur le téléphone.

C'est une **force**, pas une limitation : ton téléphone reste rapide, et tous les calculs lourds arrivent au bon endroit.
:::