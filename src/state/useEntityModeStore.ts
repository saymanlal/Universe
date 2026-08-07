/**
 * Entity Inhabitation Mode Store
 * 
 * When the user "inhabits" an entity, they become that entity.
 * They can walk, talk, eat, sleep, craft, build, and observe the planet surface.
 */

import { create } from 'zustand';
import type { Person } from '@/core/people';

export type EntityActivity =
  | 'idle'
  | 'walking'
  | 'talking'
  | 'eating'
  | 'sleeping'
  | 'crafting'
  | 'building'
  | 'exploring'
  | 'farming'
  | 'trading'
  | 'fighting'
  | 'meditating';

export type EntityDirection = 'left' | 'right' | 'up' | 'down';

export interface NearbyEntity {
  id: string;
  name: string;
  occupation: string;
  x: number;
  y: number;
  activity: EntityActivity;
  mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'curious';
  speechBubble?: string;
}

export interface EntityStats {
  hunger: number;    // 0-100
  energy: number;    // 0-100
  health: number;    // 0-100
  happiness: number; // 0-100
  social: number;    // 0-100
  wealth: number;    // 0-100
}

export interface PlayerInventory {
  food: number;
  water: number;
  tools: number;
  materials: number;
  credits: number;
}

export interface ChatMessage {
  from: string;
  to: string;
  text: string;
  thought?: string;
  timestamp: number;
}

export interface EntityModeState {
  active: boolean;
  entity: Person | null;
  planetId: string | null;
  planetName: string;
  planetType: string;
  // Player world position on planet surface (0-1000 units)
  posX: number;
  posY: number;
  direction: EntityDirection;
  currentActivity: EntityActivity;
  stats: EntityStats;
  inventory: PlayerInventory;
  nearbyEntities: NearbyEntity[];
  chatHistory: ChatMessage[];
  activeChatTarget: string | null;
  pendingActions: string[];
  timeOfDay: number; // 0-24
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  log: string[];

  // Actions
  inhabit: (entity: Person, planetId: string, planetName: string, planetType: string) => void;
  exit: () => void;
  move: (dx: number, dy: number) => void;
  setActivity: (activity: EntityActivity) => void;
  eat: () => void;
  sleep: () => void;
  craft: (item: string) => void;
  sendChat: (targetId: string, text: string) => void;
  receiveChat: (from: string, text: string, thought?: string) => void;
  openChat: (targetId: string) => void;
  closeChat: () => void;
  addLog: (msg: string) => void;
  tick: (dt: number) => void;
}

const defaultStats: EntityStats = {
  hunger: 75,
  energy: 80,
  health: 95,
  happiness: 70,
  social: 60,
  wealth: 40,
};

const defaultInventory: PlayerInventory = {
  food: 3,
  water: 5,
  tools: 1,
  materials: 0,
  credits: 120,
};

export const useEntityModeStore = create<EntityModeState>((set, get) => ({
  active: false,
  entity: null,
  planetId: null,
  planetName: 'Unknown World',
  planetType: 'terran',
  posX: 400,
  posY: 300,
  direction: 'right',
  currentActivity: 'idle',
  stats: defaultStats,
  inventory: defaultInventory,
  nearbyEntities: [],
  chatHistory: [],
  activeChatTarget: null,
  pendingActions: [],
  timeOfDay: 10,
  weather: 'clear',
  log: ['You have entered entity mode. You are now inhabiting this being.'],

  inhabit: (entity, planetId, planetName, planetType) => {
    // Generate nearby entities from PRNG based on planet + entity ids
    const nearby: NearbyEntity[] = Array.from({ length: 6 }, (_, i) => {
      const names = ['Kael Voss', 'Aria Thorne', 'Zor Drak', 'Tali Sol', 'Vael Kov', 'Nix Rune'];
      const occupations = ['Farmer', 'Trader', 'Guard', 'Scholar', 'Artisan', 'Healer'];
      const moods: NearbyEntity['mood'][] = ['happy', 'neutral', 'curious', 'neutral', 'happy', 'sad'];
      const activities: EntityActivity[] = ['farming', 'trading', 'idle', 'crafting', 'walking', 'talking'];
      return {
        id: `npc_${i}`,
        name: names[i]!,
        occupation: occupations[i]!,
        x: 300 + (i % 3) * 120 + Math.sin(i * 1.4) * 50,
        y: 280 + Math.floor(i / 3) * 80,
        activity: activities[i]!,
        mood: moods[i]!,
        speechBubble: i === 1 ? 'Good morning!' : undefined,
      };
    });

    set({
      active: true,
      entity,
      planetId,
      planetName,
      planetType,
      posX: 400,
      posY: 300,
      direction: 'right',
      currentActivity: 'idle',
      stats: { ...defaultStats },
      inventory: { ...defaultInventory },
      nearbyEntities: nearby,
      chatHistory: [],
      activeChatTarget: null,
      timeOfDay: 10,
      weather: 'clear',
      log: [
        `You are now ${entity.name}, a ${entity.occupation}.`,
        `You stand on ${planetName}. The air smells of ${planetType === 'ocean' ? 'salt and mist' : planetType === 'lava' ? 'sulfur and heat' : 'earth and growth'}.`,
        'Press WASD to move. Click nearby entities to interact.',
      ],
    });
  },

  exit: () => set({
    active: false,
    entity: null,
    planetId: null,
    chatHistory: [],
    activeChatTarget: null,
    nearbyEntities: [],
    log: [],
  }),

  move: (dx, dy) => {
    const s = get();
    const speed = 8;
    const newX = Math.max(20, Math.min(980, s.posX + dx * speed));
    const newY = Math.max(180, Math.min(480, s.posY + dy * speed));
    const dir: EntityDirection = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    set({
      posX: newX,
      posY: newY,
      direction: dir,
      currentActivity: 'walking',
    });
  },

  setActivity: (activity) => set({ currentActivity: activity }),

  eat: () => {
    const s = get();
    if (s.inventory.food <= 0) {
      set({ log: [...s.log.slice(-20), 'You have no food.'] });
      return;
    }
    set({
      inventory: { ...s.inventory, food: s.inventory.food - 1 },
      stats: { ...s.stats, hunger: Math.min(100, s.stats.hunger + 30), energy: Math.min(100, s.stats.energy + 10) },
      currentActivity: 'eating',
      log: [...s.log.slice(-20), 'You eat a meal. Hunger eases.'],
    });
  },

  sleep: () => {
    const s = get();
    set({
      stats: { ...s.stats, energy: Math.min(100, s.stats.energy + 50), health: Math.min(100, s.stats.health + 5) },
      currentActivity: 'sleeping',
      timeOfDay: 8,
      log: [...s.log.slice(-20), 'You sleep through the night. You awaken refreshed.'],
    });
    setTimeout(() => {
      if (get().active) set({ currentActivity: 'idle' });
    }, 2000);
  },

  craft: (item) => {
    const s = get();
    if (s.inventory.materials <= 0) {
      set({ log: [...s.log.slice(-20), `You need materials to craft ${item}.`] });
      return;
    }
    set({
      inventory: { ...s.inventory, materials: s.inventory.materials - 1, tools: s.inventory.tools + (item === 'tool' ? 1 : 0) },
      currentActivity: 'crafting',
      log: [...s.log.slice(-20), `You craft a ${item}. Your hands are steady.`],
    });
    setTimeout(() => {
      if (get().active) set({ currentActivity: 'idle' });
    }, 2500);
  },

  sendChat: (targetId, text) => {
    const s = get();
    const target = s.nearbyEntities.find(e => e.id === targetId);
    if (!target) return;

    const msg: ChatMessage = { from: s.entity?.name ?? 'You', to: target.name, text, timestamp: Date.now() };
    const responses = [
      { text: `Indeed, ${s.entity?.name}. I've been thinking the same.`, thought: 'They seem genuine.' },
      { text: `Interesting point. As a ${target.occupation}, I see it differently.`, thought: 'I must tread carefully.' },
      { text: `Let me consider that. Come find me at dusk.`, thought: 'Perhaps an alliance.' },
      { text: `The council discussed this yesterday. Nothing resolved.`, thought: 'Frustration builds.' },
      { text: `You should speak to the Elder. They have answers.`, thought: 'Deflecting again.' },
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)]!;

    setTimeout(() => {
      const replyMsg: ChatMessage = { from: target.name, to: s.entity?.name ?? 'You', text: reply.text, thought: reply.thought, timestamp: Date.now() };
      set(state => ({
        chatHistory: [...state.chatHistory.slice(-50), replyMsg],
        log: [...state.log.slice(-20), `${target.name}: "${reply.text}"`],
      }));
    }, 1200);

    set({
      chatHistory: [...s.chatHistory.slice(-50), msg],
      stats: { ...s.stats, social: Math.min(100, s.stats.social + 5) },
      log: [...s.log.slice(-20), `You said to ${target.name}: "${text}"`],
    });
  },

  receiveChat: (from, text, thought) => {
    const s = get();
    const msg: ChatMessage = { from, to: s.entity?.name ?? 'You', text, thought, timestamp: Date.now() };
    set({ chatHistory: [...s.chatHistory.slice(-50), msg] });
  },

  openChat: (targetId) => set({ activeChatTarget: targetId, currentActivity: 'talking' }),

  closeChat: () => set({ activeChatTarget: null, currentActivity: 'idle' }),

  addLog: (msg) => set(s => ({ log: [...s.log.slice(-20), msg] })),

  tick: (dt) => {
    const s = get();
    if (!s.active) return;
    // Slowly drain stats
    const hungerDrain = s.currentActivity === 'farming' || s.currentActivity === 'walking' ? 0.03 : 0.01;
    const energyDrain = s.currentActivity === 'sleeping' ? -0.5 : s.currentActivity === 'walking' ? 0.04 : 0.015;
    const newHunger = Math.max(0, s.stats.hunger - hungerDrain * dt);
    const newEnergy = Math.min(100, Math.max(0, s.stats.energy - energyDrain * dt));
    const newHealth = newHunger < 10 ? Math.max(0, s.stats.health - 0.02 * dt) : s.stats.health;
    // Advance time of day
    const newTime = (s.timeOfDay + dt * 0.002) % 24;

    set({
      stats: { ...s.stats, hunger: newHunger, energy: newEnergy, health: newHealth },
      timeOfDay: newTime,
    });
  },
}));
