import React from 'react';

export interface DockWindowProps {
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  defaultPos?: { x: number; y: number; w: number; h: number };
}

export function DockWindow({ id, title, isOpen, onClose, children, defaultPos }: DockWindowProps) {
  if (!isOpen) return null;

  const pos = defaultPos || { x: 100, y: 100, w: 320, h: 420 };

  return (
    <div
      id={id}
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.w}px`, height: `${pos.h}px` }}
      className="absolute z-30 flex flex-col rounded-lg border border-space-700 bg-space-900/95 shadow-2xl backdrop-blur resize overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-space-700 bg-space-850 px-3 py-2 cursor-move select-none">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-space-200">
          {title}
        </span>
        <button
          onClick={onClose}
          className="text-space-400 hover:text-space-100 font-mono text-xs px-1 rounded hover:bg-space-700"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3 text-space-200 text-xs">
        {children}
      </div>
    </div>
  );
}
