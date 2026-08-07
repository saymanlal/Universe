import { Rng, hashString } from './rng';
import type { SapientSpecies } from './species';
import type { Settlement } from './civilization';

export interface Person {
  id: string;
  name: string;
  speciesId: string;
  settlementId: string;
  age: number; // in standard years
  occupation: string;
  familyId: string;
  homeAddress: string;
  inventory: string[];
  schedule: {
    workHours: string; // e.g. "08:00 - 16:00"
    leisureHours: string;
    sleepHours: string;
  };
}

/**
 * Deterministically generates individual inhabitants for a settlement when observed by God Mode.
 * dialogue/schedule/inventories are generated lazily and never bloated on disk.
 */
export function generatePeopleForSettlement(
  settlement: Settlement,
  species: SapientSpecies,
  count = 10
): Person[] {
  const seed = hashString(`${settlement.id}_people`);
  const rng = new Rng(seed);
  const people: Person[] = [];

  const occupations = [
    'Farmer',
    'Blacksmith',
    'Scholar',
    'Trader',
    'Architect',
    'Physician',
    'Guard',
    'Artisan',
    'Councilor',
    'Explorer',
  ];

  const firstNames = ['Aria', 'Kael', 'Zor', 'Tali', 'Vael', 'Nix', 'Orion', 'Sora', 'Elys', 'Brem'];
  const familyNames = ['Voss', 'Thorne', 'Sol', 'Drak', 'Kov', 'Zane', 'Rune', 'Ashen', 'Vale', 'Pyre'];

  for (let i = 0; i < count; i++) {
    const fn = rng.pick(firstNames);
    const ln = rng.pick(familyNames);
    const familyId = `fam_${settlement.id}_${ln}`;
    const age = rng.int(16, 90);
    const occupation = rng.pick(occupations);

    const items = ['Tool Component', 'Ration Pack', 'Data Slate', 'Woven Garment', 'Ornamental Key'];
    const inventoryCount = rng.int(1, 3);
    const inventory: string[] = [];
    for (let k = 0; k < inventoryCount; k++) {
      inventory.push(rng.pick(items));
    }

    people.push({
      id: `person_${settlement.id}_${i}`,
      name: `${fn} ${ln}`,
      speciesId: species.id,
      settlementId: settlement.id,
      age,
      occupation,
      familyId,
      homeAddress: `${rng.int(1, 400)} ${ln} Sector`,
      inventory,
      schedule: {
        workHours: '08:00 - 16:00',
        leisureHours: '16:00 - 22:00',
        sleepHours: '22:00 - 06:00',
      },
    });
  }

  return people;
}
