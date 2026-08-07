import { hashString } from './rng';
import type { Civilization } from './civilization';

export type HistoricalEventType =
  | 'civilization_founded'
  | 'technological_breakthrough'
  | 'great_famine'
  | 'war_declaration'
  | 'peace_treaty'
  | 'cosmic_impact';

export interface HistoricalEvent {
  id: string;
  year: number;
  type: HistoricalEventType;
  title: string;
  description: string;
  importance: 'minor' | 'major' | 'epochal';
}

export interface HistoricalRecord {
  civilizationId: string;
  chronicleEvents: HistoricalEvent[];
}

/**
 * Deterministically synthesizes historical chronicles and records across simulation time.
 */
export function generateHistoryRecord(civ: Civilization, currentSimYear: number): HistoricalRecord {
  const seed = hashString(`${civ.id}_history`);

  const chronicleEvents: HistoricalEvent[] = [
    {
      id: `hist_founding_${civ.id}_${seed}`,
      year: 1,
      type: 'civilization_founded',
      title: `Genesis of ${civ.name}`,
      description: `Inauguration of ${civ.capitalName} as the unified center of regional authority.`,
      importance: 'epochal',
    },
  ];

  if (currentSimYear >= 50) {
    chronicleEvents.push({
      id: `hist_tech_${civ.id}`,
      year: Math.floor(currentSimYear * 0.4),
      type: 'technological_breakthrough',
      title: 'Architectural Revolution',
      description: 'Discovery of structural load-bearing methods doubled urban density capacity.',
      importance: 'major',
    });
  }

  if (currentSimYear >= 150) {
    chronicleEvents.push({
      id: `hist_peace_${civ.id}`,
      year: Math.floor(currentSimYear * 0.75),
      type: 'peace_treaty',
      title: 'Concordat of the Capitals',
      description: 'Formal ratifying of open trade corridors between neighboring settlements.',
      importance: 'minor',
    });
  }

  return {
    civilizationId: civ.id,
    chronicleEvents,
  };
}
