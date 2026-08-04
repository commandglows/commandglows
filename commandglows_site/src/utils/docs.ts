import type { CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

export interface DocTreeNode {
  id: string;
  segment: string;
  label: string;
  href?: string;
  entry?: DocEntry;
  children: DocTreeNode[];
}

export interface DocPagerLink {
  href: string;
  label: string;
  title: string;
}

function titleFromSegment(segment: string) {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sidebarOrder(entry?: DocEntry) {
  return entry?.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER;
}

function sidebarLabel(entry?: DocEntry, segment?: string) {
  return entry?.data.sidebar?.label || entry?.data.title || titleFromSegment(segment || '');
}

function compareNodes(a: DocTreeNode, b: DocTreeNode) {
  const orderDiff = sidebarOrder(a.entry) - sidebarOrder(b.entry);
  if (orderDiff !== 0) return orderDiff;
  return a.label.localeCompare(b.label, 'fr');
}

function normalizePath(path: string) {
  return path === '/' ? '/' : path.replace(/\/+$/, '');
}

export function getDocLang(slug: string) {
  return slug.startsWith('fr/') ? 'fr' : 'en';
}

export function getEntrySlug(entry: Pick<DocEntry, 'id'>) {
  return entry.id.replace(/\.(md|mdx)$/, '').replace(/\/index$/, '');
}

export function getDocHref(slug: string) {
  return `/${slug}/`;
}

export function buildDocTree(entries: DocEntry[], lang: 'en' | 'fr') {
  const root: DocTreeNode = {
    id: lang,
    segment: lang,
    label: lang,
    children: [],
  };

  const localeEntries = entries
    .filter((entry) => getDocLang(getEntrySlug(entry)) === lang && !entry.data.draft && !entry.data.sidebar?.hidden)
    .sort((a, b) => getEntrySlug(a).localeCompare(getEntrySlug(b), 'fr'));

  for (const entry of localeEntries) {
    const entrySlug = getEntrySlug(entry);
    const segments = entrySlug.split('/').slice(1);
    let current = root;
    let currentPath: string = lang;

    for (const segment of segments) {
      currentPath = `${currentPath}/${segment}`;
      let child = current.children.find((node) => node.segment === segment);
      if (!child) {
        child = {
          id: currentPath,
          segment,
          label: titleFromSegment(segment),
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    current.entry = entry;
    current.href = getDocHref(entrySlug);
    current.label = sidebarLabel(entry, current.segment);
  }

  const sortTree = (node: DocTreeNode): DocTreeNode => {
    node.children = node.children.map(sortTree).sort(compareNodes);
    if (!node.label) node.label = sidebarLabel(node.entry, node.segment);
    return node;
  };

  return root.children.map(sortTree).sort(compareNodes);
}

function flattenNodes(nodes: DocTreeNode[], result: DocEntry[] = []) {
  for (const node of nodes) {
    if (node.entry) result.push(node.entry);
    if (node.children.length > 0) flattenNodes(node.children, result);
  }
  return result;
}

export function getDocPager(entries: DocEntry[], lang: 'en' | 'fr', currentSlug: string) {
  const tree = buildDocTree(entries, lang);
  const flat = flattenNodes(tree).filter((entry) => !entry.data.sidebar?.hidden);
  const currentIndex = flat.findIndex((entry) => getEntrySlug(entry) === currentSlug);

  const toLink = (entry: DocEntry | undefined, fallback: 'Previous' | 'Next'): DocPagerLink | undefined =>
    entry
      ? {
          href: getDocHref(getEntrySlug(entry)),
          label: fallback,
          title: entry.data.title,
        }
      : undefined;

  return {
    prev: toLink(flat[currentIndex - 1], lang === 'fr' ? 'Previous' : 'Previous'),
    next: toLink(flat[currentIndex + 1], lang === 'fr' ? 'Next' : 'Next'),
  };
}

export function isCurrentDoc(href: string | undefined, pathname: string) {
  if (!href) return false;
  return normalizePath(href) === normalizePath(pathname);
}

export function isActiveBranch(node: DocTreeNode, pathname: string): boolean {
  if (isCurrentDoc(node.href, pathname)) return true;
  return node.children.some((child) => isActiveBranch(child, pathname));
}
