# ✅ NOTE SOURCE — TUI

Objectif :
- garder une base propre sur les interfaces textuelles utiles
- préparer un futur angle premium sur les outils terminaux qui améliorent vraiment la vitesse
- éviter le mélange entre culture terminal, définitions de base et tuto d'installation

## Ce qu'il faut retenir

- ((TUI = interface textuelle interactive, plus riche qu'une CLI brute, plus légère qu'une GUI))
- ((intérêt réel : vitesse clavier, faible friction, accès distant, usage terminal continu))
- ((pas un sujet à traiter pour tout le monde : surtout utile pour profils clavier-first, devs, power users))
- ((dans CommandGlows, le bon angle n'est pas "retro-geek", mais "réduire la friction sur les tâches répétitives"))

## Exemples utiles à garder

- ((fzf pour recherche floue dans fichiers, historique, branches, processus))
- ((lazygit / gitui pour workflows Git plus rapides dans le terminal))
- ((yazi / ranger / midnight commander pour navigation fichiers si la souris devient un frein))
- ((btop / htop pour surveillance système rapide))

## Positionnement CommandGlows

- bon sujet si :
  - tu vis déjà dans le terminal
  - tu fais souvent les mêmes recherches ou manipulations
  - tu veux accélérer navigation, sélection, lancement, Git, inspection système
- moins bon sujet si :
  - tu fais surtout des tâches visuelles ponctuelles
  - tu n'as pas encore adopté les bases CLI sous Windows
  - tu veux d'abord une meilleure GUI avant de complexifier ton setup

## Focus à garder sur `fzf`

- ((outil central pour la recherche floue interactive))
- ((gros usage : historique shell, ouverture de fichiers, sélection de processus, branches Git))
- ((vraie valeur quand il est combiné avec rg, fd, bat, zoxide, git))
- ((bon candidat à intégrer plus tard dans le module terminal, pas comme note isolée))

## Ce qu'un futur cours premium pourrait enseigner

- quand une TUI vaut le coup vs une GUI
- `fzf` comme couche de sélection universelle
- mini stack terminal moderne :
  - `rg`
  - `fd`
  - `bat`
  - `fzf`
  - `zoxide`
- quelques TUI à très fort levier, pas une encyclopédie

## Sources à garder

- ((site officiel ou GitHub de fzf))
- ((exemples de TUI modernes réellement maintenues))
- ((docs/outils shell déjà cités dans le module terminal))

## 🔶 À TRIER

- à revoir plus tard :
  stack TUI moderne par usage, comparaison lazygit vs gitui, file managers TUI selon profil
- ne pas réinjecter tel quel :
  définition trop scolaire de "c'est quoi une TUI", tuto d'installation basique, exemples gadget sans lien avec la productivité
