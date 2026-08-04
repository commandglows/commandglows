import { describe, expect, test } from 'vitest'
import {
  extractTemuDataFromHtml,
  getDownloadFilename,
  normalizeMarketplaceUrl,
} from '@/lib/temu'

describe('temu helpers', () => {
  test('normalizes marketplace urls', () => {
    expect(normalizeMarketplaceUrl('www.temu.com/item')).toBe(
      'https://www.temu.com/item'
    )
  })

  test('extracts title, description, and unique images from html', () => {
    const html = `
      <html>
        <head>
          <title>Fallback title</title>
          <meta property="og:title" content="Temu Product Title" />
          <meta name="description" content="Meta description" />
          <meta property="og:image" content="https://img.example.com/hero.jpg" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Structured Product",
              "description": "Structured description for resale",
              "image": [
                "https://img.example.com/p-1.jpg",
                "https://img.example.com/p-2.jpg"
              ]
            }
          </script>
        </head>
        <body>
          <img src="https://img.example.com/p-2.jpg" />
          <img src="/gallery/p-3.webp" />
          <img src="https://img.example.com/logo.svg" />
        </body>
      </html>
    `

    const result = extractTemuDataFromHtml(
      html,
      'https://www.temu.com/item',
      'https://www.temu.com/item'
    )

    expect(result.title).toBe('Temu Product Title')
    expect(result.description).toBe('Structured description for resale')
    expect(result.images).toEqual([
      'https://img.example.com/p-1.jpg',
      'https://img.example.com/p-2.jpg',
      'https://img.example.com/hero.jpg',
      'https://www.temu.com/gallery/p-3.webp',
    ])
  })

  test('derives a stable download filename', () => {
    expect(
      getDownloadFilename('https://img.example.com/abc/product-main', 0, 'image/webp')
    ).toBe('product-main.webp')
  })
})
