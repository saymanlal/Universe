import { useEffect, useRef, useState } from 'react';

export function QuantumViewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [energyLevel, setEnergyLevel] = useState(50);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.4)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Wave function line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 5) {
        const amp = collapsed ? 5 : 30 * (energyLevel / 50);
        const y = canvas.height / 2 + Math.sin(x * 0.02 + time) * amp * Math.cos(x * 0.005);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Virtual particles
      const count = Math.floor((energyLevel / 100) * 40);
      for (let i = 0; i < count; i++) {
        const px = (Math.sin(i * 1.5 + time * 0.5) * 0.4 + 0.5) * canvas.width;
        const py = (Math.cos(i * 2.1 + time * 0.3) * 0.4 + 0.5) * canvas.height;

        ctx.fillStyle = i % 2 === 0 ? '#818cf8' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(px, py, collapsed ? 2 : 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [energyLevel, collapsed]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-space-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Quantum World Inspector</h1>
          <p className="text-sm text-space-400 mt-1">Planck-scale zero-point energy fluctuations and wave function telemetry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-space-900/60 border border-space-800 rounded-xl p-4 flex flex-col items-center">
          <canvas ref={canvasRef} width={650} height={350} className="w-full rounded-lg bg-space-950 border border-space-800" />
          <div className="flex items-center gap-4 mt-4 w-full px-4">
            <span className="text-xs text-space-400">Zero-Point Fluctuations:</span>
            <input
              type="range"
              min={10}
              max={100}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 text-xs px-3 py-1.5 rounded-lg transition"
            >
              {collapsed ? 'Decoherence' : 'Collapse Wave Function'}
            </button>
          </div>
        </div>

        <div className="bg-space-900/60 border border-space-800 rounded-xl p-6 space-y-4 text-xs font-mono">
          <h3 className="text-sm font-semibold text-white font-sans">Quantum State Parameters</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-space-500">Planck Length:</span> <span className="text-space-200">1.616 × 10⁻³⁵ m</span></div>
            <div className="flex justify-between"><span className="text-space-500">Vacuum Energy:</span> <span className="text-cyan-400">{(energyLevel * 1.2e-9).toExponential(2)} J/m³</span></div>
            <div className="flex justify-between"><span className="text-space-500">Coherence:</span> <span className={collapsed ? 'text-rose-400' : 'text-emerald-400'}>{collapsed ? 'Collapsed' : 'Superposition'}</span></div>
            <div className="flex justify-between"><span className="text-space-500">Active Particles:</span> <span className="text-white">{energyLevel} virtual pairs</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
