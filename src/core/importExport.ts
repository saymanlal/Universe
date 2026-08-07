/**
 * Universe Import/Export — browser-native, backend-free.
 * Universes are exported as compressed JSON blobs (.universe files).
 * Compression uses CompressionStream API (available in all modern browsers).
 */
import type { Universe } from '@/core/types';
import { db } from '@/db/database';
import type { Snapshot } from '@/db/database';

export interface ExportBundle {
  version: 2;
  exportedAt: number;
  universe: Universe;
  snapshots: Snapshot[];
}

/** Compress a string using CompressionStream (deflate-raw). */
async function compress(text: string): Promise<ArrayBuffer> {
  const blob = new Blob([text]);
  const compressed = blob.stream().pipeThrough(new CompressionStream('deflate-raw'));
  const response = new Response(compressed);
  return response.arrayBuffer();
}

/** Decompress bytes using DecompressionStream (deflate-raw). */
async function decompress(bytes: ArrayBuffer): Promise<string> {
  const blob = new Blob([bytes]);
  const decompressed = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const response = new Response(decompressed);
  const arrayBuffer = await response.arrayBuffer();
  return new TextDecoder().decode(arrayBuffer);
}

/** Triggers a browser file download. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export a universe + its snapshots as a compressed .universe file.
 * Triggers a browser file download.
 */
export async function exportUniverse(universeId: string): Promise<void> {
  const universe = await db.universes.get(universeId);
  if (!universe) throw new Error('Universe not found');
  
  const snapshots = await db.snapshots.where('universeId').equals(universeId).toArray();
  
  const bundle: ExportBundle = {
    version: 2,
    exportedAt: Date.now(),
    universe,
    snapshots
  };
  
  const json = JSON.stringify(bundle);
  const compressed = await compress(json);
  const blob = new Blob([compressed], { type: 'application/octet-stream' });
  downloadBlob(blob, `${universe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.universe`);
}

/**
 * Import a .universe file from the user's file system.
 * Returns the imported universe record.
 */
export async function importUniverse(file: File): Promise<Universe> {
  const arrayBuffer = await file.arrayBuffer();
  // Pass the ArrayBuffer directly — avoids the Uint8Array<ArrayBufferLike> issue.
  const json = await decompress(arrayBuffer);
  
  // Try parsing as single or multiple bundles
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid file format');
  }
  
  if (Array.isArray(data)) {
    // If it's a multiple export, import the first one and the rest
    const bundles = data as ExportBundle[];
    for (const bundle of bundles) {
      if (bundle.version !== 2) throw new Error('Unsupported version');
      await db.universes.put(bundle.universe);
      if (bundle.snapshots && bundle.snapshots.length > 0) {
        await db.snapshots.bulkPut(bundle.snapshots);
      }
    }
    if (bundles.length > 0) {
      return bundles[0].universe;
    }
    throw new Error('Empty file');
  } else {
    const bundle = data as ExportBundle;
    if (bundle.version !== 2) throw new Error('Unsupported version');
    
    await db.universes.put(bundle.universe);
    if (bundle.snapshots && bundle.snapshots.length > 0) {
      await db.snapshots.bulkPut(bundle.snapshots);
    }
    
    return bundle.universe;
  }
}

/**
 * Export all universes as a single compressed .universes bundle.
 */
export async function exportAllUniverses(): Promise<void> {
  const universes = await db.universes.toArray();
  const snapshots = await db.snapshots.toArray();
  
  const bundles: ExportBundle[] = universes.map(universe => {
    return {
      version: 2,
      exportedAt: Date.now(),
      universe,
      snapshots: snapshots.filter(s => s.universeId === universe.id)
    };
  });
  
  const json = JSON.stringify(bundles);
  const compressed = await compress(json);
  const blob = new Blob([compressed], { type: 'application/octet-stream' });
  downloadBlob(blob, 'backup.universes');
}
