import { Rng, hashString } from './rng';
import type { Settlement } from './civilization';
import type { TechEra } from './technology';

export type TransitMode = 'dirt_road' | 'paved_highway' | 'maritime_shipping' | 'maglev_rail' | 'atmospheric_shuttle' | 'orbital_elevator';

export interface Route {
  id: string;
  sourceSettlementId: string;
  targetSettlementId: string;
  mode: TransitMode;
  capacityPerDay: number;
  efficiency: number; // 0 to 1
}

export interface TransitNetwork {
  settlementId: string;
  availableModes: TransitMode[];
  connectedRoutes: Route[];
}

/**
 * Deterministically generates transportation networks, shipping lanes, rail networks, and flight corridors.
 */
export function generateTransitNetwork(
  settlement: Settlement,
  techEra: TechEra,
  otherSettlements: Settlement[]
): TransitNetwork {
  const seed = hashString(`${settlement.id}_transit`);
  const rng = new Rng(seed);

  const eraModes: Record<TechEra, TransitMode[]> = {
    stone_age: ['dirt_road'],
    bronze_age: ['dirt_road', 'maritime_shipping'],
    iron_age: ['dirt_road', 'paved_highway', 'maritime_shipping'],
    industrial: ['paved_highway', 'maritime_shipping', 'maglev_rail'],
    digital: ['paved_highway', 'maritime_shipping', 'maglev_rail', 'atmospheric_shuttle'],
    space_age: ['maglev_rail', 'atmospheric_shuttle', 'orbital_elevator'],
  };

  const availableModes = eraModes[techEra] ?? ['dirt_road'];

  const connectedRoutes: Route[] = [];
  const targetCount = Math.min(otherSettlements.length, rng.int(1, 3));

  for (let i = 0; i < targetCount; i++) {
    const target = otherSettlements[i];
    if (!target || target.id === settlement.id) continue;

    const mode = rng.pick(availableModes);
    const capacityPerDay = mode === 'orbital_elevator' ? 500000 : mode === 'maglev_rail' ? 50000 : 1000;

    connectedRoutes.push({
      id: `route_${settlement.id}_${target.id}`,
      sourceSettlementId: settlement.id,
      targetSettlementId: target.id,
      mode,
      capacityPerDay,
      efficiency: Math.round(rng.float(0.7, 0.99) * 100) / 100,
    });
  }

  return {
    settlementId: settlement.id,
    availableModes,
    connectedRoutes,
  };
}
