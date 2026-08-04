import { describe, expect, test } from 'vitest'
import { __testables } from '@/lib/geminiCli'

describe('gemini cli helpers', () => {
  test('parses structured gemini json output', () => {
    const result = __testables.parseGeminiOutput(`
      {
        "listingTitle": "Sac neuf mauvais modèle",
        "listingDescription": "Article neuf, jamais utilisé. Je revends car je me suis trompée de modèle.",
        "sellingPoints": ["Neuf", "Jamais utilisé"],
        "photoTranslations": [
          {
            "imageIndex": 1,
            "detectedText": "USB Charging",
            "translatedText": "Charge USB",
            "notes": "Texte imprimé sur le packaging"
          }
        ]
      }
    `)

    expect(result.listingTitle).toContain('Sac neuf')
    expect(result.listingDescription).toContain('trompée de modèle')
    expect(result.sellingPoints).toEqual(['Neuf', 'Jamais utilisé'])
    expect(result.photoTranslations[0]?.translatedText).toBe('Charge USB')
  })

  test('throws on incomplete payload', () => {
    expect(() =>
      __testables.parseGeminiOutput(`{"listingTitle":"","listingDescription":""}`)
    ).toThrow('gemini_incomplete_payload')
  })
})
