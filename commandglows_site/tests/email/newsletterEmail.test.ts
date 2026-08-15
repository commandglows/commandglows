import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { BASIC_EMAIL_FIXTURES } from '../../idees/emails/basic-email';
import { buildWeeklySignupsFixture } from '../../idees/emails/weekly-signups';
import {
  buildWelcomeEmail,
  renderNewsletterEmail,
  renderUnsubscribeConfirmationPage,
} from '@/lib/email/newsletter';
import {
  EMAIL_ADAPTER_SOURCE_FIXTURE,
  EMAIL_CLIENT_ADAPTATIONS,
  NEWSLETTER_STYLE_NAMES,
  newsletterStyle,
} from '@/theme/newsletter-email-theme';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('newsletter email token contract', () => {
  test('matches the canonical adapter source fixture expected from Batch I', () => {
    expect(Object.keys(EMAIL_ADAPTER_SOURCE_FIXTURE)).toEqual([
      'component.email.button.background',
      'component.email.button.radius',
      'semantic.space.unit',
      'semantic.typography.email.body.family',
    ]);
    expect(EMAIL_ADAPTER_SOURCE_FIXTURE['component.email.button.background']).toMatch(
      /^#[0-9a-f]{6}$/
    );
    expect(EMAIL_ADAPTER_SOURCE_FIXTURE['component.email.button.radius']).toEqual({
      amount: 10,
      unit: 'px',
    });
    expect(EMAIL_ADAPTER_SOURCE_FIXTURE['semantic.space.unit']).toEqual({
      amount: 4,
      unit: 'px',
    });
    expect(EMAIL_ADAPTER_SOURCE_FIXTURE['semantic.typography.email.body.family']).toEqual([
      'sans-serif',
    ]);
  });

  test('serializes client-safe inline styles without browser-only authorities', () => {
    for (const styleName of NEWSLETTER_STYLE_NAMES) {
      const style = newsletterStyle(styleName);

      expect(style).not.toMatch(/var\(--|@import|@font-face|expression\(|javascript:|url\(/i);
    }
  });
});

describe('production newsletter rendering', () => {
  test('renders stable bilingual HTML and deliberate plain-text alternatives', () => {
    const en = buildWelcomeEmail('en', 'lead-magnet', 'reader+en@example.com');
    const fr = buildWelcomeEmail('fr', 'lead-magnet', 'lectrice+fr@example.com');

    expect({
      enHtml: sha256(en.html),
      enText: sha256(en.text),
      frHtml: sha256(fr.html),
      frText: sha256(fr.text),
    }).toEqual({
      enHtml: '74fc8d30f867d1e1fbe8907d12d8d1fe3461eca05cb14e6f2eac58ce2c35253a',
      enText: '3fadbb282494ff089fe3e7fea8313460d6ea14d9af62efeb509b7c30e90baea6',
      frHtml: 'acbd59e2a5f68323f6fb2c5812c53c28bddf0fdbea38961ed3d4d5f9668e55ac',
      frText: 'a7702e695639d6473831ee126dd6f73ddba2a2783a68d9bc4cb2e2317a78bc11',
    });

    expect(en.html).toContain('<html lang="en" dir="ltr">');
    expect(en.html).toContain('<div lang="en" dir="ltr"');
    expect(fr.html).toContain('<html lang="fr" dir="ltr">');
    expect(fr.html).toContain('<div lang="fr" dir="ltr"');
    expect(fr.html).toContain('<title>Bienvenue chez CMDglows — votre prochaine étape</title>');

    expect(en.text).toContain('See the sales page: https://www.commandglows.com/windows-mastery');
    expect(en.text).toContain(
      'Unsubscribe: https://www.commandglows.com/api/newsletter/unsubscribe?email=reader%2Ben%40example.com&lang=en'
    );
    expect(fr.text).toContain('Voir la page de vente: https://www.commandglows.com/fr/maitrise-windows');
    expect(fr.text).toContain(
      'Se désabonner: https://www.commandglows.com/api/newsletter/unsubscribe?email=lectrice%2Bfr%40example.com&lang=fr'
    );
  });

  test('escapes every HTML context while preserving safe literal plain text', () => {
    const dangerous = '<script>alert("email")</script> &\u0000';
    const rendered = renderNewsletterEmail({
      lang: 'en',
      content: {
        subject: dangerous,
        heading: dangerous,
        intro: dangerous,
        body: dangerous,
        cta: dangerous,
        footer: dangerous,
        unsubscribe: dangerous,
      },
      ctaUrl: 'https://example.com/?value="><script>alert(1)</script>',
      unsubscribeUrl: 'https://example.com/unsubscribe?value="&next=<script>',
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).not.toContain('href="https://example.com/?value="><script>');
    expect(rendered.html).toContain('&lt;script&gt;alert(&quot;email&quot;)&lt;/script&gt; &amp;');
    expect(rendered.html).toContain('value=&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.text).toContain('<script>alert("email")</script> &�');
    expect(rendered.text).not.toContain('\u0000');

    expect(() =>
      renderNewsletterEmail({
        lang: 'en',
        content: {
          subject: 'Unsafe URL',
          heading: 'Unsafe URL',
          intro: 'Unsafe URL',
          body: 'Unsafe URL',
          cta: 'Unsafe URL',
          footer: 'Unsafe URL',
          unsubscribe: 'Unsafe URL',
        },
        ctaUrl: 'javascript:alert(1)',
        unsubscribeUrl: 'https://example.com/unsubscribe',
      })
    ).toThrow('ctaUrl must be an absolute HTTP(S) URL');
  });

  test('keeps essential content readable with images disabled and explicit light fallbacks', () => {
    const rendered = buildWelcomeEmail('en', 'footer', 'images-off@example.com');

    expect(rendered.html).not.toMatch(/<img\b|<link\b|<script\b|@font-face|url\(/i);
    expect(rendered.html).toContain(
      `background-color: ${EMAIL_CLIENT_ADAPTATIONS.surface};`
    );
    expect(rendered.html).toContain(`color: ${EMAIL_CLIENT_ADAPTATIONS.text};`);
    expect(rendered.html).toContain('See the sales page');
    expect(rendered.html).toContain('Unsubscribe');
  });

  test('renders a complete localized unsubscribe confirmation document', () => {
    const html = renderUnsubscribeConfirmationPage('fr');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<html lang="fr" dir="ltr">');
    expect(html).toContain('<main lang="fr" dir="ltr"');
    expect(html).toContain('<title>Désabonnement confirmé</title>');
    expect(html).toContain('href="https://www.commandglows.com/fr"');
  });
});

describe('official prototype fixtures', () => {
  test('use the production renderer for representative EN, FR, and long content', () => {
    const long = buildWeeklySignupsFixture({
      id: 'fixture-<id>',
      name: 'Amina <Admin>',
      email: 'amina+long@example.com',
    });

    expect({
      basicEnHtml: sha256(BASIC_EMAIL_FIXTURES.en.html),
      basicFrHtml: sha256(BASIC_EMAIL_FIXTURES.fr.html),
      longHtml: sha256(long.html),
      longText: sha256(long.text),
    }).toEqual({
      basicEnHtml: 'e700e1ffeb5d469a117ceef6dabfbf26bbff59162a32ac8c276742529b70e6ea',
      basicFrHtml: 'f0b55e955871393386e118d8c1e5f129e06bb5958869c0ab6211b449c993c202',
      longHtml: 'a985e976670e84159763f45ff8faa446875525bbf178328cf85d4ae30c05e27e',
      longText: '288a7f2b3be69c20d8695f661b1ca715d761fd9f86732397e3dab1d494859788',
    });

    expect(long.html).toContain('Amina &lt;Admin&gt;');
    expect(long.html).toContain('fixture-&lt;id&gt;');
    expect(long.text).toContain('Amina <Admin>');
    expect(long.text.length).toBeGreaterThan(500);
  });
});
