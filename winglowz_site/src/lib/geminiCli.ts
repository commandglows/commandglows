import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile as execFileCallback } from 'node:child_process'

const execFile = promisify(execFileCallback)

export type TemuRewriteRequest = {
  sourceUrl: string
  title: string
  description: string
  images: string[]
  sellerLanguage?: 'fr' | 'en'
}

export type TemuRewriteResult = {
  listingTitle: string
  listingDescription: string
  sellingPoints: string[]
  photoTranslations: Array<{
    imageIndex: number
    detectedText: string
    translatedText: string
    notes: string
  }>
}

const GEMINI_BINARY = process.env.GEMINI_BIN || 'gemini'
const MAX_OCR_IMAGES = 4

type GeminiCliJsonResponse = {
  response?: string
}

function buildPrompt(args: {
  request: TemuRewriteRequest
  imagePaths: string[]
}): string {
  const { request, imagePaths } = args
  const outputLanguage = request.sellerLanguage === 'en' ? 'English' : 'French'

  return `
You are helping prepare a truthful resale listing from a Temu product page.

Facts that must be treated as true:
- The seller says the product is new.
- The seller is reselling because the wrong model or variant was ordered.
- Do not invent defects, usage, shipping promises, or unverifiable specifications.
- Keep the tone natural for a peer-to-peer second-hand marketplace listing.

Write the output in ${outputLanguage}.

Source URL:
${request.sourceUrl}

Original title:
${request.title || '(none)'}

Original description:
${request.description || '(none)'}

Image files available for OCR/translation:
${imagePaths.length ? imagePaths.map((filePath, index) => `${index + 1}. ${filePath}`).join('\n') : '(none)'}

Tasks:
1. Rewrite a concise resale listing title.
2. Rewrite a resale description suitable for Vinted or another second-hand marketplace.
3. Mention that the item is new and that the sale is due to ordering the wrong model/variant.
4. Keep the wording factual and non-deceptive.
5. Read the visible text from the provided images when possible and translate it into ${outputLanguage}.

Return strict JSON only with this exact schema:
{
  "listingTitle": "string",
  "listingDescription": "string",
  "sellingPoints": ["string"],
  "photoTranslations": [
    {
      "imageIndex": 1,
      "detectedText": "string",
      "translatedText": "string",
      "notes": "string"
    }
  ]
}

Rules:
- No markdown fences.
- No extra commentary.
- If no visible text is found in an image, omit that image from photoTranslations.
- listingDescription must be one continuous text block, not bullets.
`.trim()
}

function parseGeminiOutput(raw: string): TemuRewriteResult {
  const trimmed = raw.trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('gemini_invalid_json')
  }

  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>
  const listingTitle =
    typeof parsed.listingTitle === 'string' ? parsed.listingTitle.trim() : ''
  const listingDescription =
    typeof parsed.listingDescription === 'string'
      ? parsed.listingDescription.trim()
      : ''
  const sellingPoints = Array.isArray(parsed.sellingPoints)
    ? parsed.sellingPoints.filter((item): item is string => typeof item === 'string')
    : []
  const photoTranslations = Array.isArray(parsed.photoTranslations)
    ? parsed.photoTranslations
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object'
        )
        .map((item) => ({
          imageIndex:
            typeof item.imageIndex === 'number' && Number.isFinite(item.imageIndex)
              ? item.imageIndex
              : 0,
          detectedText:
            typeof item.detectedText === 'string' ? item.detectedText.trim() : '',
          translatedText:
            typeof item.translatedText === 'string'
              ? item.translatedText.trim()
              : '',
          notes: typeof item.notes === 'string' ? item.notes.trim() : '',
        }))
        .filter((item) => item.imageIndex > 0 && (item.detectedText || item.translatedText))
    : []

  if (!listingTitle || !listingDescription) {
    throw new Error('gemini_incomplete_payload')
  }

  return {
    listingTitle,
    listingDescription,
    sellingPoints,
    photoTranslations,
  }
}

async function downloadImagesToTempDir(imageUrls: string[]): Promise<{
  tempDir: string
  imagePaths: string[]
}> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'commandglows-temu-gemini-'))
  const selectedImages = imageUrls.slice(0, MAX_OCR_IMAGES)
  const imagePaths: string[] = []

  for (const [index, imageUrl] of selectedImages.entries()) {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) continue

      const contentType = response.headers.get('content-type') ?? ''
      const ext =
        contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : contentType.includes('gif')
              ? 'gif'
              : 'jpg'

      const buffer = Buffer.from(await response.arrayBuffer())
      const filePath = path.join(tempDir, `image-${index + 1}.${ext}`)
      await writeFile(filePath, buffer)
      imagePaths.push(filePath)
    } catch {
      // Ignore failed image downloads; OCR can still proceed on the rest.
    }
  }

  return { tempDir, imagePaths }
}

export async function generateTemuResaleCopyWithGemini(
  request: TemuRewriteRequest
): Promise<TemuRewriteResult> {
  const { tempDir, imagePaths } = await downloadImagesToTempDir(request.images)

  try {
    const prompt = buildPrompt({ request, imagePaths })
    const { stdout } = await execFile(
      GEMINI_BINARY,
      [
        '--prompt',
        prompt,
        '--output-format',
        'json',
        '--approval-mode',
        'plan',
        '--skip-trust',
      ],
      {
        cwd: tempDir,
        env: process.env,
        maxBuffer: 1024 * 1024 * 8,
      }
    )

    const parsedEnvelope = JSON.parse(stdout) as GeminiCliJsonResponse
    const responseText =
      typeof parsedEnvelope.response === 'string'
        ? parsedEnvelope.response
        : stdout

    return parseGeminiOutput(responseText)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      /GEMINI_API_KEY|Auth method|GOOGLE_GENAI_USE_VERTEXAI|GOOGLE_GENAI_USE_GCA/i.test(
        message
      )
    ) {
      throw new Error('gemini_not_configured')
    }
    throw error
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export const __testables = {
  parseGeminiOutput,
}
