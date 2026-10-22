// Own account settings of a fresh user: language, notification preferences, auto-accept shares, avatar, app token,
// GDPR export, changed password. Dark mode is browser-side (localStorage) and checked in the UI by the explorer.
import { session, sha256, randomPassword } from '../../lib/api.mjs';

const NAME = 'qa-up-account';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
// setting name → value we store (the defaults are the opposite)
const SETTINGS = {
  'disable-email-notifications': { boolValue: true },
  'auto-accept-shares': { boolValue: false },
  'email-sending-interval-options': { stringValue: 'weekly' },
};

async function settings(api) {
  const bundles = (await api.json('POST', '/api/v0/settings/bundles-list', {})).bundles ?? [];
  const bundle = bundles.find(b => b.extension === 'opencloud-accounts');
  const values = (await api.json('POST', '/api/v0/settings/values-list', { account_uuid: 'me' })).values ?? [];
  return { bundle, values };
}

export async function seed(t) {
  const admin = await session('admin');
  const s = t.state = { password: randomPassword(), newPassword: randomPassword() };
  s.userId = (await admin.graph('POST', '/v1.0/users', {
    onPremisesSamAccountName: NAME, displayName: NAME, mail: `${NAME}@example.org`, passwordProfile: { password: s.password },
  })).id;
  await admin.dispose();

  const me = await session({ user: NAME, pass: s.password });
  await me.graph('PATCH', '/v1.0/me', { preferredLanguage: 'de' });

  const { bundle } = await settings(me);
  s.settings = {};
  for (const [name, value] of Object.entries(SETTINGS)) {
    const setting = bundle?.settings?.find(x => x.name === name);
    if (!setting) { s.settings[name] = null; continue; }
    await me.json('POST', '/api/v0/settings/values-save', {
      value: { bundleId: bundle.id, settingId: setting.id, accountUuid: 'me', resource: { type: 'TYPE_USER' }, ...value },
    });
    s.settings[name] = value;
  }

  const photo = await me.call('PATCH', '/graph/v1.0/me/photo/$value', { data: PNG, headers: { 'Content-Type': 'image/png' } });
  if (!photo.ok()) throw new Error(`avatar upload → HTTP ${photo.status()}`);
  s.avatar = sha256(PNG);

  const tok = await me.call('POST', '/auth-app/tokens?expiry=720h&label=qa-up-token');
  s.appToken = tok.ok() ? (await tok.json()).token : null;

  const gdpr = await me.call('POST', `/graph/v1.0/users/${s.userId}/exportPersonalData`, { data: { storageLocation: '/.personal_data_export.json' } });
  s.gdpr = gdpr.ok();

  await me.graph('POST', '/v1.0/me/changePassword', { currentPassword: s.password, newPassword: s.newPassword });
  await me.dispose();
}

export async function verify(t) {
  const s = t.state;
  let me;
  await t.check('login with the changed password', async () => { me = await session({ user: NAME, pass: s.newPassword }); });
  if (!me) return;
  await t.check('language de', async () => {
    const u = await me.graph('GET', '/v1.0/me');
    return u.preferredLanguage === 'de' || `preferredLanguage=${u.preferredLanguage}`;
  });
  const { bundle, values } = await settings(me);
  for (const [name, value] of Object.entries(s.settings)) {
    if (!value) { t.note(`setting ${name}`, 'not available in the from-version'); continue; }
    await t.check(`setting ${name}`, () => {
      const id = bundle?.settings?.find(x => x.name === name)?.id;
      const v = values.find(x => x.identifier?.setting === name || x.value?.settingId === id)?.value;
      const [k, expected] = Object.entries(value)[0];
      return v?.[k] === expected || `${k}=${v?.[k]}`;
    });
  }
  await t.check('avatar kept', async () => {
    const res = await me.call('GET', '/graph/v1.0/me/photo/$value');
    return (res.ok() && sha256(await res.body()) === s.avatar) || `HTTP ${res.status()}`;
  });
  if (s.appToken) {
    await t.check('app token listed', async () => {
      const res = await me.call('GET', '/auth-app/tokens');
      return /qa-up-token/.test(await res.text()) || 'label not in list';
    });
  } else t.note('app token', 'could not be created in the from-version');
  if (s.gdpr) {
    await t.check('GDPR export file exists', async () => {
      const d = await me.personalDrive();
      return (await me.get(d.id, '.personal_data_export.json')).status === 200 || 'file missing';
    });
  } else t.note('GDPR export', 'request failed in the from-version');
  await me.dispose();
}
