import type { Universe } from './types';
import { hashString } from './rng';
import { createId } from './ids';

export interface TimelineNode {
  id: string;
  universeId: string;
  parentIds: string[];
  branchLabel: string;
  divergenceSimTime: number;
  timelineSeed: number;
  createdAt: number;
  snapshotData?: any;
}

export interface TimelineDAG {
  nodes: Map<string, TimelineNode>;
  rootId: string;
  activeNodeId: string;
}

export interface TimelineDiff {
  timeDelta: number;
  seedDifference: boolean;
  divergenceDescription: string;
}

/**
 * Forks a universe into an alternate timeline branch while maintaining identical physical cosmos seed.
 */
export function forkTimeline(sourceUniverse: Universe, label?: string): { branch: Universe; node: TimelineNode } {
  const now = Date.now();
  const branchId = createId('branch');
  const newTimelineSeed = hashString(`${sourceUniverse.id}_${branchId}_${sourceUniverse.simTime}`);

  const branch: Universe = {
    ...sourceUniverse,
    id: createId('uni'),
    name: `${sourceUniverse.name} (Fork: ${label || 'Alt-Timeline'})`,
    timelineSeed: newTimelineSeed,
    createdAt: now,
    updatedAt: now,
  };

  const node: TimelineNode = {
    id: branchId,
    universeId: branch.id,
    parentIds: [sourceUniverse.id],
    branchLabel: label ?? `Fork at ${Math.floor(sourceUniverse.simTime)}s`,
    divergenceSimTime: sourceUniverse.simTime,
    timelineSeed: newTimelineSeed,
    createdAt: now,
  };

  return { branch, node };
}

/**
 * Merges two timeline branches into a combined timeline DAG node.
 */
export function mergeTimelines(nodeA: TimelineNode, nodeB: TimelineNode, label?: string): TimelineNode {
  const now = Date.now();
  const mergeId = createId('merge');
  const mergedSeed = hashString(`${nodeA.timelineSeed}_${nodeB.timelineSeed}_merge`);

  return {
    id: mergeId,
    universeId: nodeA.universeId,
    parentIds: [nodeA.id, nodeB.id],
    branchLabel: label || `Merge of ${nodeA.branchLabel} & ${nodeB.branchLabel}`,
    divergenceSimTime: Math.max(nodeA.divergenceSimTime, nodeB.divergenceSimTime),
    timelineSeed: mergedSeed,
    createdAt: now,
  };
}

/**
 * Computes difference between two timeline nodes.
 */
export function compareTimelines(nodeA: TimelineNode, nodeB: TimelineNode): TimelineDiff {
  return {
    timeDelta: Math.abs(nodeA.divergenceSimTime - nodeB.divergenceSimTime),
    seedDifference: nodeA.timelineSeed !== nodeB.timelineSeed,
    divergenceDescription: nodeA.timelineSeed !== nodeB.timelineSeed
      ? 'Divergent quantum timeline states'
      : 'Identical timeline trajectory',
  };
}
