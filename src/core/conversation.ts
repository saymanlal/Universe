import { Rng, hashString } from './rng';
import type { Person } from './people';
import type { PersonalityProfile } from './personality';

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  topic: string;
  participants: [Person, Person];
  lines: DialogueLine[];
  lastingOutcome?: string; // Only stored if it produces a permanent change
}

/**
 * Deterministically generates conversations ONLY when observed by God Mode.
 * Dialogue is generated on-the-fly and never stored long-term unless a lasting outcome occurs.
 */
export function observeConversation(
  personA: Person,
  _personalityA: PersonalityProfile,
  personB: Person,
  _personalityB: PersonalityProfile,
  simTime: number
): Conversation {
  const seed = hashString(`${personA.id}_${personB.id}_${Math.floor(simTime / 300)}`);
  const rng = new Rng(seed);

  const topics = [
    'local resource trade rates',
    'settlement security patrols',
    'recent climate anomalies',
    'technological advancements',
    'family lineage history',
    'philosophical nature of the cosmos',
  ];

  const topic = rng.pick(topics);

  const greetings = [
    `Greetings, ${personB.name}. Have you heard about ${topic}?`,
    `Good day. I was just pondering ${topic}.`,
    `${personB.name}, do you have a moment to discuss ${topic}?`,
  ];

  const responses = [
    `Indeed, ${personA.name}. Given my role as ${personB.occupation}, it concerns me greatly.`,
    `I have given ${topic} much thought lately. My instinct aligns with progress.`,
    `Interesting perspective. As a ${personB.occupation}, I see it somewhat differently.`,
  ];

  const conclusions = [
    `Let us align our efforts at the next council assembly.`,
    `Agreed. Farewell for now, my friend.`,
    `I shall record this in our settlement logs.`,
  ];

  const lines: DialogueLine[] = [
    {
      speakerId: personA.id,
      speakerName: personA.name,
      text: rng.pick(greetings),
      timestamp: '10:14',
    },
    {
      speakerId: personB.id,
      speakerName: personB.name,
      text: rng.pick(responses),
      timestamp: '10:15',
    },
    {
      speakerId: personA.id,
      speakerName: personA.name,
      text: rng.pick(conclusions),
      timestamp: '10:16',
    },
  ];

  const outcomeChance = rng.float(0, 1);
  let lastingOutcome: string | undefined;
  if (outcomeChance > 0.8) {
    lastingOutcome = `Formed trade pact regarding ${topic}`;
  }

  return {
    id: `convo_${personA.id}_${personB.id}_${Math.floor(simTime)}`,
    topic,
    participants: [personA, personB],
    lines,
    lastingOutcome,
  };
}
