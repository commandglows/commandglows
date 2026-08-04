# CommandGlows - Classes de Composants Globales

Ce fichier documente toutes les classes CSS réutilisables définies dans `src/assets/styles/global.css`.

## 🎯 Pourquoi des Classes Globales ?

- **Cohérence** : Styles identiques partout
- **Maintenance** : Un seul endroit à modifier
- **Performance** : Classes réutilisées au lieu de répétées
- **DRY** : Don't Repeat Yourself

---

## 🎨 Classes Disponibles

### Boutons CTA

#### `.btn-primary`
Bouton principal avec fond sombre et hover magenta/rainbow.

**Usage :**
```html
<button class="btn-primary">
  Acheter Maintenant
</button>
```

**Styles appliqués :**
- Fond : `bg-gray-900` → hover `bg-magenta` ou `bg-gradient-rainbow`
- Texte : `text-white`
- Border : `rounded-xl`, `border-2 border-transparent`
- Focus : `ring-magenta`
- Responsive : Tailles et padding adaptés (mobile → desktop)

---

#### `.btn-secondary`
Bouton secondaire avec bordure et hover fill magenta.

**Usage :**
```html
<button class="btn-secondary">
  En Savoir Plus
</button>
```

**Styles appliqués :**
- Fond : `bg-neutral-100` → hover `bg-magenta`
- Texte : `text-gray-900` → hover `text-white`
- Border : `border-gray-400` → hover `border-magenta`
- Focus : `ring-magenta`

---

#### `.btn-rainbow`
Bouton avec gradient rainbow complet (pour CTAs importantes).

**Usage :**
```html
<a href="#" class="btn-rainbow">
  Commencer Maintenant
</a>
```

**Styles appliqués :**
- Fond : `bg-gradient-rainbow`
- Texte : `text-white`
- Hover : `opacity-90`
- Idéal pour : Pricing CTAs, Actions principales

---

### Cartes

#### `.card-rainbow-border`
Carte avec bordure rainbow de 3px (technique de double div).

**Usage :**
```html
<div class="card-rainbow-border">
  <div class="bg-neutral-900 p-6">
    <!-- Contenu de la carte -->
  </div>
</div>
```

**Comment ça marche :**
1. Container `.card-rainbow-border` crée la bordure rainbow avec `::before`
2. L'enfant direct a `m-[3px]` pour laisser voir la bordure
3. Effet : Bordure rainbow de 3px avec fond solide lisible

**Idéal pour :**
- Pricing cards "Populaire"
- Cartes premium
- Éléments mis en avant

---

### Liens

#### `.link-active`
État actif/sélectionné pour les liens de navigation.

**Usage :**
```html
<a href="/products" class="link-active">
  Produits
</a>
```

**Styles :**
- `text-magenta` (light & dark mode)

---

#### `.link-hover`
État hover pour les liens.

**Usage :**
```html
<a href="/about" class="link-hover">
  À Propos
</a>
```

**Styles :**
- `hover:text-magenta` (light & dark mode)

---

### Badges

#### `.badge-rainbow`
Badge avec fond gradient rainbow.

**Usage :**
```html
<span class="badge-rainbow">Populaire</span>
```

**Styles :**
- Fond : `bg-gradient-rainbow`
- Texte : `text-white`, uppercase, bold
- Forme : `rounded-full`

---

#### `.badge-neutral`
Badge neutre pour états secondaires.

**Usage :**
```html
<span class="badge-neutral">Standard</span>
```

**Styles :**
- Fond : `bg-neutral-200` / `dark:bg-neutral-700`
- Texte : `text-neutral-600` / `dark:text-neutral-300`

---

### Effets de Texte

#### `.text-rainbow`
Texte avec gradient rainbow (effet transparent).

**Usage :**
```html
<h1 class="text-rainbow">CommandGlows</h1>
```

**Styles :**
- `bg-gradient-rainbow`
- `bg-clip-text`
- `text-transparent`

**Note :** Fonctionne mieux sur texte large/bold.

---

## 🔄 Migration des Composants Existants

### Avant (dans PrimaryCTA.astro)
```javascript
const baseClasses = "font-pj inline-flex w-full items-center justify-center rounded-xl border-2 border-transparent px-6 py-2.5 text-lg font-bold text-white...";
const bgColorClasses = "bg-gray-900 hover:bg-magenta...";
// etc.
```

### Après
```html
<a class="btn-primary" href={url}>
  {title}
</a>
```

**Avantages :**
- 90% moins de code
- Styles cohérents automatiquement
- Un seul endroit à modifier

---

## 📝 Conventions de Nommage

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `.btn-` | Boutons | `.btn-primary`, `.btn-rainbow` |
| `.card-` | Cartes | `.card-rainbow-border` |
| `.badge-` | Badges | `.badge-rainbow` |
| `.link-` | États de liens | `.link-active`, `.link-hover` |
| `.text-` | Effets de texte | `.text-rainbow` |

---

## 🎨 Personnalisation

Pour modifier les styles globaux, éditez :
```
src/assets/styles/global.css
```

Section : `@layer components { ... }`

**Exemple - Modifier le hover du btn-primary :**
```css
.btn-primary {
  /* ... autres styles ... */
  @apply hover:bg-gradient-rainbow; /* Au lieu de hover:bg-magenta */
}
```

Tous les boutons utilisant `.btn-primary` seront automatiquement mis à jour !

---

## ✅ Checklist de Migration

Pour migrer un composant existant :

1. [ ] Identifier les patterns répétés (buttons, links, badges)
2. [ ] Remplacer par les classes globales appropriées
3. [ ] Supprimer les variables de classes JavaScript si inutilisées
4. [ ] Tester en light et dark mode
5. [ ] Vérifier la responsivité (mobile → desktop)

---

## 🚀 Classes à Créer (Future)

- `.btn-ghost` - Bouton transparent
- `.btn-outline-rainbow` - Bouton avec bordure rainbow
- `.input-rainbow` - Input avec focus rainbow
- `.card-gradient` - Carte avec fond gradient subtil
- `.section-title` - Titre de section standardisé

---

## 📚 Ressources

- **Fichier source** : `src/assets/styles/global.css`
- **Tailwind Config** : `tailwind.config.mjs` (couleurs rainbow définies)
- **Documentation couleurs** : `docs/BRANDING_SPECIFICATION.md`
- **Documentation design** : `docs/DESIGN_SPECIFICATION.md`

---

*Dernière mise à jour : 10 janvier 2026*
