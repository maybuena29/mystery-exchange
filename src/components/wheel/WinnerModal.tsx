import React, { useEffect } from 'react';
import type { WheelWinnerRecord } from '../../types/exchange';
import { triggerConfetti } from '../../utils/confetti';

interface WinnerModalProps {
  winner: WheelWinnerRecord | null;
  groupName: string;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  groupName,
  onClose,
  isDarkMode = false,
}) => {
  useEffect(() => {
    if (winner) {
      const stopConfetti = triggerConfetti(3500);
      return () => stopConfetti();
    }
  }, [winner]);

  if (!winner) return null;

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 text-center shadow-xl border animate-in zoom-in-95 duration-200 ${
          isDarkMode
            ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
            : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Seasonal Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#B79B62]/40 bg-[#B79B62]/10 text-[#7A6232] text-xs font-semibold uppercase tracking-[0.14em] mb-4">
          <span>{getOrdinal(winner.order)} Winner</span>
        </div>

        {/* Song Title & Artist */}
        <div className="space-y-1 mb-6">
          <p className="text-xs uppercase tracking-wider text-[#777B76] font-medium">
            Winning Song
          </p>
          <h2
            className={`font-editorial text-2xl sm:text-3xl font-semibold break-words ${
              isDarkMode ? 'text-white' : 'text-[#262A27]'
            }`}
          >
            &ldquo;{winner.songTitle}&rdquo;
          </h2>
          {winner.artist && (
            <p className="text-sm text-[#777B76]">
              by <span className="font-medium text-inherit">{winner.artist}</span>
            </p>
          )}
        </div>

        {/* Participant Reference Card */}
        <div
          className={`rounded-2xl border p-4 text-left space-y-3 mb-6 ${
            isDarkMode
              ? 'bg-[#1E2C23] border-[#2D3E32]'
              : 'bg-white border-[#E8E6DF]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 text-xs border-inherit">
            <span className="text-[#777B76] font-medium">Participant Slot</span>
            <span className="font-semibold text-[#315B46]">
              {winner.slotNumber ? `Participant #${winner.slotNumber}` : 'Custom Entry'}
            </span>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between text-[#777B76]">
              <span>Exchange</span>
              <span className="font-medium text-inherit truncate max-w-[180px]">{groupName}</span>
            </div>
          </div>

          {/* Wishlist ideas if available */}
          {winner.wishlistSummary && winner.wishlistSummary.length > 0 && (
            <div className="pt-2 border-t border-inherit">
              <p className="text-[11px] font-medium text-[#777B76] mb-1.5">
                Participant's Wishlist Items ({winner.wishlistSummary.length})
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                {winner.wishlistSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                      isDarkMode
                        ? 'bg-[#16201A] border-[#28372C] text-[#D8D5CE]'
                        : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                    }`}
                  >
                    <span className="truncate mr-2">• {item.name}</span>
                    {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                      <span className="font-medium text-[#B79B62] shrink-0">
                        ${item.estimatedPrice}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-6 rounded-full bg-[#315B46] hover:bg-[#274938] text-white text-sm font-medium transition-colors cursor-pointer shadow-xs"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
