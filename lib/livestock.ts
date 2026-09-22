/**
 * Livestock data layer (KIL-004): animals + their health/breeding/weight history.
 *
 * Backed by `public.livestock` and `public.livestock_events` (migration 20260921120000; owner-only
 * RLS, user_id defaults to auth.uid()). Nothing here invents data — an empty table is an empty
 * herd. The Supabase client is injected so the layer is testable.
 */
import {
  classifyDbError,
  daysBetween,
  errorMessage,
  fail,
  isIsoDate,
  parseDecimal,
  todayIso,
  trimOrNull,
  type Fail,
} from './recordsCommon';

export const SPECIES = ['cattle', 'goat', 'sheep', 'pig', 'poultry', 'other'] as const;
export type Species = (typeof SPECIES)[number];

export const SEXES = ['female', 'male'] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_STATUSES = ['active', 'sold', 'deceased', 'slaughtered'] as const;
export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

export const EVENT_KINDS = ['vaccination', 'treatment', 'breeding', 'weighing', 'note'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** A vaccination due within this many days (or overdue) is surfaced as an alert. */
export const VACCINATION_WINDOW_DAYS = 14;

export interface Animal {
  id: string;
  species: Species;
  tagOrName: string;
  sex: Sex | null;
  birthDate: string | null;
  breed: string | null;
  status: AnimalStatus;
  weightKg: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalEvent {
  id: string;
  animalId: string;
  kind: EventKind;
  eventDate: string;
  detail: string | null;
  nextDueDate: string | null;
  weightKg: number | null;
  createdAt: string;
}

export function mapAnimalRow(row: any): Animal {
  return {
    id: row.id,
    species: row.species,
    tagOrName: row.tag_or_name,
    sex: row.sex ?? null,
    birthDate: row.birth_date ?? null,
    breed: row.breed ?? null,
    status: row.status ?? 'active',
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Number(row.weight_kg),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventRow(row: any): AnimalEvent {
  return {
    id: row.id,
    animalId: row.animal_id,
    kind: row.kind,
    eventDate: row.event_date,
    detail: row.detail ?? null,
    nextDueDate: row.next_due_date ?? null,
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Number(row.weight_kg),
    createdAt: row.created_at,
  };
}

/* ── validation ──────────────────────────────────────────────────────────────────────────────── */
/** Raw form values (strings), exactly as the user typed them. */
export interface AnimalInput {
  species: Species;
  tagOrName: string;
  sex: Sex | null;
  birthDate: string;
  breed: string;
  status: AnimalStatus;
  weightKg: string;
  notes: string;
}

export const emptyAnimalInput = (): AnimalInput => ({
  species: 'cattle',
  tagOrName: '',
  sex: null,
  birthDate: '',
  breed: '',
  status: 'active',
  weightKg: '',
  notes: '',
});

export function animalToInput(a: Animal): AnimalInput {
  return {
    species: a.species,
    tagOrName: a.tagOrName,
    sex: a.sex,
    birthDate: a.birthDate ?? '',
    breed: a.breed ?? '',
    status: a.status,
    weightKg: a.weightKg === null ? '' : String(a.weightKg),
    notes: a.notes ?? '',
  };
}

export interface AnimalErrors {
  tagOrName?: 'required';
  birthDate?: 'invalid' | 'future';
  weightKg?: 'invalid';
}

export function validateAnimalInput(i: AnimalInput, now: Date = new Date()): AnimalErrors {
  const errors: AnimalErrors = {};
  if (!i.tagOrName.trim()) errors.tagOrName = 'required';
  if (i.birthDate.trim()) {
    if (!isIsoDate(i.birthDate.trim())) errors.birthDate = 'invalid';
    else if (i.birthDate.trim() > todayIso(now)) errors.birthDate = 'future';
  }
  if (i.weightKg.trim()) {
    const w = parseDecimal(i.weightKg);
    if (w === null || w <= 0) errors.weightKg = 'invalid';
  }
  return errors;
}

export const hasErrors = (e: object) => Object.values(e).some(Boolean);

function animalRow(i: AnimalInput) {
  return {
    species: i.species,
    tag_or_name: i.tagOrName.trim(),
    sex: i.sex,
    birth_date: trimOrNull(i.birthDate),
    breed: trimOrNull(i.breed),
    status: i.status,
    weight_kg: i.weightKg.trim() ? parseDecimal(i.weightKg) : null,
    notes: trimOrNull(i.notes),
  };
}

export interface EventInput {
  kind: EventKind;
  eventDate: string;
  detail: string;
  nextDueDate: string;
  weightKg: string;
}

export const emptyEventInput = (now: Date = new Date()): EventInput => ({
  kind: 'vaccination',
  eventDate: todayIso(now),
  detail: '',
  nextDueDate: '',
  weightKg: '',
});

export interface EventErrors {
  eventDate?: 'invalid' | 'future';
  nextDueDate?: 'invalid' | 'beforeEvent';
  weightKg?: 'invalid';
  detail?: 'required';
}

export function validateEventInput(i: EventInput, now: Date = new Date()): EventErrors {
  const errors: EventErrors = {};
  const date = i.eventDate.trim();
  if (!isIsoDate(date)) errors.eventDate = 'invalid';
  else if (date > todayIso(now)) errors.eventDate = 'future';

  if (i.kind === 'vaccination' && i.nextDueDate.trim()) {
    const next = i.nextDueDate.trim();
    if (!isIsoDate(next)) errors.nextDueDate = 'invalid';
    else if (isIsoDate(date) && next < date) errors.nextDueDate = 'beforeEvent';
  }
  if (i.kind === 'weighing') {
    const w = parseDecimal(i.weightKg);
    if (w === null || w <= 0) errors.weightKg = 'invalid';
  }
  // A treatment or a note with no text records nothing.
  if ((i.kind === 'treatment' || i.kind === 'note') && !i.detail.trim()) errors.detail = 'required';
  return errors;
}

function eventRow(animalId: string, i: EventInput) {
  return {
    animal_id: animalId,
    kind: i.kind,
    event_date: i.eventDate.trim(),
    detail: trimOrNull(i.detail),
    next_due_date: i.kind === 'vaccination' ? trimOrNull(i.nextDueDate) : null,
    weight_kg: i.kind === 'weighing' ? parseDecimal(i.weightKg) : null,
  };
}

/* ── queries / mutations ─────────────────────────────────────────────────────────────────────── */
type Client = any | null | undefined;

export async function fetchAnimals(
  client: Client
): Promise<{ ok: true; animals: Animal[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('livestock')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, animals: (data ?? []).map(mapAnimalRow) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

/** Every vaccination event (used to work out which animals have a vaccination coming up). */
export async function fetchVaccinationEvents(
  client: Client
): Promise<{ ok: true; events: AnimalEvent[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('livestock_events')
      .select('*')
      .eq('kind', 'vaccination')
      .order('event_date', { ascending: false })
      .limit(1000);
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, events: (data ?? []).map(mapEventRow) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function fetchAnimalEvents(
  client: Client,
  animalId: string
): Promise<{ ok: true; events: AnimalEvent[] } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { data, error } = await client
      .from('livestock_events')
      .select('*')
      .eq('animal_id', animalId)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, events: (data ?? []).map(mapEventRow) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function createAnimal(
  client: Client,
  input: AnimalInput,
  now: Date = new Date()
): Promise<{ ok: true; animal: Animal } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateAnimalInput(input, now))) return fail('invalid');
  try {
    const { data, error } = await client.from('livestock').insert(animalRow(input)).select('*').single();
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, animal: mapAnimalRow(data) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function updateAnimal(
  client: Client,
  id: string,
  input: AnimalInput,
  now: Date = new Date()
): Promise<{ ok: true; animal: Animal } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateAnimalInput(input, now))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('livestock')
      .update(animalRow(input))
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, animal: mapAnimalRow(data) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function deleteAnimal(client: Client, id: string): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('livestock').delete().eq('id', id);
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function addAnimalEvent(
  client: Client,
  animalId: string,
  input: EventInput,
  now: Date = new Date()
): Promise<{ ok: true; event: AnimalEvent } | Fail> {
  if (!client) return fail('not_configured');
  if (hasErrors(validateEventInput(input, now))) return fail('invalid');
  try {
    const { data, error } = await client
      .from('livestock_events')
      .insert(eventRow(animalId, input))
      .select('*')
      .single();
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true, event: mapEventRow(data) };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

export async function deleteAnimalEvent(client: Client, id: string): Promise<{ ok: true } | Fail> {
  if (!client) return fail('not_configured');
  try {
    const { error } = await client.from('livestock_events').delete().eq('id', id);
    if (error) return fail(classifyDbError(error), error.message);
    return { ok: true };
  } catch (e) {
    return fail('error', errorMessage(e));
  }
}

/* ── pure helpers ────────────────────────────────────────────────────────────────────────────── */
export interface HerdSummary {
  total: number;
  active: number;
  /** Active animals per species (sold / deceased / slaughtered animals are not part of the herd). */
  bySpecies: Record<Species, number>;
  byStatus: Record<AnimalStatus, number>;
}

export function herdSummary(animals: Animal[]): HerdSummary {
  const bySpecies = Object.fromEntries(SPECIES.map((s) => [s, 0])) as Record<Species, number>;
  const byStatus = Object.fromEntries(ANIMAL_STATUSES.map((s) => [s, 0])) as Record<AnimalStatus, number>;
  for (const a of animals) {
    byStatus[a.status] += 1;
    if (a.status === 'active') bySpecies[a.species] += 1;
  }
  return { total: animals.length, active: byStatus.active, bySpecies, byStatus };
}

export interface UpcomingVaccination {
  animal: Animal;
  /** The follow-up date recorded on the animal's most recent vaccination. */
  dueDate: string;
  /** Negative = overdue. */
  daysUntil: number;
  overdue: boolean;
}

/**
 * Active animals whose latest vaccination has a follow-up date that is overdue or falls within
 * `windowDays`. Only the most recent vaccination per animal counts: recording a newer vaccination
 * (with or without a new follow-up date) supersedes an older overdue one, so a completed
 * follow-up stops nagging. Sorted most urgent first.
 */
export function upcomingVaccinations(
  animals: Animal[],
  events: AnimalEvent[],
  now: Date = new Date(),
  windowDays: number = VACCINATION_WINDOW_DAYS
): UpcomingVaccination[] {
  const latest = new Map<string, AnimalEvent>();
  for (const e of events) {
    if (e.kind !== 'vaccination') continue;
    const cur = latest.get(e.animalId);
    if (
      !cur ||
      e.eventDate > cur.eventDate ||
      (e.eventDate === cur.eventDate && e.createdAt > cur.createdAt)
    ) {
      latest.set(e.animalId, e);
    }
  }

  const today = todayIso(now);
  const out: UpcomingVaccination[] = [];
  for (const animal of animals) {
    if (animal.status !== 'active') continue;
    const ev = latest.get(animal.id);
    if (!ev?.nextDueDate) continue;
    const daysUntil = daysBetween(today, ev.nextDueDate);
    if (daysUntil > windowDays) continue;
    out.push({ animal, dueDate: ev.nextDueDate, daysUntil, overdue: daysUntil < 0 });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function filterAnimals(
  animals: Animal[],
  filter: { status: AnimalStatus | 'all'; species: Species | 'all' }
): Animal[] {
  return animals.filter(
    (a) =>
      (filter.status === 'all' || a.status === filter.status) &&
      (filter.species === 'all' || a.species === filter.species)
  );
}

/** Whole months between a birth date and today; null if unknown or not a date. */
export function ageInMonths(birthDate: string | null, now: Date = new Date()): number | null {
  if (!isIsoDate(birthDate)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  let months = (now.getFullYear() - by) * 12 + (now.getMonth() + 1 - bm);
  if (now.getDate() < bd) months -= 1;
  return months < 0 ? null : months;
}

/** Newest first; ties broken by when the record was created. */
export function sortEvents(events: AnimalEvent[]): AnimalEvent[] {
  return [...events].sort((a, b) =>
    a.eventDate === b.eventDate
      ? b.createdAt.localeCompare(a.createdAt)
      : b.eventDate.localeCompare(a.eventDate)
  );
}
