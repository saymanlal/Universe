import { Rng, hashString } from './rng';
import type { Person } from './people';
import type { PersonalityProfile } from './personality';

export interface EmotionalState {
  pleasure: number;  // -1.0 to 1.0 (PAD model)
  arousal: number;   // -1.0 to 1.0
  dominance: number; // -1.0 to 1.0
  descriptor: string;
}

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  text: string;
  internalThought: string;
  emotionalState: EmotionalState;
  decisionReasoning: string;
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
 * Dialogue, internal thoughts, emotional state (PAD), and decision reasoning
 * are generated on-the-fly and never stored long-term unless a lasting outcome occurs.
 */
export function observeConversation(
  personA: Person,
  personalityA: PersonalityProfile,
  personB: Person,
  personalityB: PersonalityProfile,
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
    'interstellar diplomacy',
    'megastructure construction plans',
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

  const thoughtsA = [
    `I must maintain composure to secure a favorable agreement on ${topic}.`,
    `I wonder if ${personB.name} truly grasps the full implications.`,
    `This discussion could influence our civilization's direction.`,
  ];

  const thoughtsB = [
    `My primary focus remains protecting our local resources.`,
    `${personA.name} seems determined, but caution is warranted.`,
    `We need concrete progress rather than mere words.`,
  ];

  const padA: EmotionalState = {
    pleasure: +(rng.float(-0.5, 0.8)).toFixed(2),
    arousal: +(rng.float(0.1, 0.9)).toFixed(2),
    dominance: +(rng.float(-0.3, 0.7)).toFixed(2),
    descriptor: rng.pick(['Focused', 'Optimistic', 'Cautious', 'Determined']),
  };

  const padB: EmotionalState = {
    pleasure: +(rng.float(-0.4, 0.7)).toFixed(2),
    arousal: +(rng.float(0.0, 0.8)).toFixed(2),
    dominance: +(rng.float(-0.2, 0.8)).toFixed(2),
    descriptor: rng.pick(['Analytical', 'Reserved', 'Engaged', 'Curious']),
  };

  const lines: DialogueLine[] = [
    {
      speakerId: personA.id,
      speakerName: personA.name,
      text: rng.pick(greetings),
      internalThought: rng.pick(thoughtsA),
      emotionalState: padA,
      decisionReasoning: `Driven by High Openness (${personalityA.bigFive.openness.toFixed(2)}) to initiate discourse.`,
      timestamp: '10:14',
    },
    {
      speakerId: personB.id,
      speakerName: personB.name,
      text: rng.pick(responses),
      internalThought: rng.pick(thoughtsB),
      emotionalState: padB,
      decisionReasoning: `Role as ${personB.occupation} and Conscientiousness (${personalityB.bigFive.conscientiousness.toFixed(2)}) shape response.`,
      timestamp: '10:15',
    },
    {
      speakerId: personA.id,
      speakerName: personA.name,
      text: rng.pick(conclusions),
      internalThought: `Outcome aligns with long-term goals for ${topic}.`,
      emotionalState: padA,
      decisionReasoning: `Consensus reached based on mutual interest.`,
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
