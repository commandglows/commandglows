import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { SITE } from '@/constants'
import { buildWelcomeEmail } from '@/lib/email/newsletter'

type SignupSource = 'footer' | 'lead-magnet' | 'windows-mastery' | 'unknown'
type SignupLang = 'fr' | 'en'

function normalizeLang(value: unknown): SignupLang {
  return value === 'fr' ? 'fr' : 'en'
}

function normalizeSource(value: unknown): SignupSource {
  if (
    value === 'footer' ||
    value === 'lead-magnet' ||
    value === 'windows-mastery'
  ) {
    return value
  }

  return 'unknown'
}

export const POST: APIRoute = async ({ request }) => {
  const resendKey = import.meta.env.RESEND_API_KEY
  if (!resendKey || resendKey === 're_PLACEHOLDER') {
    return new Response(
      JSON.stringify({ error: 'Newsletter service not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const resend = new Resend(resendKey)

  try {
    const body = await request.json()
    const { email, lang: rawLang, source: rawSource } = body
    const lang = normalizeLang(rawLang)
    const source = normalizeSource(rawSource)

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Add contact to Resend audience.
    await resend.contacts.create({
      email,
      audienceId: import.meta.env.RESEND_AUDIENCE_ID || '',
      unsubscribed: false,
    })

    const welcomeEmail = buildWelcomeEmail(lang, source, email)

    await resend.emails.send({
      from: `${SITE.name} <${SITE.emails.newsletter}>`,
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Newsletter subscribe error:', err)
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
