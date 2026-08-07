import { Rng, hashString } from './rng';
import type { Settlement } from './civilization';

export interface ResourceMarket {
  resourceName: string;
  supplyUnits: number;
  demandUnits: number;
  unitPriceCredits: number;
}

export interface SettlementEconomy {
  settlementId: string;
  treasuryCredits: number;
  grossLocalProduct: number; // GLP in credits/year
  tradePartners: string[]; // Settlement IDs
  markets: ResourceMarket[];
}

/**
 * Deterministically generates economy, market supply/demand, and trade networks for a settlement.
 */
export function generateEconomy(settlement: Settlement): SettlementEconomy {
  const seed = hashString(`${settlement.id}_economy`);
  const rng = new Rng(seed);

  const baseMultiplier = settlement.type === 'metropolis' ? 50 : settlement.type === 'city' ? 15 : 3;
  const treasuryCredits = rng.int(1000, 50000) * baseMultiplier;
  const grossLocalProduct = Math.round(settlement.population * rng.float(1.2, 4.5));

  const standardResources = ['Food Rations', 'Refined Minerals', 'Energy Cells', 'Construction Alloy'];
  const markets: ResourceMarket[] = standardResources.map((res) => {
    const supply = rng.int(100, 5000) * baseMultiplier;
    const demand = rng.int(80, 5200) * baseMultiplier;
    const basePrice = res === 'Energy Cells' ? 25 : 10;
    const priceRatio = Math.max(0.5, Math.min(3.0, demand / Math.max(1, supply)));
    const unitPriceCredits = Math.round(basePrice * priceRatio * 100) / 100;

    return {
      resourceName: res,
      supplyUnits: supply,
      demandUnits: demand,
      unitPriceCredits,
    };
  });

  return {
    settlementId: settlement.id,
    treasuryCredits,
    grossLocalProduct,
    tradePartners: [],
    markets,
  };
}
