/**
 * Planet Surface Canvas Renderer
 * 
 * Procedural 2D side-scrolling planet surface renderer.
 * Renders sky gradient, stars/moons, terrain layers, flora, water, entities,
 * and the player character — all from the planet's seed and type.
 */

import { useRef, useEffect, useCallback, type FC } from 'react';
import { useEntityModeStore } from '@/state/useEntityModeStore';

// --------------- Terrain Generation ---------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function generateTerrain(seed: number, width: number): number[] {
  const rng = seededRandom(seed);
  const terrain: number[] = new Array(width).fill(0);
  // Multiple octaves of noise
  const octaves = [
    { amp: 80, freq: 0.008 },
    { amp: 30, freq: 0.025 },
    { amp: 12, freq: 0.06 },
    { amp: 5, freq: 0.15 },
  ];
  const phases = octaves.map(() => rng() * 1000);
  for (let x = 0; x < width; x++) {
    let h = 0;
    for (let o = 0; o < octaves.length; o++) {
      const oct = octaves[o]!;
      h += oct.amp * Math.sin(x * oct.freq + phases[o]!);
    }
    terrain[x] = h;
  }
  return terrain;
}

// --------------- Color Palettes by Planet Type ---------------

interface PlanetPalette {
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  groundMid?: string;
  foliage?: string;
  water?: string;
  rock?: string;
  starColor?: string;
}

const PALETTES: Record<string, PlanetPalette> = {
  terran: {
    skyTop: '#0d1b3e',
    skyBottom: '#1e5f8a',
    groundTop: '#4a8c3f',
    groundMid: '#5c6b3a',
    groundBottom: '#3d4a2a',
    foliage: '#2d6e28',
    water: '#2155a3',
    rock: '#7a6a58',
    starColor: '#fffde7',
  },
  ocean: {
    skyTop: '#0a1a4a',
    skyBottom: '#1a4a8a',
    groundTop: '#1a4a8a',
    groundMid: '#0d3060',
    groundBottom: '#091840',
    water: '#0d3878',
    starColor: '#e0f7fa',
  },
  desert: {
    skyTop: '#8b4513',
    skyBottom: '#d97c2b',
    groundTop: '#c8a04a',
    groundMid: '#a07830',
    groundBottom: '#7a5a20',
    rock: '#b86c2a',
    starColor: '#fff3e0',
  },
  lava: {
    skyTop: '#1a0500',
    skyBottom: '#4a0f00',
    groundTop: '#3a0a00',
    groundMid: '#5a1500',
    groundBottom: '#2a0500',
    rock: '#8a2a00',
    water: '#ff4500',
    starColor: '#ffcc80',
  },
  ice: {
    skyTop: '#0a1540',
    skyBottom: '#3060a0',
    groundTop: '#d0e8f8',
    groundMid: '#b0cce0',
    groundBottom: '#90b0c8',
    water: '#8ab4d0',
    starColor: '#e8f4fd',
  },
  rocky: {
    skyTop: '#050515',
    skyBottom: '#151535',
    groundTop: '#5a5a5a',
    groundMid: '#3a3a3a',
    groundBottom: '#252525',
    rock: '#6a6a6a',
    starColor: '#fffde7',
  },
  gas: {
    skyTop: '#1a0a3a',
    skyBottom: '#4a2a7a',
    groundTop: '#7a4ab0',
    groundMid: '#5a3090',
    groundBottom: '#3a1a6a',
    water: '#9a5ad0',
    starColor: '#e1bee7',
  },
  iceGiant: {
    skyTop: '#0a2a4a',
    skyBottom: '#1a4a7a',
    groundTop: '#2a6a9a',
    groundMid: '#1a4a7a',
    groundBottom: '#0a2a5a',
    water: '#3a8ab0',
    starColor: '#b3e5fc',
  },
};

// --------------- Weather Overlays ---------------

function drawWeather(
  ctx: CanvasRenderingContext2D,
  weather: string,
  width: number,
  height: number,
  t: number
) {
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(150,200,255,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const x = (i * 73 + t * 2) % width;
      const y = (t * 3 + i * 97) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 14);
      ctx.stroke();
    }
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 60; i++) {
      const x = (i * 113 + t * 0.5) % width;
      const y = (t * 0.8 + i * 127) % height;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather === 'storm') {
    ctx.strokeStyle = 'rgba(255,255,100,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = (i * 83 + t * 3) % width;
      const y = (t * 4 + i * 107) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 20);
      ctx.stroke();
    }
    // Lightning occasionally
    if (Math.floor(t / 40) % 20 === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(190, 100);
      ctx.lineTo(210, 100);
      ctx.lineTo(190, 250);
      ctx.stroke();
    }
  } else if (weather === 'fog') {
    const grad = ctx.createLinearGradient(0, height * 0.5, 0, height);
    grad.addColorStop(0, 'rgba(200,220,240,0)');
    grad.addColorStop(1, 'rgba(200,220,240,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

// --------------- Entity Sprites ---------------

function drawEntity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: string,
  activity: string,
  isPlayer: boolean,
  name: string,
  mood?: string
) {
  ctx.save();
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyColor = isPlayer ? '#00d4ff' : (mood === 'happy' ? '#70e070' : mood === 'angry' ? '#ff5050' : mood === 'sad' ? '#7090ff' : '#c0c0c0');
  
  // Cloak/body
  ctx.fillStyle = isPlayer ? '#0066cc' : '#4a5568';
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x + 10, y + 20);
  ctx.lineTo(x - 10, y + 20);
  ctx.fill();

  // Head
  ctx.fillStyle = '#f0d0a0';
  ctx.beginPath();
  ctx.arc(x, y - 8, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eye glow
  ctx.fillStyle = isPlayer ? '#00d4ff' : bodyColor;
  ctx.beginPath();
  ctx.arc(x + (dir === 'left' ? -3 : 3), y - 9, 2, 0, Math.PI * 2);
  ctx.fill();

  // Helmet/hat for player
  if (isPlayer) {
    ctx.fillStyle = '#003a80';
    ctx.fillRect(x - 9, y - 18, 18, 6);
    // Visor glow
    ctx.fillStyle = 'rgba(0,200,255,0.6)';
    ctx.fillRect(x - 7, y - 17, 14, 4);
  }

  // Activity indicator  
  if (activity === 'sleeping') {
    ctx.fillStyle = '#b0c4de';
    ctx.font = '12px serif';
    ctx.fillText('💤', x + 8, y - 18);
  } else if (activity === 'crafting') {
    ctx.fillStyle = '#ffd700';
    ctx.font = '10px serif';
    ctx.fillText('⚒', x + 8, y - 15);
  } else if (activity === 'farming') {
    ctx.font = '10px serif';
    ctx.fillText('🌾', x + 8, y - 12);
  } else if (activity === 'trading') {
    ctx.font = '10px serif';
    ctx.fillText('💰', x + 8, y - 12);
  } else if (activity === 'walking') {
    // Animated legs
    const legPhase = Date.now() * 0.01;
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(x - 7, y + 16, 5, 8 + Math.sin(legPhase) * 3);
    ctx.fillRect(x + 2, y + 16, 5, 8 + Math.cos(legPhase) * 3);
  }

  // Name tag
  ctx.fillStyle = isPlayer ? 'rgba(0,212,255,0.9)' : 'rgba(255,255,255,0.85)';
  ctx.font = `bold 10px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(isPlayer ? `★ ${name}` : name, x, y - 24);

  ctx.restore();
}

// --------------- Speech Bubble ---------------

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save();
  const maxWidth = 140;
  ctx.font = '10px Inter, sans-serif';
  const metrics = ctx.measureText(text);
  const bw = Math.min(metrics.width + 16, maxWidth);
  const bh = 20;
  const bx = x - bw / 2;
  const by = y - 60;

  // Bubble background
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(x - 5, by + bh);
  ctx.lineTo(x + 5, by + bh);
  ctx.lineTo(x, by + bh + 8);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();

  // Text
  ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.length > 20 ? text.slice(0, 18) + '…' : text, x, by + bh / 2);
  ctx.restore();
}

// --------------- Flora ---------------

function drawFlora(ctx: CanvasRenderingContext2D, palette: PlanetPalette, terrain: number[], width: number, baseY: number, seed: number) {
  const rng = seededRandom(seed + 99);
  const foliageColor = palette.foliage ?? palette.groundTop;
  const rockColor = palette.rock ?? '#888';

  for (let i = 0; i < 30; i++) {
    const x = rng() * width;
    const tx = Math.floor(x);
    const terrainH = terrain[Math.min(tx, terrain.length - 1)] ?? 0;
    const groundY = baseY + terrainH;
    const type = rng();

    if (type < 0.4 && palette.foliage) {
      // Tree
      const h = 30 + rng() * 40;
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(x - 3, groundY - h, 6, h);
      ctx.fillStyle = foliageColor;
      ctx.beginPath();
      ctx.arc(x, groundY - h - 15, 18 + rng() * 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(x - 5, groundY - h - 18, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (type < 0.6) {
      // Rock
      const rs = 8 + rng() * 20;
      ctx.fillStyle = rockColor;
      ctx.beginPath();
      ctx.ellipse(x, groundY - rs * 0.4, rs, rs * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type < 0.75 && palette.foliage) {
      // Bush
      ctx.fillStyle = foliageColor;
      ctx.beginPath();
      ctx.arc(x, groundY - 8, 10 + rng() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --------------- Celestial Objects ---------------

function drawCelestials(ctx: CanvasRenderingContext2D, tod: number, width: number, height: number, palette: PlanetPalette) {
  const starColor = palette.starColor ?? '#ffffff';
  // Stars (visible at night)
  const nightFactor = tod < 6 || tod > 18 ? 1 : tod < 8 ? (8 - tod) / 2 : tod > 16 ? (tod - 16) / 2 : 0;
  if (nightFactor > 0) {
    ctx.globalAlpha = nightFactor * 0.8;
    ctx.fillStyle = starColor;
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.5 + 50) % width);
      const sy = ((i * 97.3 + 20) % (height * 0.5));
      const sr = 0.5 + (i % 3) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Sun/Moon position
  const angle = (tod / 24) * Math.PI * 2 - Math.PI / 2;
  const cx = width / 2 + Math.cos(angle) * width * 0.45;
  const cy = height * 0.25 + Math.sin(angle) * height * 0.3;

  if (cy > 0 && cy < height * 0.55) {
    if (tod >= 6 && tod <= 18) {
      // Sun
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      grad.addColorStop(0, '#fffde7');
      grad.addColorStop(0.4, '#ffca28');
      grad.addColorStop(1, 'rgba(255,202,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Moon
      ctx.fillStyle = 'rgba(200,220,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,20,60,0.3)';
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 3, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --------------- Main Renderer ---------------

export const PlanetSurfaceCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef(0);

  const {
    planetType,
    posX,
    posY,
    direction,
    currentActivity,
    entity,
    nearbyEntities,
    chatHistory,
    move,
    timeOfDay,
    weather,
  } = useEntityModeStore();

  const width = 1000;
  const height = 540;

  // Terrain derived from planet type as seed
  const terrain = useRef<number[]>([]);
  useEffect(() => {
    const seed = planetType.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 12345;
    terrain.current = generateTerrain(seed, width + 200);
  }, [planetType]);

  // Keyboard movement
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Update movement from keys
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy = -1;
      if (keys.has('s') || keys.has('arrowdown')) dy = 1;
      if (keys.has('a') || keys.has('arrowleft')) dx = -1;
      if (keys.has('d') || keys.has('arrowright')) dx = 1;
      if (dx !== 0 || dy !== 0) move(dx, dy);
    }, 50);
    return () => clearInterval(interval);
  }, [move]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const t = frameRef.current++;

    const palette = PALETTES[planetType] ?? PALETTES['rocky']!;
    const baseY = height * 0.6;

    // Camera: center player
    const camX = posX - width / 2;

    // ---- Sky gradient ----
    const sky = ctx.createLinearGradient(0, 0, 0, baseY);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Celestial objects
    drawCelestials(ctx, timeOfDay, width, height, palette);

    // Weather
    drawWeather(ctx, weather, width, height, t);

    // ---- Terrain ----
    ctx.save();
    ctx.translate(-camX, 0);

    // Ground layers
    const groundGrad = ctx.createLinearGradient(0, baseY, 0, height);
    groundGrad.addColorStop(0, palette.groundTop);
    groundGrad.addColorStop(0.3, palette.groundMid ?? palette.groundTop);
    groundGrad.addColorStop(1, palette.groundBottom);
    ctx.fillStyle = groundGrad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 200; x += 2) {
      const h = terrain.current[x] ?? 0;
      ctx.lineTo(x, baseY + h);
    }
    ctx.lineTo(width + 200, height);
    ctx.closePath();
    ctx.fill();

    // Water layer (for ocean/lava/ice types)
    if (palette.water) {
      ctx.fillStyle = palette.water + 'a0';
      for (let x = 0; x <= width + 200; x += 4) {
        const h = terrain.current[x] ?? 0;
        if (h > 20) {
          ctx.fillRect(x - 2, baseY + 20, 4, h - 20);
        }
      }
    }

    // Flora
    const floraSeeed = planetType.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    drawFlora(ctx, palette, terrain.current, width + 200, baseY, floraSeeed);

    // ---- NPC Entities ----
    for (const npc of nearbyEntities) {
      const tx = Math.floor(npc.x);
      const terrainH = terrain.current[Math.min(tx, terrain.current.length - 1)] ?? 0;
      const ey = baseY + terrainH - 20;
      drawEntity(ctx, npc.x, ey, 'right', npc.activity, false, npc.name, npc.mood);
      if (npc.speechBubble) {
        drawSpeechBubble(ctx, npc.x, ey, npc.speechBubble);
      }
    }

    // ---- Player entity ----
    const ptx = Math.floor(posX);
    const playerTerrainH = terrain.current[Math.min(ptx, terrain.current.length - 1)] ?? 0;
    const playerY = baseY + playerTerrainH - 20;
    drawEntity(ctx, posX, playerY, direction, currentActivity, true, entity?.name ?? 'You', 'happy');

    // Chat bubbles from recent messages
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.from !== entity?.name) {
      const sender = nearbyEntities.find(n => n.name === lastMsg.from);
      if (sender) {
        const stx = Math.floor(sender.x);
        const sth = terrain.current[Math.min(stx, terrain.current.length - 1)] ?? 0;
        drawSpeechBubble(ctx, sender.x, baseY + sth - 20, lastMsg.text);
      }
    }

    ctx.restore();

    // Horizon glow / fog of distance
    const horizGrad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 30);
    horizGrad.addColorStop(0, 'rgba(0,0,0,0)');
    horizGrad.addColorStop(0.5, palette.skyBottom + '40');
    horizGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = horizGrad;
    ctx.fillRect(0, baseY - 30, width, 60);

    animRef.current = requestAnimationFrame(draw);
  }, [planetType, posX, posY, direction, currentActivity, entity, nearbyEntities, chatHistory, timeOfDay, weather]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // World tick
  useEffect(() => {
    const interval = setInterval(() => {
      useEntityModeStore.getState().tick(1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-cover rounded-t-xl"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
