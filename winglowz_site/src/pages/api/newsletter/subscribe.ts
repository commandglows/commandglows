import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { SITE, getLocalizedSiteUrl } from '@/constants';
import { newsletterStyle } from '@/theme/newsletter-email-theme';

type SignupSource = 'footer' | 'lead-magnet' | 'windows-mastery' | 'unknown';
type SignupLang = 'fr' | 'en';

function normalizeLang(value: unknown): SignupLang {
  return value === 'fr' ? 'fr' : 'en';
}

function normalizeSource(value: unknown): SignupSource {
  if (value === 'footer' || value === 'lead-magnet' || value === 'windows-mastery') {
    return value;
  }

  return 'unknown';
}

function buildWelcomeEmail(lang: SignupLang, source: SignupSource, email: string) {
  const salesPageUrl = getLocalizedSiteUrl(
    lang,
    lang === 'fr' ? '/maitrise-windows' : '/windows-mastery'
  );
  const unsubscribeUrl = getLocalizedSiteUrl(
    lang,
    `/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
  );

  const content =
    lang === 'fr'
      ? {
          subject:
            source === 'lead-magnet'
              ? 'Bienvenue chez CommandGlows — votre prochaine etape'
              : 'Bienvenue chez CommandGlows',
          heading: 'Bienvenue chez CommandGlows',
          intro:
            "Vous etes bien inscrit(e). Le point de depart le plus utile pour comprendre l'approche CommandGlows est maintenant la page dediee a la formation Windows.",
          body:
            "L'idee centrale est simple : vous n'avez pas forcement besoin de plus de motivation. Vous avez souvent surtout besoin de moins de friction, moins de bruit et d'un environnement plus coherent.",
          cta: 'Voir la page de vente',
          footer:
            "Vous recevrez ensuite des emails plus utiles et plus structures que le message de bienvenue generique qu'il y avait avant.",
          unsubscribe: 'Se desabonner',
        }
      : {
          subject:
            source === 'lead-magnet'
              ? 'Welcome to CommandGlows — your next step'
              : 'Welcome to CommandGlows',
          heading: 'Welcome to CommandGlows',
          intro:
            'You are subscribed. The most useful starting point for understanding the CommandGlows approach is now the dedicated Windows course sales page.',
          body:
            'The core idea is simple: you probably do not need more motivation first. You mostly need less friction, less noise, and a more coherent work environment.',
          cta: 'See the sales page',
          footer:
            'You will now receive a more coherent path than the older generic welcome email.',
          unsubscribe: 'Unsubscribe',
        };

  return {
    subject: content.subject,
    html: `
      <div style="${newsletterStyle('shell')}">
        <h1 style="${newsletterStyle('heading')}">${content.heading}</h1>
        <p style="${newsletterStyle('paragraph')}">${content.intro}</p>
        <p style="${newsletterStyle('body')}">${content.body}</p>
        <p style="${newsletterStyle('ctaRow')}">
          <a
            href="${salesPageUrl}"
            style="${newsletterStyle('button')}"
          >${content.cta}</a>
        </p>
        <p style="${newsletterStyle('footer')}">${content.footer}</p>
        <hr style="${newsletterStyle('divider')}" />
        <p style="${newsletterStyle('smallNote')}">
          <a href="${unsubscribeUrl}" style="${newsletterStyle('link')}">${content.unsubscribe}</a>
        </p>
      </div>
    `,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey || resendKey === 're_PLACEHOLDER') {
    return new Response(
      JSON.stringify({ error: 'Newsletter service not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const resend = new Resend(resendKey);

  try {
    const body = await request.json();
    const { email, lang: rawLang, source: rawSource } = body;
    const lang = normalizeLang(rawLang);
    const source = normalizeSource(rawSource);

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add contact to Resend audience
    await resend.contacts.create({
      email,
      audienceId: import.meta.env.RESEND_AUDIENCE_ID || '',
      unsubscribed: false,
    });

    const welcomeEmail = buildWelcomeEmail(lang, source, email);

    await resend.emails.send({
      from: `${SITE.name} <${SITE.emails.newsletter}>`,
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to subscribe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
