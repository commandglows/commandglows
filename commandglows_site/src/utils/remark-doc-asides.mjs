import { visit } from 'unist-util-visit';

const VARIANTS = new Set(['tip', 'note', 'caution', 'danger', 'success']);

function getDirectiveLabel(node) {
  if (typeof node.label === 'string' && node.label.trim()) return node.label.trim();
  if (typeof node.attributes?.label === 'string' && node.attributes.label.trim()) {
    return node.attributes.label.trim();
  }
  if (typeof node.attributes?.title === 'string' && node.attributes.title.trim()) {
    return node.attributes.title.trim();
  }
  return node.name.charAt(0).toUpperCase() + node.name.slice(1);
}

export function remarkDocAsides() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type !== 'containerDirective' &&
        node.type !== 'leafDirective' &&
        node.type !== 'textDirective'
      ) {
        return;
      }

      if (!VARIANTS.has(node.name)) return;

      const data = node.data || (node.data = {});
      data.hName = 'aside';
      data.hProperties = {
        className: ['docs-aside', `docs-aside--${node.name}`],
      };

      const title = getDirectiveLabel(node);
      node.children = [
        {
          type: 'paragraph',
          data: {
            hName: 'p',
            hProperties: { className: ['docs-aside__title'] },
          },
          children: [{ type: 'text', value: title }],
        },
        ...(node.children || []),
      ];
    });
  };
}
