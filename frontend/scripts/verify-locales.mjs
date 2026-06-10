import { createRequire } from 'node:module';
import { baseCompile } from '@intlify/message-compiler';

const require = createRequire(import.meta.url);
const de = require('../src/locales/de.json');
const en = require('../src/locales/en.json');
const es = require('../src/locales/es.json');
const fr = require('../src/locales/fr.json');
const pt = require('../src/locales/pt.json');

function escapeI18nAtSign(text) {
  if (typeof text !== 'string' || text.includes("{'@'}")) return text;
  return text.replace(/@(?![:.])/g, "{'@'}");
}

function walk(obj, prefix, locale) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      try {
        baseCompile(escapeI18nAtSign(value), { mode: 'arrow', onError: (e) => { throw e; } });
      } catch (error) {
        console.error(`${locale} FAIL ${path}: ${error.message}`);
        process.exitCode = 1;
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') {
          try {
            baseCompile(escapeI18nAtSign(item), { mode: 'arrow', onError: (e) => { throw e; } });
          } catch (error) {
            console.error(`${locale} FAIL ${path}[${index}]: ${error.message}`);
            process.exitCode = 1;
          }
        }
      });
    } else if (value && typeof value === 'object') {
      walk(value, path, locale);
    }
  }
}

for (const [locale, messages] of Object.entries({ de, en, es, fr, pt })) {
  walk(messages, '', locale);
}

if (!process.exitCode) {
  console.log('All locale strings compile OK');
}
