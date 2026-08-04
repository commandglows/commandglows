import { describe, expect, test } from 'vitest'
import { parseGeminiEditedImageResponse } from '@/lib/geminiImageEdit'

describe('gemini image edit helpers', () => {
  test('extracts inline image data from gemini response', () => {
    const result = parseGeminiEditedImageResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'YWJjZA==',
                  },
                },
              ],
            },
          },
        ],
      },
      0
    )

    expect(result.mimeType).toBe('image/png')
    expect(result.base64Data).toBe('YWJjZA==')
    expect(result.dataUrl).toBe('data:image/png;base64,YWJjZA==')
  })
})
