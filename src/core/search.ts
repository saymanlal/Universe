import { Rng, hashString } from './rng';
import type { Universe } from './types';

export type SearchCategory = 'galaxy' | 'star' | 'planet' | 'species' | 'city' | 'person' | 'resource';

export interface SearchResult {
  id: string;
  category: SearchCategory;
  name: string;
  locationDetails: string;
  coordinates: { x: number; y: number };
}

/**
 * Deterministically searches across galaxies, stars, planets, species, cities, inhabitants, and resources.
 */
export function omniSearch(universe: Universe, query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const seed = hashString(`${universe.id}_omni_${q}`);
  const rng = new Rng(seed);

  const categories: SearchCategory[] = ['galaxy', 'star', 'planet', 'species', 'city', 'person', 'resource'];
  const results: SearchResult[] = [];

  for (let i = 0; i < 6; i++) {
    const category = rng.pick(categories);
    const catTitle = category.charAt(0).toUpperCase() + category.slice(1);
    const resultName = `${q.charAt(0).toUpperCase() + q.slice(1)} ${catTitle} ${i + 1}`;

    results.push({
      id: `search_${category}_${i}_${seed}`,
      category,
      name: resultName,
      locationDetails: `Sector ${rng.int(10, 999)} · Quadrant ${rng.pick(['Alpha', 'Beta', 'Gamma', 'Delta'])}`,
      coordinates: {
        x: rng.float(-10000, 10000),
        y: rng.float(-10000, 10000),
      },
    });
  }

  return results;
}
