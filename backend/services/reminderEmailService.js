const emailService = require('./emailService');
const { getAppUrl } = require('./authTokenService');
const { t, normalizeLocale } = require('./i18nService');
const { escapeHtml, wrapBrandedEmail } = require('./emailLayoutService');

const DATE_LOCALES = {
  de: 'de-DE',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
};

function resolveUserLocale(user) {
  return normalizeLocale(user?.language);
}

function formatKickoff(kickoffTime, locale) {
  return new Date(kickoffTime).toLocaleString(DATE_LOCALES[locale] || DATE_LOCALES.de);
}

function formatMatchListHtml(matches, locale) {
  if (!matches.length) {
    return `<p style="margin:0;">${escapeHtml(t('emails.missingPredictions.noneUpcoming', locale))}</p>`;
  }
  const items = matches.map((m) => {
    const when = formatKickoff(m.kickoffTime, locale);
    return `<li>${escapeHtml(m.homeTeam)} vs ${escapeHtml(m.awayTeam)} – ${escapeHtml(when)}</li>`;
  }).join('');
  return `<ul style="margin:12px 0;padding-left:20px;">${items}</ul>`;
}

function formatMatchListText(matches, locale) {
  if (!matches.length) return t('emails.missingPredictions.noneUpcoming', locale);
  return matches.map((m) => {
    const when = formatKickoff(m.kickoffTime, locale);
    return `- ${m.homeTeam} vs ${m.awayTeam} (${when})`;
  }).join('\n');
}

function templateMissingPredictions(user, missingCount, upcomingMatches) {
  const locale = resolveUserLocale(user);
  const link = `${getAppUrl()}/matches?filter=missing`;
  const greeting = t('emails.missingPredictions.greeting', locale, { firstName: user.firstName });
  const body = t('emails.missingPredictions.body', locale, { missingCount });
  const upcomingHeading = t('emails.missingPredictions.upcomingHeading', locale);
  const matchListHtml = formatMatchListHtml(upcomingMatches, locale);
  const matchListText = formatMatchListText(upcomingMatches, locale);
  const cta = t('emails.missingPredictions.cta', locale);
  const fallback = t('emails.missingPredictions.fallback', locale, { link });

  return {
    subject: t('emails.missingPredictions.subject', locale, { missingCount }),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.missingPredictions.title', locale),
      greeting,
      bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(body)}</p>
        <p style="margin:0 0 8px;font-weight:600;">${escapeHtml(upcomingHeading)}</p>
        ${matchListHtml}
      `.trim(),
      ctaHref: link,
      ctaLabel: cta,
      footerHtml: `<p style="margin:0;font-size:12px;">${escapeHtml(fallback).replace(escapeHtml(link), `<a href="${escapeHtml(link)}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(link)}</a>`)}</p>`,
    }),
    text: t('emails.missingPredictions.text', locale, {
      firstName: user.firstName,
      missingCount,
      matchListText,
      link,
    }),
    locale,
  };
}

function buildMissingPredictionsNotification(user, missingCount) {
  const locale = resolveUserLocale(user);
  return {
    title: t('emails.missingPredictions.notificationTitle', locale),
    message: t('emails.missingPredictions.notificationBody', locale, { missingCount }),
    locale,
  };
}

async function sendMissingPredictionsEmail(user, missingCount, upcomingMatches) {
  const template = templateMissingPredictions(user, missingCount, upcomingMatches);
  await emailService.sendEmail({ to: user.email, ...template });
  return template;
}

module.exports = {
  resolveUserLocale,
  templateMissingPredictions,
  buildMissingPredictionsNotification,
  sendMissingPredictionsEmail,
};
