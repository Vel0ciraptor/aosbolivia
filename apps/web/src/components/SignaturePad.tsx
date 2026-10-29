'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface SignaturePadHandle {
  toDataURL: () => string | undefined;
  clear: () => void;
}

interface SignaturePadProps {
  /** Ancho del canvas (píxeles internos). Por defecto 600. */
  width?: number;
  /** Alto del canvas (píxeles internos). Por defecto 300. */
  height?: number;
  /** Clases extra para el canvas (ej: altura responsive). */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lienzo de firma multiplataforma: mouse, dedo (táctil) y lápiz.
 * - Usa Pointer Events + pointer capture en navegadores modernos.
 * - Fallback táctil/ratón con listeners nativos (no pasivos) para
 *   WebViews antiguos que no soportan Pointer Events.
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ width = 600, height = 300, className = '', style }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);

    const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

    const getCoords = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
      };
    };

    const startStroke = (clientX: number, clientY: number) => {
      const ctx = getCtx();
      const coords = getCoords(clientX, clientY);
      if (!ctx || !coords) return;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      // Punto inicial para que un toque simple deje marca
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      isDrawingRef.current = true;
    };

    const moveStroke = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const ctx = getCtx();
      const coords = getCoords(clientX, clientY);
      if (!ctx || !coords) return;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    };

    const endStroke = () => {
      isDrawingRef.current = false;
    };

    useImperativeHandle(ref, () => ({
      toDataURL: () => canvasRef.current?.toDataURL('image/png'),
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }));

    // ── Fallback para navegadores sin Pointer Events (WebView antiguo) ──
    const supportsPointer =
      typeof window !== 'undefined' && 'PointerEvent' in window;

    useEffect(() => {
      if (supportsPointer) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) startStroke(t.clientX, t.clientY);
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) moveStroke(t.clientX, t.clientY);
      };
      const onMouseDown = (e: MouseEvent) => startStroke(e.clientX, e.clientY);
      const onMouseMove = (e: MouseEvent) => {
        if (e.buttons === 1) moveStroke(e.clientX, e.clientY);
      };

      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', endStroke);
      canvas.addEventListener('touchcancel', endStroke);
      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', endStroke);

      return () => {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', endStroke);
        canvas.removeEventListener('touchcancel', endStroke);
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', endStroke);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full rounded-lg cursor-crosshair touch-none select-none ${className}`}
        style={{ touchAction: 'none', ...style }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault();
          const canvas = canvasRef.current;
          if (!canvas) return;
          // Algunos WebViews móviles lanzan aquí; no debe romper el trazo
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            /* ignorar */
          }
          startStroke(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => moveStroke(e.clientX, e.clientY)}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onLostPointerCapture={endStroke}
      />
    );
  },
);

export default SignaturePad;
