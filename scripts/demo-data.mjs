#!/usr/bin/env node
/**
 * Fills a development API with realistic sample data so every screen has something to show.
 * Needs the API in development mode with OTP_DEV_ECHO=true (codes are returned in the response).
 *
 *   node scripts/demo-data.mjs                     # uses http://localhost:4000
 *   API_URL=http://localhost:4000 node scripts/demo-data.mjs --inspect   # also prints every response shape
 *
 * Creates two people who are trusted contacts of each other:
 *   Kamla Devi  +91 98100 00001  (shares check-ins and help alerts with Priya)
 *   Priya Sharma +91 98100 00002 (Kamla's daughter, runs a household and a community group)
 * Sign in with those numbers; the sign-in code is shown on screen in development.
 */
const API = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '') + '/v1';
const inspect = process.argv.includes('--inspect');
const shapes = new Map();

function shape(v, depth = 0) {
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1)] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, depth > 3 ? typeof x : shape(x, depth + 1)]));
  return v === null ? null : typeof v;
}

async function req(token, method, path, body, extraHeaders = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text}`);
  if (inspect && method === 'GET') shapes.set(path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id').split('?')[0], shape(data));
  return data;
}

async function signIn(phone, name) {
  const c = await req(null, 'POST', '/auth/otp/request', { channel: 'sms', destination: phone });
  if (!c.devCode) throw new Error('The API did not return a dev code. Start it with OTP_DEV_ECHO=true (development only).');
  const v = await req(null, 'POST', '/auth/otp/verify', { challengeId: c.challengeId, code: c.devCode, displayName: name, ageConfirmed: true, acceptedPolicyVersion: '2026-10', deviceName: 'demo-data script' });
  if (v.status !== 'authenticated') throw new Error(`${name} has two-step verification on; sign in manually instead.`);
  const token = v.accessToken;
  return {
    get: (p) => req(token, 'GET', p),
    post: (p, b, h) => req(token, 'POST', p, b ?? {}, h),
    patch: (p, b) => req(token, 'PATCH', p, b),
    put: (p, b) => req(token, 'PUT', p, b ?? {}),
    del: (p) => req(token, 'DELETE', p),
    id: v.user.id,
  };
}

const inDays = (d, h = 10) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};
const day = (d) => inDays(d).slice(0, 10);

const step = async (label, fn) => {
  try {
    const r = await fn();
    console.log(`  ✓ ${label}`);
    return r;
  } catch (e) {
    console.log(`  ✗ ${label}: ${e.message}`);
    return null;
  }
};

console.log(`LifeSphere demo data → ${API}`);
const kamla = await signIn('+919810000001', 'Kamla Devi');
const priya = await signIn('+919810000002', 'Priya Sharma');
const localities = await kamla.get('/localities');
const locality = localities[0];
const categories = await kamla.get('/services/categories');
if (locality) {
  await kamla.patch('/me/profile', { localityId: locality.id, seniorMode: true });
  await priya.patch('/me/profile', { localityId: locality.id, discoverable: true });
}

console.log('Family care');
const contacts = await priya.get('/contacts');
if (!contacts.some((c) => c.contactUserId === kamla.id)) {
  const inv = await step('Priya invites Kamla', () => priya.post('/contacts/invitations', { phone: '+919810000001', label: 'Mother', proposedScopes: ['calendar.view'] }));
  const incoming = await kamla.get('/contacts/invitations/incoming');
  const mine = incoming.find((i) => i.id === inv?.id) ?? incoming[0];
  if (mine) await step('Kamla accepts', () => kamla.post(`/contacts/invitations/${mine.id}/respond`, { accept: true }));
}
await step('Kamla shares check-ins and help alerts with Priya', () => kamla.post('/grants', { granteeId: priya.id, scopes: ['checkins.view', 'checkins.alerts', 'help.alerts', 'help.location', 'tasks.view'] }).catch((e) => (String(e).includes('409') ? null : Promise.reject(e))));
await step('Morning check-in for Kamla', async () => {
  const s = await kamla.get('/check-ins/schedules');
  if (!s.length) await kamla.post('/check-ins/schedules', { label: 'Morning check-in', kind: 'daily', timeLocal: '09:00', escalate: true, escalationContactIds: [priya.id], consentToAlertContacts: true });
});
await step('Help settings', () => kamla.put('/help/preferences', { primaryCallContactId: priya.id, defaultMessage: 'Please call me' }));

console.log('LifeOS');
await step('Tasks', async () => {
  await kamla.post('/tasks', { title: 'Take blood pressure tablet', dueAt: inDays(0, 20), priority: 'high', recurrenceRule: 'FREQ=DAILY', reminderMinutesBefore: 15 });
  await kamla.post('/tasks', { title: 'Pay electricity bill', dueAt: inDays(2), priority: 'normal', visibility: 'shared' });
  await priya.post('/tasks', { title: 'Book Ma’s eye check-up', dueAt: inDays(1), priority: 'urgent' });
  await priya.post('/tasks', { title: 'Renew car insurance', dueAt: inDays(-1) });
});
await step('Reminder', () => kamla.post('/reminders', { title: 'Call Priya', fireAt: inDays(1, 18), channels: ['in_app', 'push'] }));
await step('Calendar', async () => {
  await kamla.post('/calendar/events', { title: 'Doctor appointment', kind: 'appointment', startsAt: inDays(3, 11), endsAt: inDays(3, 12), locationText: 'City Clinic, Sector 12', visibility: 'shared' });
  await priya.post('/calendar/events', { title: 'Visit Ma', kind: 'visit', startsAt: inDays(5, 17), visitForUserId: kamla.id, attendeeUserIds: [kamla.id], recurrenceRule: 'FREQ=WEEKLY' });
});

console.log('Household');
const hh = (await priya.get('/households'))[0] ?? (await step('Household', () => priya.post('/households', { name: 'Sharma home' })));
if (hh) {
  await step('Announcement', () => priya.post(`/households/${hh.id}/announcements`, { body: 'Plumber is coming on Saturday at 10 am.', pinned: true }));
  await step('Chore', () => priya.post('/tasks', { title: 'Water the plants', householdId: hh.id, isChore: true, visibility: 'household', dueAt: inDays(0, 8), recurrenceRule: 'FREQ=DAILY' }));
  const list = await step('Shopping list', () => priya.post('/lists', { name: 'Weekly groceries', householdId: hh.id }));
  if (list) for (const [name, quantity, unit, category] of [['Atta', 5, 'kg', 'Staples'], ['Toor dal', 1, 'kg', 'Staples'], ['Milk', 2, 'L', 'Dairy'], ['Tomatoes', 1, 'kg', 'Vegetables']]) await priya.post(`/lists/${list.id}/items`, { name, quantity, unit, category });
  const item = await step('Inventory', () => priya.post('/inventory', { name: 'Water purifier', category: 'appliance', brand: 'Kent', roomOrLocation: 'Kitchen', warrantyExpiresOn: day(200), householdId: hh.id }));
  if (item) await step('Maintenance schedule', () => priya.post(`/inventory/${item.id}/schedules`, { title: 'Replace filter', intervalDays: 90, nextDueOn: day(4) }));
  await step('Budget', async () => {
    const month = `${day(0).slice(0, 7)}-01`;
    await priya.post('/budgets', { month, category: 'Groceries', plannedAmount: 8000, spentAmount: 5200, householdId: hh.id });
    await priya.post('/budgets', { month, category: 'Electricity', plannedAmount: 2500, spentAmount: 2900, householdId: hh.id });
  });
}

console.log('Consumer');
await step('Purchase and complaint', async () => {
  const p = await kamla.post('/consumer/purchases', { productCategory: 'Mixer grinder', brand: 'Acme', retailerName: 'ShopKart', purchaseDate: day(-20), warrantyExpiresOn: day(345) });
  const c = await kamla.post('/consumer/cases', { title: 'Mixer stopped working', counterpartyName: 'ShopKart', category: 'ecommerce', purchaseId: p.id, description: 'Stopped after two weeks.' });
  await kamla.post(`/consumer/cases/${c.id}/timeline`, { kind: 'contact', occurredOn: day(-2), description: 'Called customer care, told to wait 3 days.' });
  await kamla.post(`/consumer/cases/${c.id}/drafts/generate`, { whatHappened: 'The mixer stopped working after two weeks of normal use.', whatYouWant: 'A replacement or full refund', tone: 'polite' });
});

console.log('Community');
const group = await step('Group and posts', async () => {
  const g = await priya.post('/community/groups', { name: 'Sector 6 Residents', visibility: 'public', category: 'apartment', localityId: locality?.id, description: 'Updates for residents of Sector 6.' });
  await kamla.post(`/community/groups/${g.id}/join`);
  const post = await priya.post(`/community/groups/${g.id}/posts`, { kind: 'announcement', title: 'Water supply', body: 'Water supply will be off tomorrow from 10 am to 2 pm for tank cleaning.' });
  await priya.post(`/community/groups/${g.id}/posts`, { kind: 'event', title: 'Diwali get-together', body: 'Join us in the community hall. Snacks on us!', eventStartsAt: inDays(10, 18), eventLocationText: 'Community hall' });
  await kamla.post(`/community/posts/${post.id}/comments`, { body: 'Thank you for letting us know.' });
  await kamla.put(`/community/posts/${post.id}/reaction`, { kind: 'thanks' });
  return g;
});
await step('Civic issue', () => kamla.post('/civic-issues', { category: 'streetlight', description: 'Streetlight outside Block C has not worked for a week.', locationText: 'Near Block C gate', localityId: locality?.id }));

console.log('Services');
await step('Provider profile and open request', async () => {
  const prov = await priya.post('/provider-portal/providers', { displayName: 'Priya’s Tuition', providerType: 'individual', description: 'Maths and science tuition for classes 6–10.' });
  if (categories[0]) await priya.post(`/provider-portal/providers/${prov.id}/services`, { categoryId: categories[0].id, title: 'Home visit', priceNote: 'Visit ₹300' });
  if (locality) await priya.put(`/provider-portal/providers/${prov.id}/areas`, { localityIds: [locality.id] });
  if (categories[0]) await kamla.post('/service-requests', { categoryId: categories[0].id, title: 'Ceiling fan making noise', localityId: locality?.id });
});
await step('Assistant question', () => kamla.post('/assistant/ask', { question: 'How do I complain about a defective product bought online?' }));

if (inspect) {
  console.log('\nResponse shapes:');
  const paths = [
    '/me', '/me/dashboard', '/contacts', '/contacts/invitations', '/contacts/invitations/incoming', '/grants', '/grants/who-can-see-me',
    '/check-ins/schedules', '/check-ins/events', '/check-ins/people', '/help/preferences', '/help/requests', '/help/requests/incoming',
    '/households', '/lists', '/inventory', '/consumer/purchases', '/consumer/cases', '/civic-issues', '/service-requests',
    '/provider-portal/providers', '/knowledge/topics', '/assistant/conversations', '/notifications/preferences', '/notifications/devices',
    '/privacy/requests', '/privacy/consents', '/community/groups/invitations', '/community/blocks', '/community/reports', '/community/feed',
  ];
  for (const p of paths) for (const who of [kamla, priya]) await who.get(p).catch(() => {});
  if (hh) await priya.get(`/households/${hh.id}`);
  if (hh) await priya.get(`/households/${hh.id}/invitations`);
  if (group) {
    await priya.get(`/community/groups/${group.id}`);
    await priya.get(`/community/groups/${group.id}/members`);
    const posts = await priya.get(`/community/groups/${group.id}/posts`);
    const pid = posts.items[0]?.id ?? posts.pinned?.[0]?.id;
    if (pid) await priya.get(`/community/posts/${pid}/comments`);
  }
  const provs = await priya.get('/provider-portal/providers');
  if (provs[0]) {
    await priya.get(`/provider-portal/providers/${provs[0].provider.id}`);
    await priya.get(`/provider-portal/providers/${provs[0].provider.id}/requests`);
  }
  const ev = (await priya.get(`/calendar/events?from=${inDays(-1)}&to=${inDays(30)}`)).items[0];
  if (ev) await priya.get(`/calendar/events/${ev.id}`);
  for (const [k, v] of shapes) console.log(k, JSON.stringify(v));
}
console.log('\nDone. Sign in as Kamla (+91 98100 00001) or Priya (+91 98100 00002).');
