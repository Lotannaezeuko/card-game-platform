import { useEffect, useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import BoardCard from './BoardCard';

export default function GameBoard({ boardCards, isHost, onClearBoard, scale, onScaleChange, className = '' }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'game-board' });

  // Keep a stable ref to the canvas element so event listeners can be attached
  const canvasRef = useRef(null);

  // Ref for current scale — avoids stale closures in event handlers
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Merge useDroppable's setNodeRef with our canvasRef
  const setRefs = useCallback((el) => {
    setNodeRef(el);
    canvasRef.current = el;
  }, [setNodeRef]);

  // Wheel + pinch-to-zoom on the canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    let lastDist = null;

    const clamp = (v) => Math.min(2, Math.max(0.5, v));

    const handleWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      onScaleChange(clamp(+(scaleRef.current * factor).toFixed(4)));
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      } else {
        lastDist = null;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && lastDist !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const ratio = dist / lastDist;
        onScaleChange(clamp(+(scaleRef.current * ratio).toFixed(4)));
        lastDist = dist;
      }
    };

    const handleTouchEnd = () => { lastDist = null; };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onScaleChange]);

  return (
    <div className={`relative flex flex-col border-r border-slate-700 ${className}`}>

      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-1.5 py-0.5 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onScaleChange(Math.max(0.5, +(scale - 0.25).toFixed(2)))}
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center"
          >
            −
          </button>
          <span className="text-xs text-slate-400 w-9 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => onScaleChange(Math.min(2, +(scale + 0.25).toFixed(2)))}
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
        <span className="text-xs text-slate-600 font-medium">Board</span>
        {isHost && boardCards.length > 0 ? (
          <button
            onClick={onClearBoard}
            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5"
          >
            Clear
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Droppable canvas */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={setRefs}
          className={`absolute inset-0 transition-colors ${isOver ? 'bg-indigo-900/20' : ''}`}
        >
          {boardCards.length === 0 && !isOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs text-slate-600">Drag cards here</p>
            </div>
          )}
          {/* Scaled inner canvas */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${(100 / scale).toFixed(4)}%`,
              height: `${(100 / scale).toFixed(4)}%`,
              position: 'relative',
            }}
          >
            {boardCards.map((card) => (
              <BoardCard key={card.hand_id} card={card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
