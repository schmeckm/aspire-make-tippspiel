const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { wrapBrandedEmail, escapeHtml } = require('../../services/emailLayoutService');

describe('emailLayoutService', () => {
  it('escapes HTML in dynamic content', () => {
    assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  });

  it('wraps content with Aspire MAKE branding and CTA button', () => {
    const html = wrapBrandedEmail({
      locale: 'de',
      title: 'E-Mail bestätigen',
      greeting: 'Willkommen, Max!',
      bodyHtml: '<p style="margin:0;">Bitte bestätigen.</p>',
      ctaHref: 'https://example.com/verify',
      ctaLabel: 'Jetzt bestätigen',
      footerHtml: '<p style="margin:0;">Footer</p>',
    });

    assert.match(html, /Aspire MAKE/);
    assert.match(html, /#e86a33/);
    assert.match(html, /https:\/\/example.com\/verify/);
    assert.match(html, /Jetzt bestätigen/);
    assert.match(html, /<!DOCTYPE html>/);
  });
});
