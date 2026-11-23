import React from 'react';
import { Link } from 'react-router-dom';
import type { WheelWinNotice } from '../../types/exchange';

interface WheelWinBannerProps {
  wins: WheelWinNotice[];
  groupId: string;
}

export const WheelWinBanner: React.FC<WheelWinBannerProps> = ({ wins, groupId }) => {
  if (!wins || wins.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#B79B62]/40 bg-[#B79B62]/10 p-5 sm:p-6 text-[#262A27] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A6232]">
            Celebration
          </p>
          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#262A27]">
            CONGRATULATIONS! YOU WON!
          </h2>
          <p className="text-sm text-[#777B76]">
            You have been selected in the Exchange Wheel of Songs!
          </p>
        </div>

        <div className="shrink-0">
          <Link
            to={`/wheel/${encodeURIComponent(groupId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#B79B62]/40 bg-white px-3.5 py-1.5 text-xs font-medium text-[#7A6232] hover:bg-[#B79B62]/10 hover:border-[#B79B62] transition-colors"
          >
            <span>Watch Live Wheel of Songs</span>
            <span>↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
