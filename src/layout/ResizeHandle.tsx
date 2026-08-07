import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  /** Current width in px. */
  width: number;
  /** Which side the dock is on — determines drag direction. */
  side: 'left' | 'right';
  onResize: (width: number) => void;
}

/**
 * A thin vertical drag handle used to resize the side docks. Pointer capture
 * keeps the drag smooth even if the cursor leaves the element.
 */
export function ResizeHandle({ width, side, onResize }: ResizeHandleProps) {
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const dx = e.clientX - startX.current;
      const delta = side === 'left' ? dx : -dx;
      onResize(startW.current + delta);
    },
    [side, onResize],
  );

  const onPointerUp = useCallback(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startW.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [width, onPointerMove, onPointerUp],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="group relative w-1 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-space-700 transition-colors group-hover:bg-accent/60" />
    </div>
  );
}
