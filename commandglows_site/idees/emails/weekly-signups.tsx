import { renderNewsletterEmail } from '../../src/lib/email/newsletter';

export type WeeklySignupsFixtureUser = Readonly<{
  name: string;
  email: string;
  id: string;
}>;

/**
 * Long-content fixture used to exercise contextual escaping and wrapping.
 * It delegates all markup and token decisions to the production renderer.
 */
export function buildWeeklySignupsFixture(user: WeeklySignupsFixtureUser) {
  return renderNewsletterEmail({
    lang: 'en',
    content: {
      subject: `Weekly signup review for ${user.name}`,
      heading: `Weekly signup review — ${user.name}`,
      intro: `Account ${user.id} (${user.email}) is included in this week's review.`,
      body:
        'This deliberately long paragraph verifies that the production renderer keeps a coherent source order and live text when content wraps across narrow email clients. It also confirms that essential information does not depend on an image, a remote font, a stylesheet, or JavaScript.',
      cta: 'Review the CommandGlows workflow',
      footer:
        'Keep this fixture representative: it is rendered by the production path and must never become a standalone visual authority.',
      unsubscribe: 'Unsubscribe',
    },
    ctaUrl:
      'https://www.commandglows.com/windows-mastery?utm_source=email&utm_medium=fixture&utm_campaign=weekly-review',
    unsubscribeUrl: `https://www.commandglows.com/api/newsletter/unsubscribe?email=${encodeURIComponent(user.email)}&lang=en`,
  });
}

export const WEEKLY_SIGNUPS_FIXTURE = buildWeeklySignupsFixture({
  id: 'fixture-user-12345',
  name: 'Carlos',
  email: 'carlos@example.com',
});

export default WEEKLY_SIGNUPS_FIXTURE;
