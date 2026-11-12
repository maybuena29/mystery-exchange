import { Music } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({
  title = 'Loading...',
  subtitle = 'Just a moment while we set things up',
}: LoadingScreenProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center animate-fade-up">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        {/* Soft pulsing ambient halo */}
        <div className="absolute inset-0 rounded-full bg-[#315B46]/10 animate-ping" />
        {/* Spinning evergreen decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-t-[#315B46] border-r-[#B79B62] border-b-transparent border-l-transparent animate-spin" />
        {/* Centered music disc badge */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#E8E6DF] bg-white shadow-xs">
          <Music className="h-5 w-5 text-[#315B46] animate-pulse" />
        </div>
      </div>

      <h3 className="font-editorial text-xl font-semibold text-[#262A27]">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1.5 max-w-sm text-xs text-[#777B76]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
