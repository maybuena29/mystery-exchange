import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

interface CopyShareActionsProps {
  url: string;
  shareTitle?: string;
  shareText?: string;
  copyLabel?: string;
  compact?: boolean;
}

export function CopyShareActions({
  url,
  shareTitle = 'HulaWho',
  shareText = 'Join our anonymous song-based gift exchange!',
  copyLabel = 'Copy Link',
  compact = false,
}: CopyShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed; fall back to copy
      }
    }
    await handleCopy();
  };

  const btnPadding = compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white font-medium text-[#262A27] transition-colors hover:border-[#315B46] hover:text-[#315B46] ${btnPadding}`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-[#315B46]" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 text-[#777B76]" />
            <span>{copyLabel}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center gap-2 rounded-full border border-[#315B46]/25 bg-[#315B46]/5 font-medium text-[#315B46] transition-colors hover:bg-[#315B46]/10 ${btnPadding}`}
      >
        <Share2 className="h-4 w-4" />
        <span>Share Link</span>
      </button>
    </div>
  );
}
