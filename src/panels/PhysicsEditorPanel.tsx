import React from 'react';
import { useUiStore } from '@/state/useUiStore';
import { DockWindow } from '@/components/DockWindow';
import { useUniverseStore } from '@/state/useUniverseStore';
import { applyPhysicsOverrides, DEFAULT_PHYSICS } from '@/core/physics';

export function PhysicsEditorPanel() {
  const activeWindows = useUiStore((s) => s.activeWindows);
  const setWindowOpen = useUiStore((s) => s.setWindowOpen);
  const active = useUniverseStore((s) => s.active());

  const [constants, setConstants] = React.useState(DEFAULT_PHYSICS);

  const updateConst = (key: keyof typeof DEFAULT_PHYSICS, val: number) => {
    setConstants(prev => applyPhysicsOverrides({ ...prev, [key]: val }));
  };

  return (
    <DockWindow
      id="win_physics_editor"
      title="Universal Physics & Chemistry Lab"
      isOpen={activeWindows.physicsEditor}
      onClose={() => setWindowOpen('physicsEditor', false)}
      defaultPos={{ x: 350, y: 120, w: 400, h: 500 }}
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-space-200">
        <div className="text-[11px] text-space-400">
          Modify fundamental laws of physics in real time. Changes propagate deterministically across orbital mechanics, stellar evolution, and life chemistry.
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
            <span>Gravitational Constant (G)</span>
            <input
              type="number"
              step="1e-12"
              value={constants.G}
              onChange={(e) => updateConst('G', parseFloat(e.target.value))}
              className="bg-space-900 border border-space-700 px-2 py-1 rounded w-32 text-right text-accent-cyan"
            />
          </label>

          <label className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
            <span>Speed of Light (c)</span>
            <input
              type="number"
              value={constants.c}
              onChange={(e) => updateConst('c', parseFloat(e.target.value))}
              className="bg-space-900 border border-space-700 px-2 py-1 rounded w-32 text-right text-accent-cyan"
            />
          </label>

          <label className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
            <span>Cosmological Lambda (Λ)</span>
            <input
              type="number"
              step="1e-53"
              value={constants.lambda}
              onChange={(e) => updateConst('lambda', parseFloat(e.target.value))}
              className="bg-space-900 border border-space-700 px-2 py-1 rounded w-32 text-right text-accent-cyan"
            />
          </label>

          <label className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
            <span>EM Strength Scale</span>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={constants.emStrength}
              onChange={(e) => updateConst('emStrength', parseFloat(e.target.value))}
              className="w-32"
            />
          </label>

          <label className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
            <span>Atmosphere Density Scale</span>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={constants.atmosphereDensityScale}
              onChange={(e) => updateConst('atmosphereDensityScale', parseFloat(e.target.value))}
              className="w-32"
            />
          </label>
        </div>

        <button
          onClick={() => setConstants(DEFAULT_PHYSICS)}
          className="btn btn-primary mt-2"
        >
          Reset to Standard Universe Physics
        </button>
      </div>
    </DockWindow>
  );
}
