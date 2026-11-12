import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  Music,
  RefreshCw,
  Save,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { WishlistEditor } from '../components/wishlist/WishlistEditor';
import { participantService } from '../services/api';
import type {
  ParticipantPreferences,
  ParticipantSessionView,
  WishlistItem,
} from '../types/exchange';
import { formatBudget, formatDate } from '../utils/format';

export function ParticipantDashboard() {
  const { privateToken = '' } = useParams<{ privateToken: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ParticipantSessionView | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [preferences, setPreferences] = useState<ParticipantPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await participantService.getSession(privateToken);
      if (data.group.status === 'DRAWN' || data.group.status === 'COMPLETED') {
        navigate(`/result/${encodeURIComponent(privateToken)}`, { replace: true });
        return;
      }
      setSession(data);
      setWishlist(data.wishlist);
      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSession();
  }, [privateToken]);

  const handleSaveWishlist = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const updated = await participantService.updateWishlist(
        privateToken,
        wishlist,
        preferences
      );
      setWishlist(updated.wishlist);
      setPreferences(updated.preferences);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              wishlist: updated.wishlist,
              preferences: updated.preferences,
              wishlistCompleted: updated.wishlistCompleted,
            }
          : prev
      );
      setSaveMessage('Your wishlist has been saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save wishlist.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-[#777B76]">
        Loading your participant dashboard...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 space-y-3">
          <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
            Private link not found
          </h1>
          <p className="text-sm text-[#874B4B]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
              Participant Dashboard
            </p>
            <h1 className="mt-1 font-editorial text-3xl font-semibold text-[#262A27]">
              {session.group.groupName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={session.group.status} />
            <button
              type="button"
              onClick={() => void fetchSession()}
              className="inline-flex items-center gap-1 rounded-full border border-[#E8E6DF] px-3 py-1 text-xs text-[#262A27] hover:border-[#315B46]"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[#E8E6DF] pt-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-[#777B76]">
            <Gift className="h-4 w-4 text-[#874B4B]" />
            <span>Budget: {formatBudget(session.group.budget)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#777B76]">
            <Calendar className="h-4 w-4 text-[#315B46]" />
            <span>Date: {formatDate(session.group.eventDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#777B76]">
            <CheckCircle2 className="h-4 w-4 text-[#315B46]" />
            <span>
              Wishlist: {session.wishlistCompleted ? 'Completed' : 'Optional / Empty'}
            </span>
          </div>
        </div>

        {/* Waiting Banner */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#E8E6DF] bg-[#F8F7F3] p-4">
          <Clock className="h-5 w-5 shrink-0 text-[#B79B62]" />
          <div className="text-sm">
            <p className="font-medium text-[#262A27]">Waiting for the exchange to begin.</p>
            <p className="text-xs text-[#777B76]">
              Reopen this private link after your organizer starts the draw to reveal your mystery
              match.
            </p>
          </div>
        </div>
      </div>

      {/* Locked Song Identity */}
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#874B4B]/10 text-[#874B4B]">
            <Music className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
              Your Anonymous Song Identity (Locked)
            </p>
            <p className="font-editorial text-xl font-semibold text-[#262A27]">
              &ldquo;{session.songTitle}&rdquo;
              {session.artist ? ` — ${session.artist}` : ''}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#E8E6DF] bg-[#F8F7F3] px-3 py-1 text-xs text-[#777B76]">
          Submission Confirmed
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
          {error}
        </div>
      )}
      {saveMessage && (
        <div className="rounded-xl border border-[#315B46]/30 bg-[#315B46]/10 px-4 py-3 text-sm text-[#315B46]">
          {saveMessage}
        </div>
      )}

      {/* Wishlist Editor */}
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-6">
        <WishlistEditor
          items={wishlist}
          preferences={preferences}
          maxItems={session.group.settings.maxWishlistItems}
          currency={session.group.budget.currency}
          disabled={!session.canEditWishlist}
          onChangeItems={setWishlist}
          onChangePreferences={setPreferences}
        />

        {session.canEditWishlist ? (
          <div className="flex justify-end border-t border-[#E8E6DF] pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveWishlist()}
              className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#274938] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Wishlist Changes'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#777B76]">
            Wishlist editing is currently locked by the organizer.
          </p>
        )}
      </div>
    </div>
  );
}
