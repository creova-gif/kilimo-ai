jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  ageInMonths,
  emptyAnimalInput,
  emptyEventInput,
  filterAnimals,
  herdSummary,
  mapAnimalRow,
  upcomingVaccinations,
  validateAnimalInput,
  validateEventInput,
  type Animal,
  type AnimalEvent,
} from '../lib/livestock';

const NOW = new Date(2026, 8, 21, 12);

const animal = (p: Partial<Animal> = {}): Animal =>
  ({
    id: 'a1',
    species: 'cattle',
    tagOrName: 'Neema',
    sex: 'female',
    birthDate: null,
    breed: null,
    status: 'active',
    weightKg: null,
    notes: null,
    createdAt: 't',
    updatedAt: 't',
    ...p,
  }) as Animal;

const vacc = (p: Partial<AnimalEvent>): AnimalEvent =>
  ({
    id: 'e1',
    animalId: 'a1',
    kind: 'vaccination',
    eventDate: '2026-08-01',
    detail: null,
    nextDueDate: null,
    createdAt: 't1',
    ...p,
  }) as AnimalEvent;

describe('herd summary', () => {
  it('counts only active animals per species', () => {
    const s = herdSummary([
      animal(),
      animal({ id: 'a2', species: 'goat' }),
      animal({ id: 'a3', species: 'goat', status: 'sold' }),
    ]);
    expect(s.total).toBe(3);
    expect(s.active).toBe(2);
    expect(s.bySpecies.goat).toBe(1);
    expect(s.byStatus.sold).toBe(1);
  });

  it('filters by status and species', () => {
    const list = [animal(), animal({ id: 'a2', species: 'goat', status: 'sold' })];
    expect(filterAnimals(list, { status: 'active', species: 'all' }).map((a) => a.id)).toEqual([
      'a1',
    ]);
    expect(filterAnimals(list, { status: 'all', species: 'goat' }).map((a) => a.id)).toEqual([
      'a2',
    ]);
  });
});

describe('vaccination reminders', () => {
  it('reports overdue and upcoming follow-ups, most urgent first', () => {
    const animals = [animal(), animal({ id: 'a2', tagOrName: 'Juma' })];
    const events = [
      vacc({ id: 'e1', animalId: 'a1', nextDueDate: '2026-09-25' }),
      vacc({ id: 'e2', animalId: 'a2', nextDueDate: '2026-09-18' }),
    ];
    const r = upcomingVaccinations(animals, events, NOW);
    expect(r.map((v) => [v.animal.id, v.daysUntil, v.overdue])).toEqual([
      ['a2', -3, true],
      ['a1', 4, false],
    ]);
  });

  it('a newer vaccination supersedes an older overdue follow-up', () => {
    const events = [
      vacc({ id: 'old', eventDate: '2026-06-01', nextDueDate: '2026-09-01' }),
      vacc({ id: 'new', eventDate: '2026-09-10', nextDueDate: null }),
    ];
    expect(upcomingVaccinations([animal()], events, NOW)).toEqual([]);
  });

  it('ignores animals that are no longer in the herd and follow-ups beyond the window', () => {
    expect(
      upcomingVaccinations([animal({ status: 'sold' })], [vacc({ nextDueDate: '2026-09-20' })], NOW)
    ).toEqual([]);
    expect(upcomingVaccinations([animal()], [vacc({ nextDueDate: '2026-12-01' })], NOW)).toEqual(
      []
    );
  });
});

describe('validation and mapping', () => {
  it('requires a tag or name and rejects a future birth date', () => {
    const e = validateAnimalInput({ ...emptyAnimalInput(), birthDate: '2027-01-01' }, NOW);
    expect(e.tagOrName).toBe('required');
    expect(e.birthDate).toBe('future');
  });

  it('rejects an event dated in the future', () => {
    const e = validateEventInput({ ...emptyEventInput(NOW), eventDate: '2026-09-30' }, NOW);
    expect(e.eventDate).toBe('future');
  });

  it('computes age in whole months, null when unknown', () => {
    expect(ageInMonths('2024-09-21', NOW)).toBe(24);
    expect(ageInMonths('2024-09-22', NOW)).toBe(23);
    expect(ageInMonths(null, NOW)).toBeNull();
    expect(ageInMonths('2027-01-01', NOW)).toBeNull();
  });

  it('maps numeric weight strings from PostgREST', () => {
    const a = mapAnimalRow({
      id: 'a1',
      species: 'goat',
      tag_or_name: 'G-12',
      sex: null,
      birth_date: null,
      breed: null,
      status: 'active',
      weight_kg: '31.5',
      notes: null,
      created_at: 't',
      updated_at: 't',
    });
    expect(a).toMatchObject({ tagOrName: 'G-12', weightKg: 31.5 });
  });
});
