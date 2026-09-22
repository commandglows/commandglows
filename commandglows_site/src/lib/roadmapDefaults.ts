import type { Feature } from '@/types/roadmap'

export const ROADMAP_DEFAULT_FEATURES: Feature[] = [
  {
    id: 'legacy-replayglows-bookmarks',
    key: 'replayglows-bookmarks',
    title: 'Structured Obsidian Export',
    description:
      'Turn captured timestamps and notes into cleaner Markdown exports that are easier to reuse inside a real learning vault.',
    status: 'completed',
    projectId: 'replayglows',
    votes: 42,
  },
  {
    id: 'legacy-replayglows-obsidian-export',
    key: 'replayglows-obsidian-export',
    title: 'Faster Keyboard-First Capture',
    description:
      'Reduce friction when saving a moment, adding a note, and moving on without breaking the YouTube flow.',
    status: 'in-development',
    projectId: 'replayglows',
    votes: 38,
  },
  {
    id: 'legacy-replayglows-analytics',
    key: 'replayglows-analytics',
    title: 'Review Sessions Across Saved Moments',
    description:
      'Revisit saved timestamps in a more deliberate sequence instead of hunting through individual videos one by one.',
    status: 'planned',
    projectId: 'replayglows',
    votes: 25,
  },
  {
    id: 'legacy-replayglows-ai-summaries',
    key: 'replayglows-ai-summaries',
    title: 'Shared Study Packs',
    description:
      'Bundle selected timestamps, notes, and exports into cleaner packets that are easier to reuse or share with a team.',
    status: 'considering',
    projectId: 'replayglows',
    votes: 67,
  },
  {
    id: 'legacy-mediaflowz-rss',
    key: 'mediaflowz-rss',
    title: 'Cloud Upload Foundations',
    description:
      'Push local media to a supported cloud provider and replace fragile local references with stable delivery URLs.',
    status: 'completed',
    projectId: 'mediaflowz',
    votes: 31,
  },
  {
    id: 'legacy-mediaflowz-scheduler',
    key: 'mediaflowz-scheduler',
    title: 'Provider Setup That Feels Lighter',
    description:
      'Make Cloudinary, Cloudflare Images, TwicPics, and similar setups less annoying for people who just want the pipeline to work.',
    status: 'planned',
    projectId: 'mediaflowz',
    votes: 44,
  },
  {
    id: 'legacy-mediaflowz-curation-templates',
    key: 'mediaflowz-curation-templates',
    title: 'Batch Image Optimization',
    description:
      'Compress, convert, and prepare multiple media files in one pass without doing every asset manually.',
    status: 'in-development',
    projectId: 'mediaflowz',
    votes: 19,
  },
  {
    id: 'legacy-mediaflowz-newsletter',
    key: 'mediaflowz-newsletter',
    title: 'Searchable Media Library',
    description:
      'Find the right image or GIF faster with better organization, tags, and preview-driven browsing inside the vault.',
    status: 'considering',
    projectId: 'mediaflowz',
    votes: 52,
  },
  {
    id: 'legacy-commandglows-guide-v2',
    key: 'commandglows-guide-v2',
    title: 'Android Keyboard Recovery After Sign-In',
    description:
      'Keep a real keyboard setup recoverable across reinstall, new device, and account-backed sync instead of rebuilding everything by hand.',
    status: 'in-development',
    projectId: 'commandglows',
    votes: 35,
    updateSlug: 'roadmap-feedback-changelog',
  },
  {
    id: 'legacy-commandglows-plugin-manager',
    key: 'commandglows-plugin-manager',
    title: 'Theme Backup Including Keyboard Images',
    description:
      'Save not only keyboard colors and layout settings, but also the visual theme assets needed to restore the same environment cleanly.',
    status: 'completed',
    projectId: 'commandglows',
    votes: 28,
  },
  {
    id: 'legacy-commandglows-shortcut-trainer',
    key: 'commandglows-shortcut-trainer',
    title: 'Overlay Voice Capture Parity',
    description:
      'Bring the Android overlay back to a level where quick capture, insertion, and feedback feel coherent instead of half-ported.',
    status: 'planned',
    projectId: 'commandglows',
    votes: 41,
  },
  {
    id: 'legacy-commandglows-workflow-builder',
    key: 'commandglows-workflow-builder',
    title: 'Proprietary Swipe-Corner Keyboard',
    description:
      'Move toward a more distinctive Android keyboard surface with faster gestures, modular actions, and a stronger keyboard-first workflow.',
    status: 'considering',
    projectId: 'commandglows',
    votes: 73,
  },
]
