/**
 * Kilimo AI — Digital Farm Twin Store
 *
 * Persists up to 6 named "what-if" scenarios the FARMER creates. Each stores its inputs and the
 * deterministic model output (an estimate from those inputs only) so comparisons survive restarts.
 *
 * Starts empty: nothing is seeded, and `reset()` clears back to empty. Older builds shipped two
 * demo scenarios (ids `s1`, `s2`); they are dropped from persisted state on rehydrate.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TwinInputs, TwinOutput, runTwinModel, Crop, SoilType } from '../lib/farmtwin/model';
import { dropSeedScenarios } from '../lib/farmTwinPlots';

/** The real plot a scenario was started from (its crop/area prefilled the inputs). */
export interface ScenarioSource {
  plotId: string;
  plotName: string;
  /** False when the plot's crop is not one the model covers (the default crop was used). */
  cropMatched?: boolean;
  /** True when the plot had no recorded area (the default area was used). */
  areaMissing?: boolean;
  /** True when the plot's area was rounded or limited to the model's 0.5–50 ha range. */
  areaAdjusted?: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: TwinInputs;
  output: TwinOutput;
  source?: ScenarioSource | null;
}

export const MAX_SCENARIOS = 6;

const DEFAULT_INPUTS: TwinInputs = {
  crop: 'Mahindi',
  areaHa: 2,
  rainfallMm: 600,
  fertilizerKgHa: 100,
  irrigated: false,
  soilHealth: 75,
  plantingDensityPct: 100,
  soilType: 'Tifutifu (Loam)',
};

const newId = () => `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export interface DigitalFarmTwinState {
  scenarios: Scenario[];
  /** Returns the new id, or '' when the limit of MAX_SCENARIOS is reached. */
  createScenario: (
    name: string,
    inputs?: Partial<TwinInputs>,
    source?: ScenarioSource | null
  ) => string;
  updateInputs: (id: string, inputs: TwinInputs) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
  /** Copy a scenario under `name`. Returns the new id, or '' if not found / at the limit. */
  duplicateScenario: (id: string, name: string) => string;
  reset: () => void;
}

export const useDigitalFarmTwinStore = create<DigitalFarmTwinState>()(
  persist(
    (set, get) => ({
      scenarios: [],

      createScenario: (name, inputs = {}, source = null) => {
        if (get().scenarios.length >= MAX_SCENARIOS) return '';
        const merged: TwinInputs = { ...DEFAULT_INPUTS, ...inputs };
        const id = newId();
        const now = new Date().toISOString();
        set((s) => ({
          scenarios: [
            ...s.scenarios,
            {
              id,
              name,
              createdAt: now,
              updatedAt: now,
              inputs: merged,
              output: runTwinModel(merged),
              source,
            },
          ],
        }));
        return id;
      },

      updateInputs: (id, inputs) => {
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id
              ? { ...sc, inputs, output: runTwinModel(inputs), updatedAt: new Date().toISOString() }
              : sc
          ),
        }));
      },

      renameScenario: (id, name) => {
        set((s) => ({
          scenarios: s.scenarios.map((sc) =>
            sc.id === id ? { ...sc, name, updatedAt: new Date().toISOString() } : sc
          ),
        }));
      },

      deleteScenario: (id) => {
        set((s) => ({ scenarios: s.scenarios.filter((sc) => sc.id !== id) }));
      },

      duplicateScenario: (id, name) => {
        const src = get().scenarios.find((sc) => sc.id === id);
        if (!src || get().scenarios.length >= MAX_SCENARIOS) return '';
        const copyId = newId();
        const now = new Date().toISOString();
        set((s) => ({
          scenarios: [...s.scenarios, { ...src, id: copyId, name, createdAt: now, updatedAt: now }],
        }));
        return copyId;
      },

      reset: () => set({ scenarios: [] }),
    }),
    {
      name: 'kilimo-farm-twin-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ scenarios: s.scenarios }),
      // v0 persisted the two demo scenarios; drop them (user-created scenarios are kept).
      migrate: (persisted: any) => ({
        ...(persisted ?? {}),
        scenarios: dropSeedScenarios<Scenario>(persisted?.scenarios),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        scenarios: dropSeedScenarios<Scenario>(persisted?.scenarios),
      }),
    }
  )
);

export { DEFAULT_INPUTS };
export type { TwinInputs, TwinOutput, Crop, SoilType };
