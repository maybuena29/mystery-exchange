import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { WheelEntry } from '../../types/exchange';
import { playTickSound, playVictoryFanfare } from '../../utils/wheelAudio';

interface WheelCanvasProps {
  entries: WheelEntry[];
  onSpinEnd: (winningEntry: WheelEntry) => void;
  isSpinning: boolean;
  targetEntryId?: string | null;
  disabled?: boolean;
  onSpinRequest?: () => void;
  isDarkMode?: boolean;
}

// Sophisticated festive Christmas palette
const CHRISTMAS_PALETTE = [
  '#244B36', // Deep Pine Green
  '#8A3333', // Crimson Berry
  '#B59458', // Champagne Gold
  '#1B3827', // Dark Forest
  '#702626', // Spiced Cranberry
  '#9E7B44', // Antique Gold
  '#2F5A42', // Spruce Green
  '#7C2C3D', // Holiday Plum
];

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  entries,
  onSpinEnd,
  isSpinning,
  targetEntryId,
  disabled,
  onSpinRequest,
  isDarkMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const activeEntries = entries.filter((e) => !e.excluded);

  const animFrameRef = useRef<number>(0);
  const rotationRef = useRef<number>(currentRotation);
  const lastPegIndexRef = useRef<number>(-1);
  const spinningRef = useRef<boolean>(false);

  // Draw wheel on fixed 800x800 coordinate system (scaled via responsive CSS)
  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 800;
      const center = 400;
      const radius = 368;

      ctx.clearRect(0, 0, size, size);

      if (activeEntries.length === 0) {
        // Empty state
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fillStyle = isDarkMode ? '#1E2822' : '#F1EFEA';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isDarkMode ? '#2D3B32' : '#E8E6DF';
        ctx.stroke();

        ctx.fillStyle = isDarkMode ? '#8E9C92' : '#777B76';
        ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('All eligible songs have been selected', center, center);
        ctx.restore();
        return;
      }

      const totalSlices = activeEntries.length;
      const sliceAngle = (Math.PI * 2) / totalSlices;

      // Outer metallic brass rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? '#16201A' : '#EDE8DF';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#B59458';
      ctx.stroke();
      ctx.restore();

      // Slices
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotation);

      for (let i = 0; i < totalSlices; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const color = CHRISTMAS_PALETTE[i % CHRISTMAS_PALETTE.length];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.stroke();

        // Slice Song Title text
        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';

        const fontSize = Math.max(14, Math.min(22, Math.floor(400 / Math.max(6, totalSlices))));
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 4;

        const entry = activeEntries[i];
        const maxTextWidth = radius - 75;

        let displayTitle = entry.songTitle;
        if (ctx.measureText(displayTitle).width > maxTextWidth) {
          while (ctx.measureText(displayTitle + '...').width > maxTextWidth && displayTitle.length > 3) {
            displayTitle = displayTitle.slice(0, -1);
          }
          displayTitle += '...';
        }

        const textRadius = radius - 32;
        ctx.fillText(displayTitle, textRadius, 0);

        // Optional artist text if space allows
        if (entry.artist && totalSlices <= 20) {
          ctx.font = `400 ${Math.max(11, fontSize - 5)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
          let displayArtist = entry.artist;
          if (ctx.measureText(displayArtist).width > maxTextWidth - 30) {
            while (ctx.measureText(displayArtist + '...').width > maxTextWidth - 30 && displayArtist.length > 2) {
              displayArtist = displayArtist.slice(0, -1);
            }
            displayArtist += '...';
          }
          ctx.fillText(displayArtist, textRadius, fontSize + 3);
        }

        ctx.restore();
      }

      // Metallic pegs on perimeter
      for (let i = 0; i < totalSlices; i++) {
        const pegAngle = i * sliceAngle;
        const px = Math.cos(pegAngle) * (radius - 5);
        const py = Math.sin(pegAngle) * (radius - 5);

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#B59458';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();

      // Center Hub (Brushed brass with deep pine green inlay)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, 44, 0, Math.PI * 2);
      ctx.fillStyle = '#CBB27E';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#244B36';
      ctx.fill();
      ctx.restore();

      // Top indicator pointer (pointing downward into the wheel at 12 o'clock)
      ctx.save();
      const pointerY = center - radius - 16;
      ctx.beginPath();
      ctx.moveTo(center - 18, pointerY);
      ctx.lineTo(center + 18, pointerY);
      ctx.lineTo(center, pointerY + 36);
      ctx.closePath();
      ctx.fillStyle = '#8A3333';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Pin screw
      ctx.beginPath();
      ctx.arc(center, pointerY + 7, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#CBB27E';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#5A1B1B';
      ctx.stroke();
      ctx.restore();
    },
    [activeEntries, isDarkMode]
  );

  // Redraw when entries or theme changes
  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  // Spin to target entry animation
  const startSpinAnimation = useCallback(
    (target: WheelEntry) => {
      if (spinningRef.current || activeEntries.length === 0) return;
      spinningRef.current = true;

      const targetIndex = activeEntries.findIndex((e) => e.id === target.id);
      if (targetIndex === -1) {
        spinningRef.current = false;
        return;
      }

      const totalSlices = activeEntries.length;
      const sliceAngle = (Math.PI * 2) / totalSlices;

      const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
      const pointerAngle = (3 * Math.PI) / 2;

      // Organic landing jitter within slice (+/- 25%)
      const jitter = (Math.random() - 0.5) * sliceAngle * 0.5;
      // 12 to 14 full rotations for a fast initial spin
      const fullRotations = (12 + Math.floor(Math.random() * 3)) * (Math.PI * 2);

      const startRotation = rotationRef.current;
      const currentMod = startRotation % (Math.PI * 2);
      let deltaAngle = (pointerAngle - targetSliceCenter - jitter) - currentMod;
      while (deltaAngle < 0) {
        deltaAngle += Math.PI * 2;
      }
      const targetRotation = startRotation + fullRotations + deltaAngle;

      const durationMs = 10000;
      const startTime = performance.now();

      // High-momentum ease-out curve: bursts fast at first, then dramatically slows down for suspense
      const easeOutFastToSlow = (t: number): number => 1 - Math.pow(1 - t, 4.2);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeOutFastToSlow(progress);

        const currentAngle = startRotation + (targetRotation - startRotation) * eased;
        rotationRef.current = currentAngle;
        setCurrentRotation(currentAngle);
        drawWheel(currentAngle);

        // Tick peg detection
        const pointerPos = pointerAngle - (currentAngle % (Math.PI * 2));
        const normalizedPos = ((pointerPos % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const currentPegIndex = Math.floor(normalizedPos / sliceAngle);

        if (currentPegIndex !== lastPegIndexRef.current) {
          lastPegIndexRef.current = currentPegIndex;
          const speedFactor = 1 - progress * 0.35;
          playTickSound(speedFactor);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          spinningRef.current = false;
          playVictoryFanfare();
          onSpinEnd(target);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [activeEntries, drawWheel, onSpinEnd]
  );

  // Trigger spin when targetEntryId is received
  useEffect(() => {
    if (targetEntryId && !spinningRef.current) {
      const target = activeEntries.find((e) => e.id === targetEntryId);
      if (target) {
        startSpinAnimation(target);
      }
    }
  }, [targetEntryId, activeEntries, startSpinAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center select-none" style={{ aspectRatio: '1 / 1' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        onClick={() => {
          if (!isSpinning && !disabled && onSpinRequest) {
            onSpinRequest();
          }
        }}
        className={`w-full h-full aspect-square block mx-auto touch-manipulation drop-shadow-md transition-transform ${
          !isSpinning && !disabled ? 'cursor-pointer hover:scale-[1.01]' : ''
        }`}
        style={{ aspectRatio: '1 / 1', width: '100%', height: '100%' }}
      />
    </div>
  );
};
