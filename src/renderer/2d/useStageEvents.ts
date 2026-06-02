import { useCallback, useRef } from "react";
import type Konva from "konva";

interface StageHandlers {
  onMouseDown: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseUp: (x: number, y: number) => void;
}

// دو انگشت = pinch — رسم نکن
const isSingleTouch = (e: Konva.KonvaEventObject<TouchEvent>) => e.evt.touches.length === 1;

const getStagePos = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
  e.target.getStage()?.getPointerPosition() ?? null;

export const useStageEvents = ({ onMouseDown, onMouseMove, onMouseUp }: StageHandlers) => {
  const isPinching = useRef(false);

  // Mouse
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);
      if (pos) onMouseDown(pos.x, pos.y);
    },
    [onMouseDown],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);
      if (pos) onMouseMove(pos.x, pos.y);
    },
    [onMouseMove],
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getStagePos(e);
      if (pos) onMouseUp(pos.x, pos.y);
    },
    [onMouseUp],
  );

  // Touch
  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (!isSingleTouch(e)) {
        isPinching.current = true;
        return;
      }
      isPinching.current = false;
      e.evt.preventDefault();
      const pos = getStagePos(e);
      if (pos) onMouseDown(pos.x, pos.y);
    },
    [onMouseDown],
  );

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (isPinching.current || !isSingleTouch(e)) return;
      e.evt.preventDefault();
      const pos = getStagePos(e);
      if (pos) onMouseMove(pos.x, pos.y);
    },
    [onMouseMove],
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (isPinching.current) {
        isPinching.current = false;
        return;
      }
      e.evt.preventDefault();
      const pos = getStagePos(e);
      if (pos) onMouseUp(pos.x, pos.y);
    },
    [onMouseUp],
  );

  return {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
