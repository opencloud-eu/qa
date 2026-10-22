// Admin data: users (edited, disabled, Space Admin role), group with members, user quota, announcement banner.
import { session, userId, groupByName, APP_ROLES, randomPassword } from '../../lib/api.mjs';
import { URL } from '../../lib/oc.mjs';

const GB = 1024 ** 3;

async function createUser(admin, name, password) {
  return admin.graph('POST', '/v1.0/users', {
    onPremisesSamAccountName: name, displayName: name, mail: `${name}@example.org`, passwordProfile: { password },
  });
}

export async function seed(t) {
  const admin = await session('admin');
  const prev = t.state ?? {};
  const s = t.state = { users: {}, passwords: {} };
  // re-runnable: reuse users from an earlier (partial) seed, reset the password only if it is unknown
  for (const name of ['qa-up-user', 'qa-up-disabled', 'qa-up-spaceadmin']) {
    const existing = await userId(admin, name).catch(() => null);
    if (existing) {
      s.users[name] = existing;
      s.passwords[name] = prev.passwords?.[name];
      if (!s.passwords[name]) {
        s.passwords[name] = randomPassword();
        await admin.graph('PATCH', `/v1.0/users/${existing}`, { passwordProfile: { password: s.passwords[name] } });
      }
    } else {
      s.passwords[name] = randomPassword();
      s.users[name] = (await createUser(admin, name, s.passwords[name])).id;
    }
  }
  await admin.graph('PATCH', `/v1.0/users/${s.users['qa-up-user']}`, { displayName: 'QA Upgrade User (edited)', mail: 'qa-up-edited@example.org' });
  await admin.graph('PATCH', `/v1.0/users/${s.users['qa-up-disabled']}`, { accountEnabled: false });

  const app = (await admin.graph('GET', '/v1.0/applications')).value[0];
  const sa = await admin.graph('GET', `/v1.0/users/${s.users['qa-up-spaceadmin']}?$expand=appRoleAssignments`);
  if (!(sa.appRoleAssignments ?? []).some(a => a.appRoleId === APP_ROLES.spaceAdmin))
    await admin.graph('POST', `/v1.0/users/${s.users['qa-up-spaceadmin']}/appRoleAssignments`,
      { appRoleId: APP_ROLES.spaceAdmin, resourceId: app.id, principalId: s.users['qa-up-spaceadmin'] });

  const group = await groupByName(admin, 'qa-up-group') ?? await admin.graph('POST', '/v1.0/groups', { displayName: 'qa-up-group' });
  s.groupId = group.id;
  const members = ((await admin.graph('GET', `/v1.0/groups/${group.id}?$expand=members`)).members ?? []).map(m => m.id);
  for (const name of ['qa-up-user', 'qa-up-spaceadmin'])
    if (!members.includes(s.users[name]))
      await admin.graph('POST', `/v1.0/groups/${group.id}/members/$ref`, { '@odata.id': `${URL}/graph/v1.0/users/${s.users[name]}` });

  // the personal space exists after the first login
  const first = await session({ user: 'qa-up-user', pass: s.passwords['qa-up-user'] });
  const personal = await first.personalDrive();
  await first.dispose();
  await admin.graph('PATCH', `/v1.0/drives/${personal.id}`, { quota: { total: GB } });
  s.personalDriveId = personal.id;

  const ann = await admin.call('GET', '/announcement');
  if (ann.status() === 404) s.announcement = null;
  else {
    s.announcement = { enabled: true, bannerText: 'qa-up announcement banner', infoText: '**qa upgrade** info' };
    const res = await admin.call('PUT', '/announcement', { data: s.announcement });
    if (!res.ok()) throw new Error(`PUT /announcement → HTTP ${res.status()}`);
  }
  const all = (await admin.graph('GET', '/v1.0/users')).value;
  s.userCount = all.length;
  s.allUserIds = all.map(u => u.id);
  await admin.dispose();
}

export async function verify(t) {
  const s = t.state;
  const admin = await session('admin');
  // other areas may still add users after this seed, so check that no seeded user is gone instead of an exact count
  await t.check('no user lost', async () => {
    const now = (await admin.graph('GET', '/v1.0/users')).value.map(u => u.id);
    const before = s.allUserIds ?? [];
    const lost = before.filter(id => !now.includes(id));
    return lost.length === 0 || `lost ${lost.length}: ${lost.join(', ')}`;
  });
  await t.check('user ids unchanged', async () => {
    const wrong = [];
    for (const [name, id] of Object.entries(s.users)) if (await userId(admin, name).catch(() => null) !== id) wrong.push(name);
    return wrong.length === 0 || wrong.join(', ');
  });
  await t.check('edited display name and mail', async () => {
    const u = await admin.graph('GET', `/v1.0/users/${s.users['qa-up-user']}`);
    return (u.displayName === 'QA Upgrade User (edited)' && u.mail === 'qa-up-edited@example.org') || `${u.displayName} / ${u.mail}`;
  });
  await t.check('disabled user stays disabled', async () => {
    const u = await admin.graph('GET', `/v1.0/users/${s.users['qa-up-disabled']}?$select=accountEnabled`);
    return u.accountEnabled === false || `accountEnabled=${u.accountEnabled}`;
  });
  await t.check('Space Admin role kept', async () => {
    const u = await admin.graph('GET', `/v1.0/users/${s.users['qa-up-spaceadmin']}?$expand=appRoleAssignments`);
    return (u.appRoleAssignments ?? []).some(a => a.appRoleId === APP_ROLES.spaceAdmin) || 'role missing';
  });
  await t.check('group members kept', async () => {
    const g = await admin.graph('GET', `/v1.0/groups/${s.groupId}?$expand=members`);
    const ids = (g.members ?? []).map(x => x.id);
    return (ids.includes(s.users['qa-up-user']) && ids.includes(s.users['qa-up-spaceadmin'])) || `members: ${ids.length}`;
  });
  await t.check('user quota 1 GB', async () => {
    const d = await admin.graph('GET', `/v1.0/drives/${s.personalDriveId}`);
    return d.quota?.total === GB || `quota ${d.quota?.total}`;
  });
  if (s.announcement) {
    await t.check('announcement banner kept', async () => {
      const res = await admin.call('GET', '/announcement');
      const a = res.ok() ? await res.json() : null;
      return a?.bannerText === s.announcement.bannerText || `HTTP ${res.status()} ${JSON.stringify(a)?.slice(0, 120)}`;
    });
  } else t.note('announcement banner', 'not supported by the from-version');
  await admin.dispose();

  await t.check('user logs in with its password', async () => { await (await session({ user: 'qa-up-user', pass: s.passwords['qa-up-user'] })).dispose(); });
  await t.check('disabled user cannot log in', async () => {
    try { await session({ user: 'qa-up-disabled', pass: s.passwords['qa-up-disabled'] }); return 'login succeeded'; }
    catch { return true; }
  });
}
