import type { Universe } from './types';
import { hashString } from './rng';
import { createId } from './ids';

export interface TimelineBranch {
  branchId: string;
  sourceUniverseId: string;
  divergencePointSimTime: number;
  newTimelineSeed: number;
  label: string;
}

/**
 * Forks a universe into an alternate timeline branch while maintaining identical physical cosmos seed.
 */
export function forkTimeline(sourceUniverse: Universe, label?: string): { branch: Universe; branchMetadata: TimelineBranch } {
  const now = Date.now();
  const branchId = createId('branch');
  const newTimelineSeed = hashString(`${sourceUniverse.id}_${branchId}_${sourceUniverse.simTime}`);

  const branch: Universe = {
    ...sourceUniverse,
    id: createId('uni'),
    name: `${sourceUniverse.name} (Timeline Fork)`,
    timelineSeed: newTimelineSeed,
    createdAt: now,
    updatedAt: now,
  };

  const branchMetadata: TimelineBranch = {
    branchId,
    sourceUniverseId: sourceUniverse.id,
    divergencePointSimTime: sourceUniverse.simTime,
    newTimelineSeed,
    label: label ?? `Fork at Year ${Math.floor(sourceUniverse.simTime / 31557600)}`,
  };

  return { branch, branchMetadata };
}
