import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Music,
  Users,
} from 'lucide-react';
import { CopyShareActions } from '../components/common/CopyShareActions';
import { StatusBadge } from '../components/common/StatusBadge';
import { WishlistEditor } from '../components/wishlist/WishlistEditor';
import { groupService, participantService } from '../services/api';
import { buildParticipantUrl } from '../services/credentialService';
import type {
  JoinGroupResponse,
  ParticipantPreferences,
  PublicGroupInfo,
  WishlistItem,
} from '../types/exchange';
import { formatBudget, formatDate } from '../utils/format';

export function JoinGroupPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();

  const [manualCode, setManualCode] = useState('');
  const [group, setGroup] = useState<PublicGroupInfo | null>(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [preferences, setPreferences] = useState<ParticipantPreferences>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [joined, setJoined] = useState<JoinGroupResponse | null>(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    groupService
      .getPublicGroup(groupId)
      .then((info) => {
        if (!cancelled) setGroup(info);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Exchange not found.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handleCodeLookup = (e: FormEvent) => {
    e.preventDefault();
    const raw = manualCode.trim();
    if (!raw) return;

    // Support pasting either a full /join/:groupId URL or just the groupId
    const match = raw.match(/\/join\/([^/?#]+)/i);
    const extracted = match ? match[1] : raw;
    navigate(`/join/${encodeURIComponent(extracted)}`);
  };

  const handleJoinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setSubmitError(null);

    if (!songTitle.trim()) {
      setSubmitError('Please enter a song title as your anonymous identity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await participantService.joinGroup({
        groupId: group.groupId,
        songTitle: songTitle.trim(),
        artist: artist.trim() || undefined,
        recoveryPhrase: recoveryPhrase.trim() || undefined,
        wishlist: wishlist.map(({ id: _id, order: _order, ...rest }) => rest),
        preferences,
      });
      setJoined(res);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not join exchange.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!groupId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
              Join Exchange
            </p>
            <h1 className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
              Enter your invitation link or code
            </h1>
            <p className="mt-2 text-sm text-[#777B76]">
              Paste the invitation URL or group ID shared by your organizer.
            </p>
          </div>

          <form onSubmit={handleCodeLookup} className="space-y-4">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste invitation link or group ID..."
              className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-3 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
            >
              Continue to Exchange
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-[#777B76]">
        Loading exchange details...
      </div>
    );
  }

  if (loadError || !group) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 space-y-4">
          <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
            Exchange not found
          </h1>
          <p className="text-sm text-[#777B76]">{loadError ?? 'Invalid invitation link.'}</p>
          <Link
            to="/join"
            className="inline-flex rounded-full border border-[#E8E6DF] px-5 py-2.5 text-sm font-medium text-[#262A27] hover:border-[#315B46]"
          >
            Try another code
          </Link>
        </div>
      </div>
    );
  }

  if (joined) {
    const privateUrl = buildParticipantUrl(joined.privateToken, false);

    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-10 space-y-7">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
                Submission Confirmed
              </p>
              <h1 className="mt-1 font-editorial text-3xl font-semibold text-[#262A27]">
                You&apos;re officially part of the mystery!
              </h1>
              <p className="mt-2 text-sm text-[#777B76]">
                Your anonymous song identity is{' '}
                <strong className="text-[#262A27]">
                  &ldquo;{joined.session.songTitle}&rdquo;
                </strong>
                {joined.session.artist ? ` by ${joined.session.artist}` : ''}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#B79B62]/40 bg-[#B79B62]/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#262A27]">
              <Lock className="h-4 w-4 text-[#B79B62]" />
              Your Private Access Link — Keep This Safe!
            </div>
            <p className="text-xs leading-relaxed text-[#777B76]">
              Save or bookmark this link right now. We do not collect emails or phone numbers, so
              this link is the <strong>only way</strong> to edit your wishlist and reveal your
              mystery match after the draw.
            </p>
            <p className="break-all rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 font-mono text-xs text-[#262A27]">
              {privateUrl}
            </p>
            <CopyShareActions
              url={privateUrl}
              shareTitle="My HulaWho Private Link"
              shareText="Save this private link to view your HulaWho match:"
              copyLabel="Copy Private Link"
            />
          </div>

          <div className="flex justify-end">
            <Link
              to={`/participant/${encodeURIComponent(joined.privateToken)}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
            >
              Open My Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-8">
      {/* Group Info Header */}
      <div className="rounded-3xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
              {group.category}
            </p>
            <h1 className="mt-1 font-editorial text-3xl font-semibold text-[#262A27]">
              {group.groupName}
            </h1>
          </div>
          <StatusBadge status={group.status} />
        </div>

        {group.description && (
          <p className="text-sm leading-relaxed text-[#777B76]">{group.description}</p>
        )}

        <div className="grid gap-3 border-t border-[#E8E6DF] pt-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-[#777B76]">
            <Calendar className="h-4 w-4 text-[#315B46]" />
            <span>Date: {formatDate(group.eventDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#777B76]">
            <Gift className="h-4 w-4 text-[#874B4B]" />
            <span>Budget: {formatBudget(group.budget)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#777B76]">
            <Users className="h-4 w-4 text-[#B79B62]" />
            <span>
              Joined: {group.participantCount} / {group.settings.maxParticipants}
            </span>
          </div>
        </div>

        {group.instructions && (
          <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-4 text-sm text-[#262A27]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76] mb-1.5">
              Organizer Instructions
            </p>
            <div className="whitespace-pre-line leading-relaxed">
              {group.instructions}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            to={`/recover/${encodeURIComponent(group.groupId)}`}
            className="text-xs font-medium text-[#315B46] hover:underline"
          >
            Already joined and lost your private link? Recover it here →
          </Link>
        </div>
      </div>

      {!group.isOpenForJoining ? (
        <div className="rounded-2xl border border-[#874B4B]/30 bg-white p-8 text-center space-y-2">
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
            Registration is currently closed
          </h2>
          <p className="text-sm text-[#777B76]">
            This exchange is no longer accepting new participants. If you already joined, reopen
            your saved private access link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleJoinSubmit} className="space-y-8">
          {submitError && (
            <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
              {submitError}
            </div>
          )}

          {/* A. Anonymous Song */}
          <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <Music className="h-5 w-5 text-[#874B4B]" />
              <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
                Choose Your Anonymous Song
              </h2>
            </div>
            <p className="text-sm text-[#777B76]">
              Your song title becomes your anonymous identity for this exchange. Do not enter your
              real name or contact details.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                  Song Title <span className="text-[#874B4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="e.g., Goodness of God"
                  maxLength={140}
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                  Artist (optional)
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g., CeCe Winans"
                  maxLength={120}
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                  Secret Recovery Phrase or PIN (optional, min 4 chars)
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryPhrase ? 'text' : 'password'}
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="e.g., a memorable word or PIN in case you lose your private link"
                    maxLength={120}
                    className="w-full rounded-xl border border-[#E8E6DF] bg-white py-2.5 pl-4 pr-11 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPhrase((prev) => !prev)}
                    aria-label={showRecoveryPhrase ? 'Hide recovery phrase' : 'Show recovery phrase'}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[#777B76] hover:text-[#262A27]"
                  >
                    {showRecoveryPhrase ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#777B76]">
                  Used only for self-service link recovery. Neither the organizer nor other
                  participants can see this.
                </p>
              </div>
            </div>
          </section>

          {/* B. Wishlist */}
          <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8">
            <WishlistEditor
              items={wishlist}
              preferences={preferences}
              maxItems={group.settings.maxWishlistItems}
              currency={group.budget.currency}
              onChangeItems={setWishlist}
              onChangePreferences={setPreferences}
            />
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#274938] disabled:opacity-50"
            >
              {submitting ? 'Joining Exchange...' : 'Join Exchange'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
