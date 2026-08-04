type GeminiImagePart = {
  inlineData?: {
    data?: string
    mimeType?: string
  }
  thought?: boolean
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[]
    }
  }>
}

export type TemuTranslatedImage = {
  imageIndex: number
  mimeType: string
  base64Data: string
  dataUrl: string
}

const GEMINI_IMAGE_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent'

function buildImageEditPrompt(index: number): string {
  return [
    'Edit this product image for a French resale listing.',
    'Keep the same product, same framing, same colors, same layout, and same overall composition.',
    'Replace every visible non-French text in the image with a natural French translation directly inside the image.',
    'Do not add banners, labels, watermarks, badges, extra objects, or decorative overlays.',
    'Do not change the product itself.',
    'Return only the edited image.',
    `This is image ${index + 1}.`,
  ].join(' ')
}

async function fetchImageAsInlineData(imageUrl: string): Promise<{
  mimeType: string
  base64Data: string
}> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error('image_fetch_failed')
  }

  const mimeType = (response.headers.get('content-type') ?? 'image/jpeg')
    .split(';')[0]
    .trim()
  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    mimeType,
    base64Data: buffer.toString('base64'),
  }
}

export function parseGeminiEditedImageResponse(
  payload: GeminiGenerateContentResponse,
  imageIndex: number
): TemuTranslatedImage {
  const parts = payload.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(
    (part) => !part.thought && part.inlineData?.data && part.inlineData?.mimeType
  )

  const base64Data = imagePart?.inlineData?.data
  const mimeType = imagePart?.inlineData?.mimeType

  if (!base64Data || !mimeType) {
    throw new Error('gemini_image_missing')
  }

  return {
    imageIndex,
    mimeType,
    base64Data,
    dataUrl: `data:${mimeType};base64,${base64Data}`,
  }
}

export async function translateProductImageWithGemini(
  imageUrl: string,
  imageIndex: number
): Promise<TemuTranslatedImage> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('gemini_not_configured')
  }

  const sourceImage = await fetchImageAsInlineData(imageUrl)

  const response = await fetch(GEMINI_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildImageEditPrompt(imageIndex) },
            {
              inlineData: {
                mimeType: sourceImage.mimeType,
                data: sourceImage.base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (/api key|permission|unauth/i.test(errorText)) {
      throw new Error('gemini_not_configured')
    }
    throw new Error(`gemini_image_edit_failed:${response.status}`)
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse
  return parseGeminiEditedImageResponse(payload, imageIndex)
}
