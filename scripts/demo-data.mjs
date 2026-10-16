#!/usr/bin/env node
/**
 * Fills a DEVELOPMENT API with realistic sample data so every feature has something to try.
 * Needs the API running in development with OTP_DEV_ECHO=true (sign-in codes come back in the response).
 *
 *   npm run demo-data                 # http://localhost:4000 (or API_URL=...)
 *   npm run demo-data -- --force      # run again even if the sample data already exists
 *   npm run demo-data -- --no-admin   # skip the staff steps (provider approvals etc.)
 *
 * People (sign in with the number; the code is shown on screen in development):
 *   9810000001  Kamla Devi    – mother, senior mode, Hindi. Shares check-ins & help alerts with her family.
 *   9810000002  Priya Sharma  – daughter. Runs the household, a residents' group, has a provider profile in review.
 *   9810000003  Rahul Sharma  – Priya's husband. Household member, gets help alerts too.
 *   9810000004  Meena Iyer    – neighbour. Community member; one of her posts is reported for moderation.
 *   9810000005  Arjun Kumar   – electrician. Verified provider with jobs, reviews and an open request to claim.
 *   9810000006  Sunita Rao    – home cook / cleaning service. Verified provider.
 *   9999900001  Admin         – staff console (needs `npm run db:seed -- --admin=+919999900001` in the API first).
 */
import { createHmac } from 'node:crypto';

const API = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '') + '/v1';
const FORCE = process.argv.includes('--force');
const NO_ADMIN = process.argv.includes('--no-admin');
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? '+919999900001';
let failures = 0;

async function req(token, method, path, body) {
  let r;
  try {
    r = await fetch(API + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(method === 'POST' ? { 'idempotency-key': `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Cannot reach the API at ${API}. Start it first (npm run dev:all in the API folder).`);
  }
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const e = new Error(`${method} ${path} → ${r.status} ${data?.message ?? text}`);
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

function client(token, user) {
  return {
    token,
    id: user.id,
    get: (p) => req(token, 'GET', p),
    post: (p, b) => req(token, 'POST', p, b ?? {}),
    patch: (p, b) => req(token, 'PATCH', p, b),
    put: (p, b) => req(token, 'PUT', p, b ?? {}),
    del: (p) => req(token, 'DELETE', p),
  };
}

async function signIn(phone, name) {
  const c = await req(null, 'POST', '/auth/otp/request', { channel: 'sms', destination: phone });
  if (!c.devCode) throw new Error('The API did not return a sign-in code. Start it with OTP_DEV_ECHO=true (development only).');
  const v = await req(null, 'POST', '/auth/otp/verify', {
    challengeId: c.challengeId, code: c.devCode, displayName: name, ageConfirmed: true, acceptedPolicyVersion: '2026-10', deviceName: 'demo-data script',
  });
  if (v.status !== 'authenticated') throw new Error(`${name} has two-step verification on; this script can't sign in as them.`);
  return client(v.accessToken, v.user);
}

/** Authenticator code (RFC 6238 TOTP, SHA-1, 6 digits, 30 s) for a base32 secret. */
function totp(secret, offsetSteps = 0) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Staff session: the admin must sign in with an authenticator code. Sets one up if the admin has none yet. */
async function adminSignIn() {
  const c = await req(null, 'POST', '/auth/otp/request', { channel: 'sms', destination: ADMIN_PHONE });
  const v = await req(null, 'POST', '/auth/otp/verify', { challengeId: c.challengeId, code: c.devCode, deviceName: 'demo-data script' });
  if (v.status === 'mfa_required') {
    const secret = process.env.ADMIN_TOTP_SECRET;
    if (!secret) return { skipped: 'the admin already has an authenticator. Set ADMIN_TOTP_SECRET=<its key> to let this script use it' };
    const m = await req(null, 'POST', '/auth/mfa/verify', { mfaToken: v.mfaToken, code: totp(secret) });
    return { admin: client(m.accessToken, m.user) };
  }
  const me = await req(v.accessToken, 'GET', '/me');
  if (!me.staffRoles?.length) return { skipped: `${ADMIN_PHONE} is not staff. In the API folder run: npm run db:seed -- --admin=${ADMIN_PHONE}` };
  // Enrol an authenticator (needs a fresh re-authentication), then sign in again with it.
  const r = await req(v.accessToken, 'POST', '/auth/reauth/request', { channel: 'sms' });
  await req(v.accessToken, 'POST', '/auth/reauth/verify', { challengeId: r.challengeId, code: r.devCode });
  const setup = await req(v.accessToken, 'POST', '/auth/mfa/totp/setup', {});
  const confirmed = await req(v.accessToken, 'POST', '/auth/mfa/totp/confirm', { code: totp(setup.secret) });
  // A code can be used once; wait for the next 30-second window before signing in with MFA.
  await new Promise((res) => setTimeout(res, (30 - ((Date.now() / 1000) % 30)) * 1000 + 1500));
  const c2 = await req(null, 'POST', '/auth/otp/request', { channel: 'sms', destination: ADMIN_PHONE });
  const v2 = await req(null, 'POST', '/auth/otp/verify', { challengeId: c2.challengeId, code: c2.devCode, deviceName: 'demo-data script' });
  const m = await req(null, 'POST', '/auth/mfa/verify', { mfaToken: v2.mfaToken, code: totp(setup.secret) });
  return { admin: client(m.accessToken, m.user), newSecret: setup.secret, recoveryCodes: confirmed?.recoveryCodes };
}

const at = (days, hour = 10, minute = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  x.setHours(hour, minute, 0, 0);
  return x.toISOString();
};
const day = (d) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const thisMonth = `${day(0).slice(0, 7)}-01`;
const ignoreConflict = (e) => (e.status === 409 ? null : Promise.reject(e));

async function step(label, fn) {
  try {
    const r = await fn();
    console.log(`  ✓ ${label}`);
    return r;
  } catch (e) {
    failures++;
    console.log(`  ✗ ${label}: ${e.message}`);
    return null;
  }
}
const section = (s) => console.log(`\n${s}`);

// ────────────────────────────────────────────────────────────────────────────
console.log(`LifeSphere sample data → ${API}`);
const kamla = await signIn('+919810000001', 'Kamla Devi');
const priya = await signIn('+919810000002', 'Priya Sharma');
const rahul = await signIn('+919810000003', 'Rahul Sharma');
const meena = await signIn('+919810000004', 'Meena Iyer');
const arjun = await signIn('+919810000005', 'Arjun Kumar');
const sunita = await signIn('+919810000006', 'Sunita Rao');

if (!FORCE && (await priya.get('/households')).some((h) => h.name === 'Sharma home')) {
  console.log('\nSample data is already there. Sign in with the numbers above, or run `npm run demo-data -- --force` to add another copy.');
  process.exit(0);
}

const localities = await kamla.get('/localities');
const locality = localities.find((l) => l.city === 'New Delhi') ?? localities[0];
const categories = await kamla.get('/services/categories');
const cat = (slug) => categories.find((c) => c.slug === slug) ?? categories[0];

section('Profiles');
await step('Kamla: senior mode, Hindi, larger text', async () => {
  await kamla.patch('/me/profile', { localityId: locality?.id, seniorMode: true, locale: 'hi-IN', bio: 'Retired teacher. Loves gardening.' });
  await kamla.patch('/me/preferences', { accessibility: { textScale: 1.3, simpleConfirmations: true } });
});
await step('Priya, Rahul, Meena: locality and profiles', async () => {
  await priya.patch('/me/profile', { localityId: locality?.id, discoverable: true, bio: 'Product manager, mother of two.' });
  await rahul.patch('/me/profile', { localityId: locality?.id, discoverable: true });
  await meena.patch('/me/profile', { localityId: locality?.id, discoverable: true });
  await priya.patch('/me/preferences', { quietHoursStart: '22:30', quietHoursEnd: '07:00' });
});

// ────────────────────────────────────────────────────────────────────────────
section('Trusted contacts');
async function connect(from, to, toPhone, label, back) {
  const existing = await from.get('/contacts');
  if (existing.some((c) => c.contactUserId === to.id)) return;
  const inv = await from.post('/contacts/invitations', { phone: toPhone, label, message: `Hi, it's me. Adding you on LifeSphere.` });
  const incoming = await to.get('/contacts/invitations/incoming');
  const mine = incoming.find((i) => i.id === inv.id) ?? incoming[0];
  await to.post(`/contacts/invitations/${mine.id}/respond`, { accept: true });
  if (back) await to.patch(`/contacts/${from.id}`, { label: back }).catch(() => {});
}
await step('Priya ⇄ Kamla (Mother / Daughter)', () => connect(priya, kamla, '+919810000001', 'Mother', 'Daughter'));
await step('Rahul ⇄ Kamla', () => connect(rahul, kamla, '+919810000001', 'Mother-in-law', 'Son-in-law'));
await step('Priya ⇄ Rahul', () => connect(priya, rahul, '+919810000003', 'Husband', 'Wife'));
await step('Meena invites Priya (left pending, so Priya can accept or decline)', async () => {
  const out = await meena.get('/contacts/invitations');
  if (!out.some((i) => i.status === 'pending')) await meena.post('/contacts/invitations', { phone: '+919810000002', label: 'Neighbour', message: 'Hello from flat 4B!' });
});

section('Sharing (consented, with a cooling-off period before it starts)');
await step('Kamla shares check-ins, help alerts, location, tasks and calendar with Priya', () =>
  kamla.post('/grants', { granteeId: priya.id, scopes: ['checkins.view', 'checkins.alerts', 'help.alerts', 'help.location', 'tasks.view', 'calendar.view'] }).catch(ignoreConflict));
await step('Kamla shares help alerts with Rahul', () => kamla.post('/grants', { granteeId: rahul.id, scopes: ['help.alerts', 'checkins.alerts'] }).catch(ignoreConflict));
await step('Priya lets Rahul see and assign her tasks', () => priya.post('/grants', { granteeId: rahul.id, scopes: ['tasks.view', 'tasks.assign', 'calendar.view'] }).catch(ignoreConflict));
await step('Rahul lets Priya assign him tasks', () => rahul.post('/grants', { granteeId: priya.id, scopes: ['tasks.assign', 'calendar.view'] }).catch(ignoreConflict));

section('Check-ins');
await step('Kamla: daily morning and evening check-ins that alert Priya and Rahul', async () => {
  const s = await kamla.get('/check-ins/schedules');
  if (!s.length) {
    await kamla.post('/check-ins/schedules', { label: 'Morning check-in', kind: 'daily', timeLocal: '09:00', graceMinutes: 30, escalate: true, escalationContactIds: [priya.id, rahul.id], consentToAlertContacts: true });
    await kamla.post('/check-ins/schedules', { label: 'Evening walk back home', kind: 'daily', timeLocal: '19:30', graceMinutes: 45, escalate: true, escalationContactIds: [priya.id], consentToAlertContacts: true });
    await kamla.post('/check-ins/schedules', { label: 'Confirm the nurse visited', kind: 'visit_confirmation', oneOffAt: at(2, 11), escalate: false });
  }
});
await step('Kamla checks in now ("I\'m OK")', () => kamla.post('/check-ins/now', { note: 'Feeling well, going to the temple.' }));

section('Help button');
await step('Help settings for Kamla', () => kamla.put('/help/preferences', { primaryCallContactId: priya.id, notifyContacts: true, shareLocationByDefault: true, defaultMessage: 'Please call me, I need help.' }));
await step('A past help request (raised → acknowledged by Priya → resolved)', async () => {
  const h = (await kamla.post('/help/requests', { kind: 'notify_contacts', message: 'Feeling dizzy, please call.', shareLocation: true, lat: 28.5921, lng: 77.046 })).helpRequest;
  const incoming = await priya.get('/help/requests/incoming').catch(() => []);
  const forPriya = (incoming.items ?? incoming).find?.((x) => x.id === h.id);
  if (forPriya) await priya.post(`/help/requests/${h.id}/acknowledge`);
  await kamla.post(`/help/requests/${h.id}/resolve`);
});

// ────────────────────────────────────────────────────────────────────────────
section('Tasks, reminders and calendar');
const catIds = {};
await step('Task categories', async () => {
  for (const [name, color] of [['Health', '#b42318'], ['Bills', '#1f5a8a'], ['Home', '#17663a'], ['Kids', '#8a5a00']]) {
    const c = await priya.post('/task-categories', { name, color }).catch(ignoreConflict);
    if (c) catIds[name] = c.id;
  }
  const h = await kamla.post('/task-categories', { name: 'Health', color: '#b42318' }).catch(ignoreConflict);
  if (h) catIds.kamlaHealth = h.id;
});
await step('Kamla: medicine (daily), bills, pension', async () => {
  await kamla.post('/tasks', { title: 'Take blood pressure tablet', categoryId: catIds.kamlaHealth, dueAt: at(0, 20), priority: 'high', recurrenceRule: 'FREQ=DAILY', reminderMinutesBefore: 15 });
  await kamla.post('/tasks', { title: 'Pay electricity bill', dueAt: at(2), priority: 'normal', visibility: 'shared', notes: 'BSES account ends 4471' });
  await kamla.post('/tasks', { title: 'Submit life certificate for pension', dueAt: at(12), priority: 'high', visibility: 'shared', notes: 'Bank branch, carry Aadhaar and PPO.' });
  const done = await kamla.post('/tasks', { title: 'Collect new spectacles', dueAt: at(-3) });
  await kamla.post(`/tasks/${done.id}/complete`);
});
await step('Priya: overdue, today, upcoming, done, recurring', async () => {
  await priya.post('/tasks', { title: 'Renew car insurance', categoryId: catIds.Bills, dueAt: at(-2), priority: 'high' });
  await priya.post('/tasks', { title: 'Book Ma’s eye check-up', categoryId: catIds.Health, dueAt: at(0, 17), priority: 'urgent', notes: 'Dr Mehra, Centre for Sight' });
  await priya.post('/tasks', { title: 'School fee – second term', categoryId: catIds.Kids, dueAt: at(4), priority: 'normal', reminderMinutesBefore: 1440 });
  await priya.post('/tasks', { title: 'Weekly call with Ma', dueAt: at(1, 19), recurrenceRule: 'FREQ=WEEKLY', reminderMinutesBefore: 10 });
  await priya.post('/tasks', { title: 'Plan Diwali shopping', dueAt: at(9), priority: 'low' });
  const d = await priya.post('/tasks', { title: 'Pay maid salary', categoryId: catIds.Bills, dueAt: at(-1) });
  await priya.post(`/tasks/${d.id}/complete`);
});
await step('Rahul: his own tasks', async () => {
  await rahul.post('/tasks', { title: 'Service the car', dueAt: at(6), priority: 'normal' });
  await rahul.post('/tasks', { title: 'Fix the bathroom tap', dueAt: at(-1), priority: 'normal' });
});
await step('Reminders', async () => {
  await kamla.post('/reminders', { title: 'Call Priya', fireAt: at(1, 18), channels: ['in_app', 'push'] });
  await kamla.post('/reminders', { title: 'Yoga class', fireAt: at(2, 7), channels: ['in_app'] });
  await priya.post('/reminders', { title: 'Order groceries', fireAt: at(0, 21), channels: ['in_app', 'push'] });
  await priya.post('/reminders', { title: 'Parent–teacher meeting', fireAt: at(3, 9), channels: ['in_app', 'email'] });
});
await step('Calendar events (appointments, visits, activities; one weekly)', async () => {
  await kamla.post('/calendar/events', { title: 'Doctor appointment', kind: 'appointment', startsAt: at(3, 11), endsAt: at(3, 12), locationText: 'City Clinic, Sector 12', visibility: 'shared', reminderMinutesBefore: 60 });
  await kamla.post('/calendar/events', { title: 'Satsang', kind: 'activity', startsAt: at(1, 17), endsAt: at(1, 19), locationText: 'Community hall' });
  await priya.post('/calendar/events', { title: 'Visit Ma', kind: 'visit', startsAt: at(5, 17), endsAt: at(5, 19), visitForUserId: kamla.id, attendeeUserIds: [kamla.id, rahul.id], recurrenceRule: 'FREQ=WEEKLY', visibility: 'shared' });
  await priya.post('/calendar/events', { title: 'Team offsite', kind: 'other', startsAt: at(7, 9), endsAt: at(7, 18), allDay: false });
  await priya.post('/calendar/events', { title: 'Bank – home loan papers', kind: 'errand', startsAt: at(2, 15), endsAt: at(2, 16), locationText: 'HDFC, Dwarka Sec 6' });
  await rahul.post('/calendar/events', { title: 'Cricket with friends', kind: 'activity', startsAt: at(6, 7), endsAt: at(6, 10) });
});
await step('Kamla and Rahul accept the visit invitation', async () => {
  const evs = await kamla.get(`/calendar/events?from=${encodeURIComponent(at(-1))}&to=${encodeURIComponent(at(14))}`);
  const visit = (evs.items ?? evs).find((e) => e.title === 'Visit Ma');
  if (visit) {
    await kamla.post(`/calendar/events/${visit.id}/rsvp`, { status: 'accepted' });
    await rahul.post(`/calendar/events/${visit.id}/rsvp`, { status: 'tentative' }).catch(() => {});
  }
});

// ────────────────────────────────────────────────────────────────────────────
section('Household');
const hh = await step('Sharma home, with Rahul and Kamla as members', async () => {
  const h = await priya.post('/households', { name: 'Sharma home' });
  for (const [who, phone, role] of [[rahul, '+919810000003', 'admin'], [kamla, '+919810000001', 'member']]) {
    const inv = await priya.post(`/households/${h.id}/invitations`, { phone, role });
    await who.post(`/households/invitations/${inv.id}/respond`, { accept: true });
  }
  return h;
});
if (hh) {
  await step('Announcements', async () => {
    await priya.post(`/households/${hh.id}/announcements`, { body: 'Plumber is coming on Saturday at 10 am. Someone please be home.', pinned: true });
    await rahul.post(`/households/${hh.id}/announcements`, { body: 'Wi-Fi password changed – it’s on the fridge.' });
  });
  await step('Chores (daily, weekly, assigned)', async () => {
    await priya.post('/tasks', { title: 'Water the plants', householdId: hh.id, isChore: true, visibility: 'household', dueAt: at(0, 8), recurrenceRule: 'FREQ=DAILY' });
    await priya.post('/tasks', { title: 'Take out recycling', householdId: hh.id, isChore: true, visibility: 'household', dueAt: at(1, 20), recurrenceRule: 'FREQ=WEEKLY', assigneeUserIds: [rahul.id] }).catch(() => priya.post('/tasks', { title: 'Take out recycling', householdId: hh.id, isChore: true, visibility: 'household', dueAt: at(1, 20), recurrenceRule: 'FREQ=WEEKLY' }));
    await priya.post('/tasks', { title: 'Clean the water tank', householdId: hh.id, isChore: true, visibility: 'household', dueAt: at(-4) });
    await priya.post('/tasks', { title: 'Pick up Ma’s medicines from the chemist', householdId: hh.id, visibility: 'household', dueAt: at(1, 18), priority: 'high', assigneeUserIds: [rahul.id] });
  });
  await step('Shopping lists (some items ticked)', async () => {
    const list = await priya.post('/lists', { name: 'Weekly groceries', householdId: hh.id });
    const items = [['Atta', 5, 'kg', 'Staples'], ['Toor dal', 1, 'kg', 'Staples'], ['Basmati rice', 5, 'kg', 'Staples'], ['Milk', 2, 'L', 'Dairy'], ['Paneer', 500, 'g', 'Dairy'], ['Tomatoes', 1, 'kg', 'Vegetables'], ['Onions', 2, 'kg', 'Vegetables'], ['Coriander', 1, 'bunch', 'Vegetables'], ['Dishwash liquid', 1, null, 'Household']];
    const made = [];
    for (const [name, quantity, unit, category] of items) made.push(await priya.post(`/lists/${list.id}/items`, { name, quantity, ...(unit ? { unit } : {}), category }));
    for (const it of made.slice(0, 3)) await rahul.patch(`/lists/items/${it.id}`, { done: true });
    const diwali = await priya.post('/lists', { name: 'Diwali', householdId: hh.id });
    for (const name of ['Diyas', 'Rangoli colours', 'Sweets box ×4', 'Gift wrap']) await priya.post(`/lists/${diwali.id}/items`, { name });
    const personal = await kamla.post('/lists', { name: 'Medicines' });
    for (const name of ['Amlodipine 5 mg', 'Calcium tablets', 'Eye drops']) await kamla.post(`/lists/${personal.id}/items`, { name });
  });
  const items = await step('Home inventory (warranties, maintenance, service history)', async () => {
    const purifier = await priya.post('/inventory', { name: 'Water purifier', category: 'appliance', brand: 'Kent', model: 'Grand Plus', roomOrLocation: 'Kitchen', purchaseDate: day(-300), warrantyExpiresOn: day(65), householdId: hh.id });
    await priya.post(`/inventory/${purifier.id}/schedules`, { title: 'Replace filter', intervalDays: 90, nextDueOn: day(4), reminderLeadDays: 3 });
    await priya.post(`/inventory/${purifier.id}/records`, { performedOn: day(-86), description: 'Filter replaced', providerName: 'Kent service' });
    const ac = await priya.post('/inventory', { name: 'Bedroom AC', category: 'appliance', brand: 'Voltas', model: '1.5 T inverter', roomOrLocation: 'Bedroom', installedOn: day(-700), warrantyExpiresOn: day(-5), householdId: hh.id });
    await priya.post(`/inventory/${ac.id}/schedules`, { title: 'AC service before summer', intervalDays: 180, nextDueOn: day(-2) });
    const fridge = await priya.post('/inventory', { name: 'Refrigerator', category: 'appliance', brand: 'LG', model: 'GL-T292', roomOrLocation: 'Kitchen', purchaseDate: day(-1200), warrantyExpiresOn: day(400), notes: 'Compressor warranty 10 years', householdId: hh.id });
    await priya.post('/inventory', { name: 'Inverter battery', category: 'electrical', brand: 'Exide', roomOrLocation: 'Utility', installedOn: day(-500), warrantyExpiresOn: day(230), householdId: hh.id });
    await priya.post('/inventory', { name: 'Car – Swift', category: 'vehicle', brand: 'Maruti', model: 'Swift VXi', purchaseDate: day(-900), notes: 'Insurance renews every November', householdId: hh.id });
    return { purifier, ac, fridge };
  });
  await step('Budget for this month (some over, some under)', async () => {
    for (const [category, plannedAmount, spentAmount] of [['Groceries', 8000, 5200], ['Electricity', 2500, 2900], ['Fuel', 4000, 3100], ['Eating out', 3000, 3600], ['Medicines', 1500, 900], ['School', 6000, 6000]]) {
      await priya.post('/budgets', { month: thisMonth, category, plannedAmount, spentAmount, householdId: hh.id });
    }
    await kamla.post('/budgets', { month: thisMonth, category: 'Pension spending', plannedAmount: 12000, spentAmount: 7400 });
  });
  globalThis.inventory = items;
}

// ────────────────────────────────────────────────────────────────────────────
section('Consumer help');
await step('Purchases and three complaints at different stages', async () => {
  const mixer = await kamla.post('/consumer/purchases', { productCategory: 'Mixer grinder', brand: 'Acme', model: 'MG-750', retailerName: 'ShopKart', purchaseDate: day(-20), warrantyExpiresOn: day(345), returnDeadline: day(-10) });
  const c1 = await kamla.post('/consumer/cases', { title: 'Mixer stopped working', counterpartyName: 'ShopKart', category: 'ecommerce', purchaseId: mixer.id, description: 'Stopped after two weeks.', nextFollowUpOn: day(3) });
  await kamla.post(`/consumer/cases/${c1.id}/timeline`, { kind: 'contact', occurredOn: day(-5), description: 'Called customer care, told to wait 3 days.' });
  await kamla.post(`/consumer/cases/${c1.id}/timeline`, { kind: 'follow_up', occurredOn: day(-1), description: 'No call back yet.' });
  await kamla.post(`/consumer/cases/${c1.id}/drafts/generate`, { whatHappened: 'The mixer stopped working after two weeks of normal use. Customer care promised a call back but nobody called.', whatYouWant: 'A replacement or a full refund', tone: 'polite', includeTimeline: true });

  const phone = await priya.post('/consumer/purchases', { productCategory: 'Mobile phone', brand: 'Nova', model: 'X5', retailerName: 'MobileHub', purchaseDate: day(-60), warrantyExpiresOn: day(305) });
  const c2 = await priya.post('/consumer/cases', { title: 'Phone screen flickers – service centre refusing warranty', counterpartyName: 'Nova Service Centre', category: 'warranty', purchaseId: phone.id, description: 'They say it is physical damage; there is none.' });
  await priya.post(`/consumer/cases/${c2.id}/timeline`, { kind: 'response', occurredOn: day(-3), description: 'Service centre rejected the claim by SMS.' });
  await priya.post(`/consumer/cases/${c2.id}/status`, { status: 'ready_to_submit' });
  await priya.post(`/consumer/cases/${c2.id}/status`, { status: 'submitted_by_user', externalReference: 'NCH-2026-118842', confirmSubmittedMyself: true, note: 'Filed on the National Consumer Helpline.' });

  const c3 = await priya.post('/consumer/cases', { title: 'Broadband refund for 5 days outage', counterpartyName: 'FastNet', category: 'telecom', description: 'Internet down 5 days, asked for pro-rata refund.' });
  await priya.post(`/consumer/cases/${c3.id}/status`, { status: 'ready_to_submit' });
  await priya.post(`/consumer/cases/${c3.id}/status`, { status: 'submitted_by_user', confirmSubmittedMyself: true });
  await priya.post(`/consumer/cases/${c3.id}/status`, { status: 'awaiting_response' });
  await priya.post(`/consumer/cases/${c3.id}/status`, { status: 'resolved', note: '₹410 credited to the next bill.' });
});

// ────────────────────────────────────────────────────────────────────────────
section('Community');
const groups = await step('Three groups (public residents, private family, seniors club)', async () => {
  const residents = await priya.post('/community/groups', { name: 'Dwarka Sector 6 Residents', visibility: 'public', category: 'apartment', localityId: locality?.id, description: 'Updates, help and events for residents of Sector 6.', rules: 'Be kind. No selling. No forwards.' });
  const family = await priya.post('/community/groups', { name: 'Sharma family', visibility: 'private', category: 'family', description: 'Just us.' });
  const seniors = await meena.post('/community/groups', { name: 'Morning Walkers Club', visibility: 'public', category: 'seniors', localityId: locality?.id, description: 'Walks at 6:30 am in the district park.' });
  for (const u of [kamla, rahul, meena, arjun, sunita]) await u.post(`/community/groups/${residents.id}/join`).catch(() => {});
  await kamla.post(`/community/groups/${seniors.id}/join`);
  await priya.post(`/community/groups/${family.id}/invitations`, { userId: rahul.id });
  await priya.post(`/community/groups/${family.id}/invitations`, { userId: kamla.id });
  const invs = await rahul.get('/community/groups/invitations');
  const inv = (invs.items ?? invs).find((i) => i.groupId === family.id || i.group?.id === family.id);
  if (inv) await rahul.post(`/community/groups/invitations/${inv.id}/respond`, { accept: true });
  await priya.patch(`/community/groups/${residents.id}/members/${meena.id}`, { role: 'moderator' });
  return { residents, family, seniors };
});
let spamPost = null;
if (groups) {
  await step('Posts of every kind, comments, reactions, a pinned post and a bookmark', async () => {
    const { residents, family, seniors } = groups;
    const water = await priya.post(`/community/groups/${residents.id}/posts`, { kind: 'announcement', title: 'Water supply off tomorrow', body: 'Water supply will be off tomorrow from 10 am to 2 pm for tank cleaning. Please store water tonight.' });
    await priya.post(`/community/posts/${water.id}/pin`, { pinned: true });
    await priya.post(`/community/groups/${residents.id}/posts`, { kind: 'event', title: 'Diwali get-together', body: 'Join us in the community hall. Snacks on us! Kids’ rangoli competition at 6.', eventStartsAt: at(10, 18), eventEndsAt: at(10, 21), eventLocationText: 'Community hall, Block A' });
    const rec = await meena.post(`/community/groups/${residents.id}/posts`, { kind: 'recommendation', title: 'Good electrician', body: 'Arjun fixed our wiring quickly and charged fairly. Highly recommend.' });
    const q = await kamla.post(`/community/groups/${residents.id}/posts`, { kind: 'help_request', title: 'Someone to help with online bill payment?', body: 'I find the electricity website confusing. Could a neighbour help me once?' });
    await rahul.post(`/community/groups/${residents.id}/posts`, { kind: 'lost_found', title: 'Found: car keys near gate 2', body: 'Maruti key with a blue keychain. With the guard.' });
    await meena.post(`/community/groups/${residents.id}/posts`, { kind: 'civic_info', title: 'Property tax deadline', body: 'MCD property tax rebate ends on the 30th. Pay online at the MCD website.' });
    await kamla.post(`/community/groups/${seniors.id}/posts`, { kind: 'text', body: 'Lovely walk today! See everyone tomorrow at 6:30.' });
    await priya.post(`/community/groups/${family.id}/posts`, { kind: 'text', body: 'Ma’s birthday dinner on Sunday – I’ll book the table.' });
    await kamla.post(`/community/posts/${water.id}/comments`, { body: 'Thank you for letting us know.' });
    const c = await meena.post(`/community/posts/${q.id}/comments`, { body: 'Aunty, I can come by on Sunday morning and show you.' });
    await kamla.post(`/community/posts/${q.id}/comments`, { body: 'Thank you beta, that would be wonderful.', parentCommentId: c.id });
    await kamla.put(`/community/posts/${water.id}/reaction`, { kind: 'thanks' });
    await rahul.put(`/community/posts/${water.id}/reaction`, { kind: 'like' });
    await priya.put(`/community/posts/${rec.id}/reaction`, { kind: 'helpful' });
    await priya.put(`/community/posts/${q.id}/reaction`, { kind: 'support' });
    await priya.put(`/community/posts/${rec.id}/bookmark`);
  });
  spamPost = await step('A spam post, reported by Priya and Kamla (goes to the moderation queue)', async () => {
    const p = await sunita.post(`/community/groups/${groups.residents.id}/posts`, { kind: 'text', body: 'EARN ₹50,000 A WEEK FROM HOME!!! Click my link and send your bank details to join. Limited seats!!!' });
    await priya.post('/community/reports', { targetType: 'post', targetId: p.id, reason: 'spam', details: 'Looks like a scam asking for bank details.' });
    await kamla.post('/community/reports', { targetType: 'post', targetId: p.id, reason: 'fraud' }).catch(ignoreConflict);
    return p;
  });
}
await step('Civic issues (one shared to the residents group)', async () => {
  const light = await kamla.post('/civic-issues', { category: 'streetlight', description: 'Streetlight outside Block C has not worked for a week. It is very dark for evening walks.', locationText: 'Near Block C gate', localityId: locality?.id });
  if (groups) await kamla.post(`/civic-issues/${light.id}/share`, { groupId: groups.residents.id }).catch(() => {});
  await priya.post('/civic-issues', { category: 'garbage', description: 'Garbage not collected for 3 days on the service lane behind Block D.', locationText: 'Service lane, Block D', localityId: locality?.id });
  await rahul.post('/civic-issues', { category: 'road', description: 'Big pothole at the main gate turning. Two scooters slipped this week.', locationText: 'Main gate, Sector 6 road', localityId: locality?.id });
});

// ────────────────────────────────────────────────────────────────────────────
section('Local services');
async function provider(owner, profile, services) {
  const mine = await owner.get('/provider-portal/providers');
  const existing = mine.find((m) => (m.provider ?? m).displayName === profile.displayName);
  const p = existing ? existing.provider ?? existing : await owner.post('/provider-portal/providers', profile);
  for (const [slug, title, priceNote, description] of services) await owner.post(`/provider-portal/providers/${p.id}/services`, { categoryId: cat(slug).id, title, priceNote, description }).catch(ignoreConflict);
  if (locality) await owner.put(`/provider-portal/providers/${p.id}/areas`, { localityIds: [locality.id, ...localities.filter((l) => l.city === locality.city && l.id !== locality.id).map((l) => l.id)] });
  await owner.post(`/provider-portal/providers/${p.id}/submit`).catch(() => {});
  return p;
}
const arjunP = await step('Arjun Electricals (submitted for verification)', () =>
  provider(arjun, { displayName: 'Arjun Electricals', providerType: 'individual', description: '15 years’ experience. Wiring, fans, inverters, MCB and appliance repair. Same-day visits in Dwarka.', phonePublic: '+919810000005' }, [
    ['electrical', 'Electrical repair visit', '₹250 visit + parts', 'Wiring faults, switches, MCB, fans and lights.'],
    ['appliance-repair', 'Mixer, iron and geyser repair', 'From ₹300', 'Small appliance repair at home.'],
  ]));
const sunitaP = await step('Sunita Home Services (submitted for verification)', () =>
  provider(sunita, { displayName: 'Sunita Home Services', providerType: 'business', description: 'Trained, background-checked staff for home cleaning and senior companionship.', emailPublic: 'sunita.services@example.in' }, [
    ['home-cleaning', 'Deep cleaning (2BHK)', '₹2,499', 'Kitchen, bathrooms, fans and windows.'],
    ['senior-companionship', 'Companion for elders (4 hours)', '₹600 per visit', 'Conversation, walks, help with errands.'],
  ]));
await step('Priya’s Tuition (left in review – shows the provider portal while waiting)', () =>
  provider(priya, { displayName: 'Priya’s Maths Tuition', providerType: 'individual', description: 'Maths for classes 6–10, weekends only.' }, [['tech-help', 'Online maths session', '₹400 per hour']]));

// Staff: verify and approve the two providers so they show in search.
let adminInfo = null;
if (!NO_ADMIN) {
  section('Staff console');
  adminInfo = await step('Admin signs in with an authenticator', () => adminSignIn());
  if (adminInfo?.skipped) console.log(`    (skipping staff steps: ${adminInfo.skipped})`);
  const admin = adminInfo?.admin;
  if (admin) {
    for (const [p, label] of [[arjunP, 'Arjun'], [sunitaP, 'Sunita']]) {
      if (!p) continue;
      await step(`Verify and approve ${label}`, async () => {
        for (const checkType of ['identity', 'address', 'background']) await admin.post(`/admin/providers/${p.id}/verification`, { checkType, status: 'passed', performedByPartner: 'Demo verification partner', expiresAt: at(365) });
        await admin.post(`/admin/providers/${p.id}/decision`, { decision: 'approve', reason: 'Documents checked' });
      });
    }
  }
}

const arjunActive = arjunP ? await kamla.get(`/services/providers/${arjunP.id}`).then(() => true).catch(() => false) : false;
if (arjunActive) {
  await step('Kamla books Arjun → done → 5★ review → Arjun replies', async () => {
    const svc = (await kamla.get(`/services/providers/${arjunP.id}`)).services?.[0];
    const r = await kamla.post('/service-requests', { categoryId: cat('electrical').id, providerId: arjunP.id, providerServiceId: svc?.id, title: 'Ceiling fan making noise', description: 'Bedroom fan wobbles and makes a grinding sound.', localityId: locality?.id, locationNote: 'Flat 2A, Block C', preferredStart: at(-6, 10), preferredEnd: at(-6, 13) });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'accepted' });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'scheduled', scheduledAt: at(-5, 11) });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'in_progress' });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'completed', note: 'Replaced the bearing and balanced the blades.' });
    const rev = await kamla.post(`/service-requests/${r.id}/review`, { rating: 5, body: 'Very polite and quick. Explained everything. Fair price.' });
    if (rev?.id) await arjun.post(`/provider-portal/providers/${arjunP.id}/reviews/${rev.id}/response`, { response: 'Thank you aunty! Call me any time.' });
  });
  await step('Meena books Arjun → done → 4★ review', async () => {
    const r = await meena.post('/service-requests', { categoryId: cat('electrical').id, providerId: arjunP.id, title: 'Inverter not charging', localityId: locality?.id });
    for (const status of ['accepted', 'in_progress', 'completed']) await arjun.post(`/service-requests/${r.id}/status`, { status });
    await meena.post(`/service-requests/${r.id}/review`, { rating: 4, body: 'Fixed it, came a bit late.' });
  });
  await step('Priya: AC service request scheduled with Arjun (linked to her AC)', async () => {
    const r = await priya.post('/service-requests', { categoryId: cat('appliance-repair').id, providerId: arjunP.id, title: 'AC service before summer', description: 'Gas check and filter cleaning.', localityId: locality?.id, locationNote: 'House 14, Block D', inventoryItemId: globalThis.inventory?.ac?.id });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'accepted' });
    await arjun.post(`/service-requests/${r.id}/status`, { status: 'scheduled', scheduledAt: at(2, 16) });
  });
  await step('Rahul: open request (no provider) for Arjun to claim in his portal', () =>
    rahul.post('/service-requests', { categoryId: cat('electrical').id, title: 'Two switchboards sparking', description: 'Living room and kitchen boards.', localityId: locality?.id, preferredStart: at(1, 10), preferredEnd: at(1, 18) }));
  await step('Kamla: request to Sunita waiting for a reply', async () => {
    if (!sunitaP) return;
    await kamla.post('/service-requests', { categoryId: cat('senior-companionship').id, providerId: sunitaP.id, title: 'Companion for Tuesday afternoons', description: 'Someone to walk with me and help with the market.', localityId: locality?.id });
  });
} else {
  console.log('  • Providers are waiting for staff approval, so service bookings were skipped.');
  console.log('    Approve them in the staff console (Providers), then run: npm run demo-data -- --force');
}

// ────────────────────────────────────────────────────────────────────────────
section('Assistant, knowledge and privacy');
await step('Assistant conversations with feedback', async () => {
  const a = await kamla.post('/assistant/ask', { question: 'How do I complain about a defective product bought online?' });
  const msgId = a?.message?.id ?? a?.answer?.id ?? a?.messageId;
  if (msgId) await kamla.post('/assistant/feedback', { messageId: msgId, rating: 'up' }).catch(() => {});
  await kamla.post('/assistant/ask', { question: 'Follow-up: how long does the seller have to reply?', conversationId: a?.conversation?.id ?? a?.conversationId }).catch(() => {});
  await priya.post('/assistant/ask', { question: 'How can I keep my parents safe from phone scams?' });
});
await step('Privacy: Priya asks for a copy of her data; Rahul raises a grievance', async () => {
  await priya.post('/privacy/requests', { type: 'export', details: 'Please include my community posts.' }).catch(ignoreConflict);
  await rahul.post('/privacy/requests', { type: 'grievance', details: 'I received a notification about a group I already left.' }).catch(ignoreConflict);
  await kamla.post('/privacy/consents', { purpose: 'ai_assistance', policyVersion: '2026-10' }).catch(() => {});
});

// ────────────────────────────────────────────────────────────────────────────
console.log(`\nDone${failures ? ` with ${failures} step(s) skipped` : ''}. Open the web app and sign in with any of these numbers:`);
console.log('  9810000001 Kamla (senior mode, Hindi)   9810000002 Priya   9810000003 Rahul');
console.log('  9810000004 Meena                        9810000005 Arjun (provider)   9810000006 Sunita (provider)');
if (adminInfo?.newSecret) {
  console.log('\nStaff console: an authenticator was set up for the admin (9999900001).');
  console.log(`  Add this key in Google Authenticator / Microsoft Authenticator ("Enter a setup key"):  ${adminInfo.newSecret}`);
  if (adminInfo.recoveryCodes?.length) console.log(`  Recovery codes (each works once): ${adminInfo.recoveryCodes.join('  ')}`);
  console.log('  Then sign in with 9999900001, enter the code from the app, and open Staff console.');
}
