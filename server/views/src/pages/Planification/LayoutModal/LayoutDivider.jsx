import { useCallback, useRef, useState } from 'react';

export default function LayoutDivider({ parentPath, divIdx, isVertical, parentNode, onDragEnd }) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ pos: 0, flexA: 0, flexB: 0, totalSize: 0, totalFlex: 0 });
  const divRef = useRef(null);

  const children = parentNode.children;
  const isRow = !isVertical;

  const getAdjacentElements = () => {
    const el = divRef.current;
    if (!el) return { prev: null, next: null, container: null };
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;
    const container = el.parentElement;
    return { prev, next, container };
  };

  const onMove = useCallback((clientPos) => {
    const { prev, next } = getAdjacentElements();
    if (!prev || !next) return;

    const { pos, flexA, flexB, totalSize, totalFlex } = startRef.current;
    if (totalSize === 0) return;

    const delta = clientPos - pos;
    const flexDelta = (delta / totalSize) * totalFlex;
    const newFlexA = Math.max(0.3, Math.round((flexA + flexDelta) * 10) / 10);
    const newFlexB = Math.max(0.3, Math.round((flexB - flexDelta) * 10) / 10);

    prev.style.flex = String(newFlexA);
    next.style.flex = String(newFlexB);
  }, []);

  const onEnd = useCallback(() => {
    setDragging(false);
    const { prev, next } = getAdjacentElements();
    const flexA = parseFloat(prev?.style.flex || String(children[divIdx].flex));
    const flexB = parseFloat(next?.style.flex || String(children[divIdx + 1].flex));
    onDragEnd(parentPath, divIdx, flexA, flexB);
  }, [parentPath, divIdx, children, onDragEnd]);

  const handleMouseMove = useCallback((e) => {
    onMove(isRow ? e.clientX : e.clientY);
  }, [onMove, isRow]);

  const handleTouchMove = useCallback((e) => {
    onMove(isRow ? e.touches[0].clientX : e.touches[0].clientY);
  }, [onMove, isRow]);

  const cleanup = useCallback(() => {
    onEnd();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', cleanup);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', cleanup);
  }, [onEnd, handleMouseMove, handleTouchMove]);

  const startDrag = (pos) => {
    const { container } = getAdjacentElements();
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const totalSize = isRow ? rect.width : rect.height;
    const totalFlex = children.reduce((s, c) => s + c.flex, 0);

    setDragging(true);
    startRef.current = {
      pos,
      flexA: children[divIdx].flex,
      flexB: children[divIdx + 1].flex,
      totalSize,
      totalFlex,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', cleanup);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', cleanup);
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    startDrag(isRow ? e.clientX : e.clientY);
  };

  const onTouchStart = (e) => {
    e.preventDefault();
    startDrag(isRow ? e.touches[0].clientX : e.touches[0].clientY);
  };

  return (
    <div
      ref={divRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`shrink-0 z-[2] transition-colors ${
        isVertical
          ? 'h-1.5 cursor-row-resize'
          : 'w-1.5 cursor-col-resize'
      } ${dragging ? 'bg-accent' : 'bg-border hover:bg-accent'}`}
    />
  );
}
