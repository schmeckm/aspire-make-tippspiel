const emailService = require('./emailService');
const { getAppUrl } = require('./authTokenService');
const { t, normalizeLocale } = require('./i18nService');
const { escapeHtml, wrapBrandedEmail } = require('./emailLayoutService');

function resolveEmailLocale(user, locale) {
  return normalizeLocale(locale || user?.language);
}

function renderLinkFallback(text, link) {
  const idx = text.indexOf(link);
  if (idx === -1) {
    return `<p style="margin:0;font-size:12px;">${escapeHtml(text)}</p>`;
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + link.length);
  return `<p style="margin:0;font-size:12px;">${escapeHtml(before)}<a href="${escapeHtml(link)}" style="color:#ffffff;text-decoration:underline;word-break:break-all;">${escapeHtml(link)}</a>${escapeHtml(after)}</p>`;
}

function templateEmailVerification(user, token, locale) {
  const lang = resolveEmailLocale(user, locale);
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  const greeting = t('emails.emailVerification.greeting', lang, { firstName: user.firstName });
  const body = t('emails.emailVerification.body', lang);
  const cta = t('emails.emailVerification.cta', lang);
  const footer = t('emails.emailVerification.footer', lang);
  const fallback = t('emails.emailVerification.fallback', lang, { link });

  return {
    subject: t('emails.emailVerification.subject', lang),
    html: wrapBrandedEmail({
      locale: lang,
      title: t('emails.emailVerification.title', lang),
      greeting,
      bodyHtml: `<p style="margin:0 0 8px;">${escapeHtml(body)}</p>`,
      ctaHref: link,
      ctaLabel: cta,
      footerHtml: `
        <p style="margin:0 0 8px;">${escapeHtml(footer)}</p>
        ${renderLinkFallback(fallback, link)}
      `.trim(),
    }),
    text: t('emails.emailVerification.text', lang, { firstName: user.firstName, link }),
  };
}

function templatePasswordReset(user, token, locale) {
  const lang = resolveEmailLocale(user, locale);
  const link = `${getAppUrl()}/reset-password?token=${token}`;
  const greeting = t('emails.passwordReset.greeting', lang, { firstName: user.firstName });
  const body = t('emails.passwordReset.body', lang);
  const cta = t('emails.passwordReset.cta', lang);
  const footer = t('emails.passwordReset.footer', lang);
  const fallback = t('emails.passwordReset.fallback', lang, { link });

  return {
    subject: t('emails.passwordReset.subject', lang),
    html: wrapBrandedEmail({
      locale: lang,
      title: t('emails.passwordReset.title', lang),
      greeting,
      bodyHtml: `<p style="margin:0 0 8px;">${escapeHtml(body)}</p>`,
      ctaHref: link,
      ctaLabel: cta,
      footerHtml: `
        <p style="margin:0 0 8px;">${escapeHtml(footer)}</p>
        ${renderLinkFallback(fallback, link)}
      `.trim(),
    }),
    text: t('emails.passwordReset.text', lang, { link }),
  };
}

async function sendVerificationEmail(user, token, locale) {
  const template = templateEmailVerification(user, token, locale);
  return emailService.sendEmail({ to: user.email, ...template });
}

async function sendPasswordResetEmail(user, token, locale) {
  const template = templatePasswordReset(user, token, locale);
  return emailService.sendEmail({ to: user.email, ...template });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  templateEmailVerification,
  templatePasswordReset,
};
