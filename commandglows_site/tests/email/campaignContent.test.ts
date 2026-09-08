import {
  campaignContent,
  renderCampaign,
} from '../../src/lib/email/central/campaignContent'
import { newsletterStyle } from '../../src/theme/newsletter-email-theme'

it('preserves marker-looking text and replacement metacharacters structurally', () => {
  const literal = "CAMPAIGN_BODY $& $' $`"
  const content = campaignContent({
    title: 'Draft',
    audienceId: 'news',
    locale: 'fr',
    subject: 'CAMPAIGN_BODY',
    preheader: literal,
    blocks: [{ id: 'body', type: 'text', text: literal }],
  })
  const output = renderCampaign(content, {
    brand: 'CAMPAIGN_BODY',
    legalFooter: literal,
  })
  expect(output.subject).toBe('CAMPAIGN_BODY')
  expect(output.text).toBe(
    [
      'CAMPAIGN_BODY',
      literal,
      literal,
      'CAMPAIGN_BODY',
      literal,
      'Me désabonner de ces emails: {{{ pm:unsubscribe }}}',
    ].join('\n\n')
  )
  expect(output.html).toContain('CAMPAIGN_BODY $&amp; $&#39; $`')
  expect(output.html.match(/CAMPAIGN_BODY \$&amp; \$&#39; \$`/g)).toHaveLength(
    3
  )
})

it('uses the existing responsive email theme and preserves safe links', () => {
  const output = renderCampaign(
    campaignContent({
      title: 'Draft',
      audienceId: 'news',
      locale: 'en',
      subject: 'News',
      preheader: 'Preview',
      blocks: [
        {
          id: 'button',
          type: 'button',
          text: 'Read <this>',
          url: 'https://example.test/?q=a&b=2',
        },
      ],
    }),
    { brand: 'Studio', legalFooter: 'Contact address' }
  )
  expect(output.html).toContain(newsletterStyle('button'))
  expect(output.html).toContain(newsletterStyle('shell'))
  expect(output.html).toContain('width="100%"')
  expect(output.html).toContain('Read &lt;this&gt;')
  expect(output.html).toContain('href="https://example.test/?q=a&amp;b=2"')
  expect(output.text).toContain('https://example.test/?q=a&b=2')
})
