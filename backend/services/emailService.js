const nodemailer = require('nodemailer');
const { getSetting } = require('./settingsService');
const { wrapBrandedEmail, escapeHtml } = require('./emailLayoutService');
const { t, resolveUserEmailLocale } = require('./i18nService');
const { getAppUrl } = require('./authTokenService');

let transporter = null;

const DATE_LOCALES = {
  de: 'de-DE',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
};

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    } : undefined,
  });

  return transporter;
}

function isEmailConfigured() {
  return !!process.env.SMTP_HOST;
}

function formatKickoff(kickoffTime, locale) {
  return new Date(kickoffTime).toLocaleString(DATE_LOCALES[locale] || DATE_LOCALES.de);
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email mock] To: ${to}, Subject: ${subject}`);
    return { mock: true, message: 'SMTP nicht konfiguriert – E-Mail simuliert.' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tippspiel.local';

  const info = await transport.sendMail({ from, to, subject, html, text });
  return { messageId: info.messageId, accepted: info.accepted };
}

function formatMatchListHtml(matches, locale) {
  if (!matches.length) {
    return `<p style="margin:0;">${escapeHtml(t('emails.upcomingMatches.none', locale))}</p>`;
  }
  const items = matches.map((m) => {
    const when = formatKickoff(m.kickoffTime, locale);
    return `<li>${escapeHtml(m.homeTeam)} vs ${escapeHtml(m.awayTeam)} – ${escapeHtml(when)}</li>`;
  }).join('');
  return `<ul style="margin:12px 0;padding-left:20px;">${items}</ul>`;
}

function formatMatchListText(matches, locale) {
  if (!matches.length) return t('emails.upcomingMatches.none', locale);
  return matches.map((m) => {
    const when = formatKickoff(m.kickoffTime, locale);
    return `- ${m.homeTeam} vs ${m.awayTeam} (${when})`;
  }).join('\n');
}

function templateUpcomingMatches(user, matches) {
  const locale = resolveUserEmailLocale(user);
  const greeting = t('emails.upcomingMatches.greeting', locale, { firstName: user.firstName });
  const body = t('emails.upcomingMatches.body', locale);
  const matchListHtml = formatMatchListHtml(matches, locale);
  const matchListText = formatMatchListText(matches, locale);
  const link = `${getAppUrl()}/matches`;

  return {
    subject: t('emails.upcomingMatches.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.upcomingMatches.title', locale),
      greeting,
      bodyHtml: `
        <p style="margin:0 0 8px;">${escapeHtml(body)}</p>
        ${matchListHtml}
      `.trim(),
      ctaHref: link,
      ctaLabel: t('emails.upcomingMatches.cta', locale),
    }),
    text: t('emails.upcomingMatches.text', locale, { matchListText, link }),
  };
}

function templateBonusReminder(user, question) {
  const locale = resolveUserEmailLocale(user);
  const lockTime = formatKickoff(question.lockTime, locale);
  const link = `${getAppUrl()}/bonus`;

  return {
    subject: t('emails.bonusReminder.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.bonusReminder.title', locale),
      greeting: t('emails.bonusReminder.greeting', locale, { firstName: user.firstName }),
      bodyHtml: `<p style="margin:0;">${escapeHtml(t('emails.bonusReminder.body', locale, {
        questionText: question.questionText,
        lockTime,
      }))}</p>`,
      ctaHref: link,
      ctaLabel: t('emails.bonusReminder.cta', locale),
    }),
    text: t('emails.bonusReminder.text', locale, {
      firstName: user.firstName,
      questionText: question.questionText,
      lockTime,
      link,
    }),
  };
}

function templateSyncError(errorMessage, user) {
  const locale = resolveUserEmailLocale(user);
  return {
    subject: t('emails.syncError.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.syncError.title', locale),
      bodyHtml: `<p style="margin:0;">${escapeHtml(errorMessage)}</p>`,
    }),
    text: t('emails.syncError.text', locale, { errorMessage }),
  };
}

function templateLeaderboardUpdate(user, rank, points) {
  const locale = resolveUserEmailLocale(user);
  const link = `${getAppUrl()}/leaderboard`;

  return {
    subject: t('emails.leaderboardUpdate.subject', locale),
    html: wrapBrandedEmail({
      locale,
      title: t('emails.leaderboardUpdate.title', locale),
      greeting: t('emails.leaderboardUpdate.greeting', locale, { firstName: user.firstName }),
      bodyHtml: `<p style="margin:0;">${escapeHtml(t('emails.leaderboardUpdate.body', locale, { rank, points }))}</p>`,
      ctaHref: link,
      ctaLabel: t('emails.leaderboardUpdate.cta', locale),
    }),
    text: t('emails.leaderboardUpdate.text', locale, { firstName: user.firstName, rank, points, link }),
  };
}

async function getEmailStatus() {
  const checklist = [
    { id: 'smtp_host', label: 'SMTP_HOST gesetzt', ok: !!process.env.SMTP_HOST },
    { id: 'smtp_user', label: 'SMTP_USER gesetzt', ok: !!process.env.SMTP_USER },
    { id: 'smtp_password', label: 'SMTP_PASSWORD gesetzt', ok: !!process.env.SMTP_PASSWORD },
    { id: 'smtp_from', label: 'SMTP_FROM gesetzt', ok: !!(process.env.SMTP_FROM || process.env.SMTP_USER) },
    { id: 'app_url', label: 'APP_URL gesetzt (für E-Mail-Links)', ok: !!process.env.APP_URL },
  ];

  return {
    configured: isEmailConfigured(),
    host: process.env.SMTP_HOST || null,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    appUrl: process.env.APP_URL || null,
    remindersEnabled: await require('./emailReminderSettingsService').isEmailRemindersEnabled(),
    morningDigestEnabled: await require('./emailReminderSettingsService').isMorningDigestEnabled(),
    requireEmailVerification: await getSetting('requireEmailVerification', true),
    checklist,
    checklistComplete: checklist.every((item) => item.ok),
  };
}

module.exports = {
  sendEmail,
  isEmailConfigured,
  getEmailStatus,
  templateUpcomingMatches,
  templateBonusReminder,
  templateSyncError,
  templateLeaderboardUpdate,
};
