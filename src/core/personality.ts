import { Rng, hashString } from './rng';
import type { Person } from './people';

export type PrimaryEmotion = 'content' | 'ambitious' | 'anxious' | 'grieved' | 'euphoric' | 'vengeful';

export interface PersonalityProfile {
  personId: string;
  bigFive: {
    openness: number; // 0 to 1
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  currentEmotion: PrimaryEmotion;
  needs: {
    sustenance: number; // 0 to 100
    security: number;
    socialConnection: number;
    selfActualization: number;
  };
  goals: string[];
  habits: string[];
  relationships: Array<{
    targetPersonId: string;
    affinity: number; // -100 to 100
    relationType: 'family' | 'friend' | 'rival' | 'colleague';
  }>;
}

/**
 * Deterministically synthesizes psychological profile, emotions, needs, goals, and habits for a person.
 */
export function generatePersonality(person: Person): PersonalityProfile {
  const seed = hashString(`${person.id}_personality`);
  const rng = new Rng(seed);

  const bigFive = {
    openness: Math.round(rng.float(0, 1) * 100) / 100,
    conscientiousness: Math.round(rng.float(0, 1) * 100) / 100,
    extraversion: Math.round(rng.float(0, 1) * 100) / 100,
    agreeableness: Math.round(rng.float(0, 1) * 100) / 100,
    neuroticism: Math.round(rng.float(0, 1) * 100) / 100,
  };

  const emotions: PrimaryEmotion[] = ['content', 'ambitious', 'anxious', 'grieved', 'euphoric', 'vengeful'];
  const currentEmotion = rng.pick(emotions);

  const possibleGoals = [
    'Master trade craft',
    'Amass familial wealth',
    'Explore undiscovered lands',
    'Ascend civic council',
    'Protect community settlement',
    'Form lasting bond',
  ];

  const possibleHabits = [
    'Early morning meditation',
    'Stargazing at twilight',
    'Recording daily journal',
    'Frequent tavern visits',
    'Obsessive inventory counting',
  ];

  const goalsCount = rng.int(1, 2);
  const goals: string[] = [];
  for (let i = 0; i < goalsCount; i++) {
    const g = rng.pick(possibleGoals);
    if (!goals.includes(g)) goals.push(g);
  }

  const habitsCount = rng.int(1, 2);
  const habits: string[] = [];
  for (let i = 0; i < habitsCount; i++) {
    const h = rng.pick(possibleHabits);
    if (!habits.includes(h)) habits.push(h);
  }

  return {
    personId: person.id,
    bigFive,
    currentEmotion,
    needs: {
      sustenance: rng.int(60, 100),
      security: rng.int(50, 100),
      socialConnection: rng.int(40, 100),
      selfActualization: rng.int(30, 100),
    },
    goals,
    habits,
    relationships: [],
  };
}
