import core from './tr/core.json';
import auth from './tr/auth.json';
import systemHealth from './tr/systemHealth.json';
import profile from './tr/profile.json';
import privacy from './tr/privacy.json';
import dashboard from './tr/dashboard.json';
import tournament from './tr/tournament.json';
import matches from './tr/matches.json';
import help from './tr/help.json';
import adminPages1 from './tr/adminPages1.json';
import adminPages2 from './tr/adminPages2.json';
import adminPages3 from './tr/adminPages3.json';
import adminCore from './tr/adminCore.json';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) return source;
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default [
  core,
  auth,
  systemHealth,
  profile,
  privacy,
  dashboard,
  tournament,
  matches,
  help,
  adminPages1,
  adminPages2,
  adminPages3,
  adminCore,
].reduce((acc, part) => deepMerge(acc, part), {});

