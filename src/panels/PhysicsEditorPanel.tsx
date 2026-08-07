import { applyPhysicsOverrides, DEFAULT_PHYSICS } from '@/core/physics';
import { useState } from 'react';
import { useUiStore } from '@/state/useUiStore';
import { DockWindow } from '@/components/DockWindow';

export function PhysicsEditorPanel() {
  const activeWindows = useUiStore((s) => s.activeWindows);
  const setWindowOpen = useUiStore((s) => s.setWindowOpen);
  const [constants, setConstants] = useState(DEFAULT_PHYSICS);

  const updateConst = (key: keyof typeof DEFAULT_PHYSICS, val: number) => {
    setConstants(prev => applyPhysicsOverrides({ ...prev, [key]: val }));
  };

  return (
    <DockWindow
      id="win_physics_editor"
      title="Universal Physics & Chemistry Lab"
      isOpen={activeWindows.physicsEditor}
      onClose={() => setWindowOpen('physicsEditor', false)}
      defaultPos={{ x: 350, y: 120, w: 400, h: 520 }}
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-space-200">
        <div className="text-[11px] text-space-400">
          Modify fundamental laws of this universe in real time. Changes propagate to orbital mechanics, stellar evolution, and life chemistry.
        </div>

        <div className="flex flex-col gap-2">
          {([
            ['Gravitational Constant G', 'G', 'number', 1e-12],
            ['Speed of Light c', 'c', 'number', 1e6],
            ['Cosmological Λ', 'lambda', 'number', 1e-54],
          ] as [string, keyof typeof DEFAULT_PHYSICS, string, number][]).map(([label, key, , step]) => (
            <label key={key} className="flex justify-between items-center bg-space-850 p-2 rounded border border-space-700">
              <span>{label}</span>
              <input
                type="number"
                step={step}
                value={constants[key] as number}
                onChange={(e) => updateConst(key, parseFloat(e.target.value))}
                className="bg-space-900 border border-space-700 px-2 py-1 rounded w-36 text-right text-accent-cyan"
              />
            </label>
          ))}

          {([
            ['EM Strength Scale', 'emStrength'],
            ['Atmosphere Density Scale', 'atmosphereDensityScale'],
            ['Nuclear Force Scale', 'nuclearScale'],
          ] as [string, keyof typeof DEFAULT_PHYSICS][]).map(([label, key]) => (
            <label key={key} className="flex flex-col gap-1 bg-space-850 p-2 rounded border border-space-700">
              <div className="flex justify-between">
                <span>{label}</span>
                <span className="text-accent-cyan">{(constants[key] as number).toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={constants[key] as number}
                onChange={(e) => updateConst(key, parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
            </label>
          ))}
        </div>

        <button
          onClick={() => setConstants(DEFAULT_PHYSICS)}
          className="btn btn-primary mt-1"
        >
          Reset to Standard Universe Physics
        </button>
      </div>
    </DockWindow>
  );
}
