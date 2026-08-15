import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import {
  renderUnsubscribeConfirmationPage,
  type NewsletterLang,
} from '@/lib/email/newsletter'

function normalizeLang(value: string | null): NewsletterLang {
  return value === 'fr' ? 'fr' : 'en'
}

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email')
  const lang = normalizeLang(url.searchParams.get('lang'))
  if (!email) {
    return new Response('Email parameter required', { status: 400 })
  }

  const resendKey = import.meta.env.RESEND_API_KEY
  if (!resendKey || resendKey === 're_PLACEHOLDER') {
    return new Response('Newsletter service not configured', { status: 503 })
  }

  const resend = new Resend(resendKey)
  const audienceId = import.meta.env.RESEND_AUDIENCE_ID || ''

  try {
    // Get contacts to find the one matching this email.
    const { data: contacts } = await resend.contacts.list({ audienceId })
    const contact = contacts?.data?.find(
      (candidate: { email: string }) => candidate.email === email
    )

    if (contact) {
      await resend.contacts.update({
        id: contact.id,
        audienceId,
        unsubscribed: true,
      })
    }

    return new Response(renderUnsubscribeConfirmationPage(lang), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('Newsletter unsubscribe error:', err)
    return new Response('Failed to unsubscribe', { status: 500 })
  }
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
  const audienceId = import.meta.env.RESEND_AUDIENCE_ID || ''

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: contacts } = await resend.contacts.list({ audienceId })
    const contact = contacts?.data?.find(
      (candidate: { email: string }) => candidate.email === email
    )

    if (contact) {
      await resend.contacts.update({
        id: contact.id,
        audienceId,
        unsubscribed: true,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Newsletter unsubscribe error:', err)
    return new Response(JSON.stringify({ error: 'Failed to unsubscribe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
