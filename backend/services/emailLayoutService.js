const { getAppUrl } = require('./authTokenService');
const { t } = require('./i18nService');

const BRAND_ORANGE = '#e86a33';
const BG_COLOR = '#1a1a2e';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const FONT_STACK = "'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif";

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCtaButton(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr>
        <td align="center" style="background:${BRAND_ORANGE};">
          <a href="${safeHref}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:${FONT_STACK};">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function wrapBrandedEmail({
  locale = 'de',
  title = '',
  greeting = '',
  bodyHtml = '',
  ctaHref = '',
  ctaLabel = '',
  footerHtml = '',
}) {
  const appUrl = getAppUrl();
  const brand = escapeHtml(t('emails.layout.brand', locale));
  const tagline = escapeHtml(t('emails.layout.tagline', locale));
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const bgImage = `${appUrl}/images/login-bg.jpg`;

  const ctaBlock = ctaHref && ctaLabel ? renderCtaButton(ctaHref, ctaLabel) : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle || brand}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};background-image:linear-gradient(135deg, rgba(20,24,36,0.92) 0%, rgba(30,35,50,0.85) 50%, rgba(15,18,28,0.94) 100%), url('${bgImage}');background-size:cover;background-position:center;background-repeat:no-repeat;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0 0 8px;font-size:42px;font-weight:700;line-height:1.05;color:#ffffff;letter-spacing:-0.02em;">${brand}</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:${TEXT_MUTED};max-width:420px;">${tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);">
              ${safeTitle ? `<p style="margin:0 0 20px;font-size:26px;font-weight:700;line-height:1.2;color:#ffffff;">${safeTitle}</p>` : ''}
              ${safeGreeting ? `<p style="margin:0 0 12px;font-size:18px;font-weight:600;line-height:1.4;color:#ffffff;">${safeGreeting}</p>` : ''}
              <div style="font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
                ${bodyHtml}
              </div>
              ${ctaBlock}
              ${footerHtml ? `<div style="margin-top:20px;font-size:13px;line-height:1.6;color:${TEXT_MUTED};">${footerHtml}</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  wrapBrandedEmail,
  BRAND_ORANGE,
  BG_COLOR,
};
