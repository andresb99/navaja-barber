/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SEED_PREFIX = '[SEED_REAL_METRICS_2M]';
const STAFF_TARGET = [
  { name: 'Francisco', phoneSeed: '200101' },
  { name: 'Lucas', phoneSeed: '200102' },
  { name: 'Facundo', phoneSeed: '200103' },
];
const SERVICE_TARGET = [
  { name: 'Corte Clasico', price_cents: 3000, duration_minutes: 30 },
  { name: 'Skin Fade', price_cents: 4300, duration_minutes: 45 },
  { name: 'Barba y Perfilado', price_cents: 2600, duration_minutes: 25 },
];
const SLOT_HOURS = [9, 11, 14, 16];
const DAY_WINDOW = 60;
const CUSTOMER_SEED_TOTAL = 48;

function parseEnvValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const current = line.trim();
    if (!current || current.startsWith('#')) {
      continue;
    }

    const idx = current.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = current.slice(0, idx).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = parseEnvValue(current.slice(idx + 1));
  }
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dayOfYearUtc(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000) + 1;
}

function getStatusForPattern(dayDate, slotNumber, pattern, todayDateOnly) {
  if (dayDate === todayDateOnly && slotNumber === 4) {
    return 'pending';
  }
  if (dayDate === todayDateOnly && slotNumber === 3) {
    return 'confirmed';
  }
  if (pattern % 12 === 0) {
    return 'cancelled';
  }
  if (pattern % 17 === 0) {
    return 'no_show';
  }
  return 'done';
}

function getChannelForPattern(pattern) {
  const mod = pattern % 6;
  if (mod === 0) {
    return 'WEB';
  }
  if (mod === 1) {
    return 'WALK_IN';
  }
  if (mod === 2) {
    return 'ADMIN_CREATED';
  }
  if (mod === 3) {
    return 'PHONE';
  }
  if (mod === 4) {
    return 'WHATSAPP';
  }
  return 'INSTAGRAM';
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildReviewComment(rating) {
  if (rating >= 5) {
    return 'Excelente servicio, muy recomendable.';
  }
  if (rating === 4) {
    return 'Muy buena atencion y resultado.';
  }
  if (rating === 3) {
    return 'Buen servicio en general.';
  }
  return 'Servicio correcto, podria mejorar.';
}

function computeRating(staffName, startAtIso) {
  const date = new Date(startAtIso);
  const doy = dayOfYearUtc(date);
  const hour = date.getUTCHours();
  const pivot = (doy + hour) % 3;
  if (normalizeName(staffName) === 'francisco') {
    return 4 + (pivot === 2 ? 1 : 0);
  }
  if (normalizeName(staffName) === 'lucas') {
    return 3 + (pivot >= 1 ? 1 : 0);
  }
  return Math.max(2, 3 - (pivot === 0 ? 1 : 0) + (pivot === 2 ? 1 : 0));
}

async function ensureStaff(supabase, shopId) {
  const { data: allStaff, error: staffError } = await supabase
    .from('staff')
    .select('id, name, is_active, created_at')
    .eq('shop_id', shopId);

  if (staffError) {
    throw new Error(`Staff query failed for shop ${shopId}: ${staffError.message}`);
  }

  const existingByName = new Map();
  for (const row of allStaff || []) {
    const key = normalizeName(row.name);
    if (!key || existingByName.has(key)) {
      continue;
    }
    existingByName.set(key, row);
  }

  const toInsert = [];
  const toActivate = [];
  const suffix = String(shopId).replace(/-/g, '').slice(-4);

  for (const target of STAFF_TARGET) {
    const existing = existingByName.get(normalizeName(target.name));
    if (!existing) {
      toInsert.push({
        shop_id: shopId,
        name: target.name,
        role: 'staff',
        phone: `+598-91-${target.phoneSeed}-${suffix}`,
        is_active: true,
      });
      continue;
    }

    if (!existing.is_active) {
      toActivate.push(existing.id);
    }
  }

  if (toInsert.length) {
    const { error: insertError } = await supabase.from('staff').insert(toInsert);
    if (insertError) {
      throw new Error(`Staff insert failed for shop ${shopId}: ${insertError.message}`);
    }
  }

  for (const staffId of toActivate) {
    const { error: updateError } = await supabase
      .from('staff')
      .update({ is_active: true })
      .eq('id', staffId)
      .eq('shop_id', shopId);
    if (updateError) {
      throw new Error(`Staff activation failed for shop ${shopId}: ${updateError.message}`);
    }
  }

  const { data: seededStaff, error: seededError } = await supabase
    .from('staff')
    .select('id, name, is_active, created_at')
    .eq('shop_id', shopId)
    .in(
      'name',
      STAFF_TARGET.map((item) => item.name),
    )
    .order('created_at', { ascending: true });

  if (seededError) {
    throw new Error(`Seeded staff reload failed for shop ${shopId}: ${seededError.message}`);
  }

  const byName = new Map();
  for (const row of seededStaff || []) {
    const key = normalizeName(row.name);
    if (byName.has(key)) {
      continue;
    }
    byName.set(key, row);
  }

  const ordered = STAFF_TARGET.map((target) => byName.get(normalizeName(target.name))).filter(Boolean);
  if (ordered.length < STAFF_TARGET.length) {
    throw new Error(`Could not resolve seeded staff in shop ${shopId}`);
  }

  return ordered;
}

async function ensureWorkingHours(supabase, shopId, staffRows) {
  const staffIds = staffRows.map((row) => row.id);
  const { data: existingHours, error: hoursError } = await supabase
    .from('working_hours')
    .select('staff_id, day_of_week, start_time, end_time')
    .eq('shop_id', shopId)
    .in('staff_id', staffIds);

  if (hoursError) {
    throw new Error(`Working hours query failed for shop ${shopId}: ${hoursError.message}`);
  }

  const existingKeys = new Set(
    (existingHours || []).map(
      (row) => `${row.staff_id}|${row.day_of_week}|${String(row.start_time)}|${String(row.end_time)}`,
    ),
  );
  const rows = [];

  for (const staff of staffRows) {
    for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
      const key = `${staff.id}|${dayOfWeek}|09:00:00|18:00:00`;
      if (existingKeys.has(key)) {
        continue;
      }

      rows.push({
        shop_id: shopId,
        staff_id: staff.id,
        day_of_week: dayOfWeek,
        start_time: '09:00:00',
        end_time: '18:00:00',
      });
    }
  }

  if (!rows.length) {
    return;
  }

  const { error: insertError } = await supabase.from('working_hours').insert(rows);
  if (insertError) {
    throw new Error(`Working hours insert failed for shop ${shopId}: ${insertError.message}`);
  }
}

async function ensureServices(supabase, shopId) {
  const { data: currentServices, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, is_active, created_at')
    .eq('shop_id', shopId);

  if (servicesError) {
    throw new Error(`Services query failed for shop ${shopId}: ${servicesError.message}`);
  }

  const activeByName = new Set(
    (currentServices || [])
      .filter((row) => row.is_active)
      .map((row) => normalizeName(row.name))
      .filter(Boolean),
  );

  const missing = SERVICE_TARGET.filter((service) => !activeByName.has(normalizeName(service.name))).map(
    (service) => ({
      shop_id: shopId,
      name: service.name,
      price_cents: service.price_cents,
      duration_minutes: service.duration_minutes,
      is_active: true,
    }),
  );

  if (missing.length) {
    const { error: insertError } = await supabase.from('services').insert(missing);
    if (insertError) {
      throw new Error(`Service insert failed for shop ${shopId}: ${insertError.message}`);
    }
  }

  const { data: activeServices, error: activeError } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, created_at')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (activeError) {
    throw new Error(`Active services reload failed for shop ${shopId}: ${activeError.message}`);
  }

  if (!activeServices?.length) {
    throw new Error(`Shop ${shopId} has no active services`);
  }

  return activeServices;
}

async function ensureCustomers(supabase, shopId) {
  const compactShopId = String(shopId).replace(/-/g, '');
  const emailPattern = `seed.metrics.${compactShopId}.%@example.local`;
  const { data: existing, error: existingError } = await supabase
    .from('customers')
    .select('id, email, created_at')
    .eq('shop_id', shopId)
    .ilike('email', emailPattern)
    .order('created_at', { ascending: true });

  if (existingError) {
    throw new Error(`Customer query failed for shop ${shopId}: ${existingError.message}`);
  }

  const existingEmails = new Set((existing || []).map((row) => String(row.email || '').toLowerCase()));
  const suffix = compactShopId.slice(-4);
  const toInsert = [];

  for (let idx = 1; idx <= CUSTOMER_SEED_TOTAL; idx += 1) {
    const email = `seed.metrics.${compactShopId}.${idx}@example.local`;
    if (existingEmails.has(email.toLowerCase())) {
      continue;
    }
    toInsert.push({
      shop_id: shopId,
      name: `Cliente Seed ${String(idx).padStart(2, '0')}`,
      phone: `+598-80-${suffix}-${String(idx).padStart(3, '0')}`,
      email,
    });
  }

  if (toInsert.length) {
    const chunks = chunkArray(toInsert, 250);
    for (const chunk of chunks) {
      const { error: insertError } = await supabase.from('customers').insert(chunk);
      if (insertError) {
        throw new Error(`Customer insert failed for shop ${shopId}: ${insertError.message}`);
      }
    }
  }

  const { data: seededCustomers, error: reloadError } = await supabase
    .from('customers')
    .select('id, created_at, email')
    .eq('shop_id', shopId)
    .ilike('email', emailPattern)
    .order('created_at', { ascending: true });

  if (reloadError) {
    throw new Error(`Customer reload failed for shop ${shopId}: ${reloadError.message}`);
  }

  if (!seededCustomers?.length) {
    throw new Error(`Shop ${shopId} has no seed customers`);
  }

  return seededCustomers;
}

async function removePreviousSeed(supabase, shopId) {
  const { data: existingAppointments, error: lookupError } = await supabase
    .from('appointments')
    .select('id')
    .eq('shop_id', shopId)
    .ilike('notes', `${SEED_PREFIX}%`)
    .limit(5000);

  if (lookupError) {
    throw new Error(`Seed lookup failed for shop ${shopId}: ${lookupError.message}`);
  }

  const ids = (existingAppointments || []).map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return 0;
  }

  const chunks = chunkArray(ids, 300);
  for (const chunk of chunks) {
    const { error: deleteError } = await supabase.from('appointments').delete().in('id', chunk);
    if (deleteError) {
      throw new Error(`Seed cleanup failed for shop ${shopId}: ${deleteError.message}`);
    }
  }

  return ids.length;
}

async function insertAppointmentsForShop(supabase, shop) {
  const seededStaff = await ensureStaff(supabase, shop.id);
  await ensureWorkingHours(supabase, shop.id, seededStaff);
  const activeServices = await ensureServices(supabase, shop.id);
  const seededCustomers = await ensureCustomers(supabase, shop.id);
  const deletedSeedRows = await removePreviousSeed(supabase, shop.id);

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayDateOnly = toIsoDate(today);
  const staffByOrder = seededStaff.map((row, index) => ({
    id: row.id,
    name: row.name,
    order: index + 1,
  }));

  const rows = [];
  for (let back = DAY_WINDOW - 1; back >= 0; back -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - back);
    const dayDate = toIsoDate(day);
    const dayOfYear = dayOfYearUtc(day);

    for (const slotNumber of [1, 2, 3, 4]) {
      const hour = SLOT_HOURS[slotNumber - 1] ?? 9;
      for (const staff of staffByOrder) {
        const pattern = dayOfYear + staff.order * 11 + slotNumber * 7;
        const status = getStatusForPattern(dayDate, slotNumber, pattern, todayDateOnly);
        const sourceChannel = getChannelForPattern(pattern);
        const service = activeServices[pattern % activeServices.length];
        const customer = seededCustomers[pattern % seededCustomers.length];
        const startAt = new Date(
          Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0, 0, 0),
        );
        const endAt = new Date(startAt.getTime() + Number(service.duration_minutes || 30) * 60000);
        const basePrice = Number(service.price_cents || 0);
        const priceCents = Math.max(0, basePrice + (staff.order - 2) * 200 + (slotNumber - 2) * 60);
        const done = status === 'done';
        const cancelled = status === 'cancelled';

        rows.push({
          shop_id: shop.id,
          staff_id: staff.id,
          customer_id: customer.id,
          service_id: service.id,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status,
          price_cents: priceCents,
          source_channel: sourceChannel,
          notes: `${SEED_PREFIX} ${dayDate} slot-${slotNumber}`,
          completed_at: done ? endAt.toISOString() : null,
          cancelled_at: cancelled ? new Date(startAt.getTime() - 30 * 60000).toISOString() : null,
          cancelled_by: cancelled ? (pattern % 2 === 0 ? 'staff' : 'customer') : null,
          cancellation_reason: cancelled ? 'Cancelacion generada para dataset de metricas' : null,
          review_request_sent_at: done ? new Date(endAt.getTime() + 20 * 60000).toISOString() : null,
        });
      }
    }
  }

  const insertChunks = chunkArray(rows, 400);
  for (const chunk of insertChunks) {
    const { error: insertError } = await supabase.from('appointments').insert(chunk);
    if (insertError) {
      throw new Error(`Appointment insert failed for shop ${shop.id}: ${insertError.message}`);
    }
  }

  const { data: seededAppointments, error: seededError } = await supabase
    .from('appointments')
    .select('id, staff_id, customer_id, start_at, end_at, completed_at, status')
    .eq('shop_id', shop.id)
    .eq('status', 'done')
    .ilike('notes', `${SEED_PREFIX}%`)
    .limit(10000);

  if (seededError) {
    throw new Error(`Seeded appointments query failed for shop ${shop.id}: ${seededError.message}`);
  }

  const staffNameById = new Map(staffByOrder.map((item) => [item.id, item.name]));
  const reviews = [];
  for (const appointment of seededAppointments || []) {
    const startAtIso = String(appointment.start_at || '');
    const startedAt = new Date(startAtIso);
    if (Number.isNaN(startedAt.getTime())) {
      continue;
    }

    const includeReview = (dayOfYearUtc(startedAt) + startedAt.getUTCHours()) % 4 !== 0;
    if (!includeReview) {
      continue;
    }

    const staffName = staffNameById.get(appointment.staff_id) || '';
    const rating = computeRating(staffName, startAtIso);
    const submittedAt = new Date(
      new Date(String(appointment.completed_at || appointment.end_at || appointment.start_at)).getTime() +
        6 * 60 * 60000,
    ).toISOString();

    reviews.push({
      shop_id: shop.id,
      appointment_id: appointment.id,
      staff_id: appointment.staff_id,
      customer_id: appointment.customer_id,
      rating,
      comment: buildReviewComment(rating),
      status: 'published',
      is_verified: true,
      submitted_at: submittedAt,
      published_at: submittedAt,
    });
  }

  const reviewChunks = chunkArray(reviews, 400);
  for (const chunk of reviewChunks) {
    const { error: reviewInsertError } = await supabase.from('appointment_reviews').insert(chunk);
    if (reviewInsertError) {
      throw new Error(`Review insert failed for shop ${shop.id}: ${reviewInsertError.message}`);
    }
  }

  return {
    shopId: shop.id,
    timezone: shop.timezone,
    deletedSeedRows,
    staffCount: seededStaff.length,
    appointmentsInserted: rows.length,
    reviewsInserted: reviews.length,
  };
}

async function main() {
  loadDotEnv(path.resolve(process.cwd(), '.env.local'));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: activeShops, error: shopError } = await supabase
    .from('shops')
    .select('id, timezone, status')
    .eq('status', 'active');

  if (shopError) {
    throw new Error(`Active shops query failed: ${shopError.message}`);
  }

  if (!activeShops?.length) {
    console.log('No active shops found.');
    return;
  }

  const report = [];
  for (const shop of activeShops) {
    const result = await insertAppointmentsForShop(supabase, shop);
    report.push(result);
    console.log(
      `seeded shop=${result.shopId} staff=${result.staffCount} appointments=${result.appointmentsInserted} reviews=${result.reviewsInserted} cleaned=${result.deletedSeedRows}`,
    );
  }

  const totals = report.reduce(
    (acc, item) => {
      acc.shops += 1;
      acc.staff += item.staffCount;
      acc.appointments += item.appointmentsInserted;
      acc.reviews += item.reviewsInserted;
      acc.cleaned += item.deletedSeedRows;
      return acc;
    },
    { shops: 0, staff: 0, appointments: 0, reviews: 0, cleaned: 0 },
  );

  console.log(
    `done shops=${totals.shops} staff=${totals.staff} appointments=${totals.appointments} reviews=${totals.reviews} cleaned=${totals.cleaned}`,
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
