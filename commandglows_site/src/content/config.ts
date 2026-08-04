// https://docs.astro.build/en/guides/content-collections/#defining-collections

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    editUrl: z.union([z.url(), z.boolean()]).optional().default(true),
    head: z.array(
      z.object({
        tag: z.enum(['title', 'base', 'link', 'style', 'meta', 'script', 'noscript', 'template']),
        attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
        content: z.string().optional(),
      }).strict()
    ).optional().default([]),
    tableOfContents: z.union([
      z.object({
        minHeadingLevel: z.number().int().min(1).max(6).default(2),
        maxHeadingLevel: z.number().int().min(1).max(6).default(3),
      }).strict(),
      z.boolean(),
    ]).optional(),
    template: z.enum(['doc', 'splash']).default('doc'),
    hero: z.object({
      title: z.string().optional(),
      tagline: z.string().optional(),
      image: z.object({
        alt: z.string().optional(),
        file: z.string().optional(),
        dark: z.string().optional(),
        light: z.string().optional(),
        html: z.string().optional(),
      }).partial().optional(),
      actions: z.array(
        z.object({
          text: z.string(),
          link: z.string(),
          variant: z.enum(['primary', 'secondary', 'minimal']).default('primary'),
          icon: z.string().optional(),
          attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        }).strict()
      ).optional().default([]),
    }).optional(),
    lastUpdated: z.union([z.coerce.date(), z.boolean()]).optional(),
    prev: z.union([
      z.boolean(),
      z.string(),
      z.object({
        link: z.string().optional(),
        label: z.string().optional(),
      }).strict(),
    ]).optional(),
    next: z.union([
      z.boolean(),
      z.string(),
      z.object({
        link: z.string().optional(),
        label: z.string().optional(),
      }).strict(),
    ]).optional(),
    sidebar: z.object({
      order: z.number().optional(),
      label: z.string().optional(),
      hidden: z.boolean().optional().default(false),
      badge: z.union([
        z.string(),
        z.object({
          variant: z.enum(['note', 'danger', 'success', 'caution', 'tip', 'default']).default('default'),
          class: z.string().optional(),
          text: z.string(),
        }).strict(),
      ]).optional(),
      attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
    }).optional().default({ hidden: false, attrs: {} }),
    banner: z.object({
      content: z.string(),
    }).optional(),
    pagefind: z.boolean().optional().default(true),
    draft: z.boolean().optional().default(false),
  }),
});

const productsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['available', 'beta', 'coming_soon']).optional(),
    main: z.object({
      id: z.number(),
      content: z.string(),
      imgCard: z.string(),
      imgMain: z.string(),
      imgAlt: z.string(),
    }),
    tabs: z.array(
      z.object({
        id: z.string(),
        dataTab: z.string(),
        title: z.string(),
      })
    ),
    longDescription: z.object({
      title: z.string(),
      subTitle: z.string(),
      btnTitle: z.string(),
      btnURL: z.string(),
    }),
    descriptionList: z.array(
      z.object({
        title: z.string(),
        subTitle: z.string(),
      })
    ),
    specificationsLeft: z.array(
      z.object({
        title: z.string(),
        subTitle: z.string(),
      })
    ),
    specificationsRight: z.array(
      z.object({
        title: z.string(),
        subTitle: z.string(),
      })
    ).optional(),
    tableData: z.array(
      z.object({
        feature: z.array(z.string()),
        description: z.array(z.array(z.string())),
      })
    ).optional(),
    blueprints: z.object({
      first: z.string().optional(),
      second: z.string().optional(),
    }),
  }),
});

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    translationKey: z.string().optional(),
    description: z.string(),
    contents: z.array(z.string()),
    author: z.string(),
    role: z.string().optional(),
    authorImage: z.string(),
    authorImageAlt: z.string(),
    pubDate: z.date(),
    draft: z.boolean().optional().default(false),
    cardImage: z.string(),
    cardImageAlt: z.string(),
    readTime: z.number(),
    tags: z.array(z.string()).optional(),
  }),
});

const servicesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    features: z.array(z.string()).optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = {
  docs: docsCollection,
  'products': productsCollection,
  'blog': blogCollection,
  'services': servicesCollection,
};
