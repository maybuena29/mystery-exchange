import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ExternalLink,
  Gift,
  Lock,
  Music,
  Save,
  Sparkles,
} from 'lucide-react';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { WishlistEditor } from '../components/wishlist/WishlistEditor';
import { participantService } from '../services/api';
import type {
  GiftChecklist,
  ParticipantPreferences,
  ParticipantSessionView,
  WishlistItem,
} from '../types/exchange';
import { formatBudget, formatCurrency, formatDate } from '../utils/format';

const CHECKLIST_ITEMS: { key: keyof GiftChecklist; label: string }[] = [
  { key: 'reviewedWishlist', label: 'Review wishlist' },
  { key: 'choseGift', label: 'Choose a gift' },
  { key: 'purchasedGift', label: 'Purchase gift' },
  { key: 'wrappedGift', label: 'Prepare gift wrapping' },
  { key: 'readyToBring', label: 'Bring gift to exchange' },
];

export function ResultPage() {
  const { privateToken = '' } = useParams<{ privateToken: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<ParticipantSessionView | null>(null);
  const [activeTab, setActiveTab] = useState<'match' | 'my-wishlist'>(
    searchParams.get('tab') === 'my-wishlist' ? 'my-wishlist' : 'match'
  );

  // Recipient checklist & notes
  const [checklist, setChecklist] = useState<GiftChecklist>({
    reviewedWishlist: false,
    choseGift: false,
    purchasedGift: false,
    wrappedGift: false,
    readyToBring: false,
  });
  const [privateNotes, setPrivateNotes] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressSavedMsg, setProgressSavedMsg] = useState<string | null>(null);

  // Participant's own wishlist & preferences
  const [myWishlist, setMyWishlist] = useState<WishlistItem[]>([]);
  const [myPreferences, setMyPreferences] = useState<ParticipantPreferences>({});
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistSavedMsg, setWishlistSavedMsg] = useState<string | null>(null);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    participantService
      .getSession(privateToken)
      .then((data) => {
        if (cancelled) return;
        if (data.group.status !== 'DRAWN' && data.group.status !== 'COMPLETED') {
          navigate(`/participant/${encodeURIComponent(privateToken)}`, { replace: true });
          return;
        }
        setSession(data);
        setMyWishlist(data.wishlist);
        setMyPreferences(data.preferences);
        if (data.giftProgress) {
          setChecklist(data.giftProgress.checklist);
          setPrivateNotes(data.giftProgress.privateNotes);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load your match.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [privateToken, navigate]);

  const handleSaveProgress = async (nextChecklist = checklist, nextNotes = privateNotes) => {
    setSavingProgress(true);
    setProgressSavedMsg(null);
    try {
      await participantService.updateGiftProgress(privateToken, {
        checklist: nextChecklist,
        privateNotes: nextNotes,
      });
      setProgressSavedMsg('Saved privately.');
      setTimeout(() => setProgressSavedMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSaveWishlist = async () => {
    setSavingWishlist(true);
    setWishlistSavedMsg(null);
    setWishlistError(null);
    try {
      const updated = await participantService.updateWishlist(
        privateToken,
        myWishlist,
        myPreferences
      );
      setMyWishlist(updated.wishlist);
      setMyPreferences(updated.preferences);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              wishlist: updated.wishlist,
              preferences: updated.preferences,
              wishlistCompleted: updated.wishlistCompleted,
              lockedWishlistItemIds:
                updated.lockedWishlistItemIds ?? prev.lockedWishlistItemIds,
            }
          : prev
      );
      setWishlistSavedMsg('Your wishlist has been saved and updated for your mystery giver.');
      setTimeout(() => setWishlistSavedMsg(null), 4000);
    } catch (err) {
      setWishlistError(err instanceof Error ? err.message : 'Could not save wishlist.');
    } finally {
      setSavingWishlist(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Revealing Your Mystery Match..."
        subtitle="Unlocking your recipient's song, wishlist, and gift ideas."
      />
    );
  }

  if (!session || !session.assignment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 space-y-3">
          <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
            Result unavailable
          </h1>
          <p className="text-sm text-[#874B4B]">
            {error ?? 'This private link is invalid or the match could not be loaded.'}
          </p>
        </div>
      </div>
    );
  }

  const { assignment, group } = session;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-6">
      {/* Top Event Meta */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B79B62]/40 bg-[#B79B62]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A6232] w-fit">
          <Sparkles className="h-3.5 w-3.5 text-[#B79B62]" />
          {group.groupName}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#777B76]">
          <span className="inline-flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5 text-[#874B4B]" />
            Budget: {formatBudget(group.budget)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#315B46]" />
            Exchange Date: {formatDate(group.eventDate)}
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 rounded-2xl border border-[#E8E6DF] bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setActiveTab('match');
            setSearchParams({});
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'match'
              ? 'bg-[#315B46] text-white shadow-sm'
              : 'text-[#777B76] hover:bg-[#F8F7F3] hover:text-[#262A27]'
          }`}
        >
          <Gift className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Mystery Match <span className="hidden md:inline font-normal opacity-85">(Giving)</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('my-wishlist');
            setSearchParams({ tab: 'my-wishlist' });
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'my-wishlist'
              ? 'bg-[#315B46] text-white shadow-sm'
              : 'text-[#777B76] hover:bg-[#F8F7F3] hover:text-[#262A27]'
          }`}
        >
          <Music className="h-4 w-4 shrink-0" />
          <span className="truncate">
            My Wishlist & Song <span className="hidden md:inline font-normal opacity-85">(Receiving)</span>
          </span>
          {session.canEditWishlist && (
            <span
              className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                activeTab === 'my-wishlist'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#315B46]/10 text-[#315B46]'
              }`}
            >
              Editable
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MYSTERY MATCH (GIVING) */}
      {activeTab === 'match' && (
        <div className="space-y-6">
          {/* Reveal Header */}
          <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-10 text-center space-y-5">
            <h1 className="font-editorial text-3xl font-semibold text-[#262A27] sm:text-5xl">
              Your mystery match is here.
            </h1>

            <div className="mx-auto max-w-xl rounded-2xl border border-[#315B46]/25 bg-[#F8F7F3] p-6 space-y-2">
              <Music className="mx-auto h-6 w-6 text-[#874B4B]" />
              <p className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
                &ldquo;{assignment.songTitle}&rdquo;
              </p>
              {assignment.artist && (
                <p className="text-sm font-medium text-[#777B76]">by {assignment.artist}</p>
              )}
              <p className="pt-1 text-xs text-[#315B46]">
                This is the anonymous song your mystery recipient submitted.
              </p>
            </div>

            {group.instructions && (
              <div className="mx-auto max-w-xl rounded-xl border border-[#E8E6DF] bg-[#F8F7F3]/70 p-4 text-left text-xs text-[#777B76]">
                <p className="font-semibold text-[#262A27] mb-1">Instructions:</p>
                <div className="whitespace-pre-line leading-relaxed">
                  {group.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Quick link to your own wishlist (only shown if editing is allowed) */}
          {session.canEditWishlist && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#315B46]/20 bg-[#315B46]/5 p-4 text-xs sm:text-sm text-[#262A27]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#315B46]/10 text-[#315B46]">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-[#262A27]">Looking to view or edit your own wishlist?</p>
                  <p className="text-xs text-[#777B76]">
                    You are registered as &ldquo;{session.songTitle}&rdquo;. Switch tabs anytime to update what your mystery giver sees for you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my-wishlist');
                  setSearchParams({ tab: 'my-wishlist' });
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#315B46] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#274938]"
              >
                <span>Edit My Wishlist</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
              {error}
            </div>
          )}

          {/* Recipient's Wishlist */}
          <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
                Recipient&apos;s Wishlist
              </h2>
              <p className="text-sm text-[#777B76]">
                Only you, as their assigned gift-giver, can view these items.
              </p>
            </div>

            {assignment.wishlist.length === 0 ? (
              <p className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-5 text-sm text-[#777B76]">
                Your recipient hasn&apos;t added specific wishlist items yet. Check their preferences
                below or surprise them within the budget!
              </p>
            ) : (
              <div className="space-y-3">
                {assignment.wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-[#E8E6DF] bg-[#F8F7F3]/50 p-4 sm:flex-row sm:items-start"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="h-20 w-20 shrink-0 rounded-lg border border-[#E8E6DF] object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#262A27] break-words [overflow-wrap:anywhere]">
                          {item.name}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            item.priority === 'must_have'
                              ? 'bg-[#874B4B]/10 text-[#874B4B]'
                              : 'border border-[#E8E6DF] bg-white text-[#777B76]'
                          }`}
                        >
                          {item.priority === 'must_have' ? 'Must Have' : 'Nice to Have'}
                        </span>
                        <span className="rounded-full border border-[#E8E6DF] bg-white px-2.5 py-0.5 text-[11px] text-[#777B76]">
                          {item.category}
                        </span>
                        {item.estimatedPrice !== undefined && (
                          <span className="text-xs font-medium text-[#315B46]">
                            ~{formatCurrency(item.estimatedPrice, group.budget.currency)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-[#777B76] break-words [overflow-wrap:anywhere]">
                          {item.description}
                        </p>
                      )}
                      {item.productUrl && (
                        <a
                          href={item.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#315B46] hover:underline"
                        >
                          Open product link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Preferences */}
            {(assignment.preferences.hobbies ||
              assignment.preferences.favorites ||
              assignment.preferences.preferredColors ||
              assignment.preferences.avoidItems) && (
              <div className="grid gap-3 border-t border-[#E8E6DF] pt-5 text-sm sm:grid-cols-2">
                {assignment.preferences.hobbies && (
                  <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                      Hobbies & Interests
                    </p>
                    <p className="mt-1 text-[#262A27]">{assignment.preferences.hobbies}</p>
                  </div>
                )}
                {assignment.preferences.favorites && (
                  <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                      Favorite Things
                    </p>
                    <p className="mt-1 text-[#262A27]">{assignment.preferences.favorites}</p>
                  </div>
                )}
                {assignment.preferences.preferredColors && (
                  <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                      Preferred Colors
                    </p>
                    <p className="mt-1 text-[#262A27]">{assignment.preferences.preferredColors}</p>
                  </div>
                )}
                {assignment.preferences.avoidItems && (
                  <div className="rounded-xl border border-[#874B4B]/25 bg-[#874B4B]/5 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#874B4B]">
                      Things to Avoid
                    </p>
                    <p className="mt-1 text-[#262A27]">{assignment.preferences.avoidItems}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Gift Preparation Checklist & Private Notes */}
          <section className="card-editorial rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="h-5 w-5 text-[#315B46]" />
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
                    Gift Preparation Checklist
                  </h2>
                  <p className="text-xs text-[#777B76]">
                    {Object.values(checklist).filter(Boolean).length} of {CHECKLIST_ITEMS.length} steps
                    completed
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#777B76]">
                <Lock className="h-3.5 w-3.5 text-[#315B46]" />
                Private to you only
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F8F7F3]">
              <div
                className="h-full rounded-full bg-[#315B46] transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (Object.values(checklist).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {CHECKLIST_ITEMS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E8E6DF] bg-[#F8F7F3]/50 px-4 py-3 text-sm text-[#262A27] hover:border-[#315B46]"
                >
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={(e) => {
                      const next = { ...checklist, [key]: e.target.checked };
                      setChecklist(next);
                      void handleSaveProgress(next, privateNotes);
                    }}
                    className="h-4 w-4 rounded border-[#E8E6DF] accent-[#315B46]"
                  />
                  <span className={checklist[key] ? 'line-through text-[#777B76]' : ''}>
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-[#262A27]">
                Private Gift Notes (never visible to your recipient or organizer)
              </label>
              <textarea
                rows={3}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Jot down gift ideas, wrapping plans, or store links..."
                maxLength={2000}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-3 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#315B46]">{progressSavedMsg ?? ''}</span>
                <button
                  type="button"
                  disabled={savingProgress}
                  onClick={() => void handleSaveProgress(checklist, privateNotes)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-5 py-2 text-xs font-medium text-white hover:bg-[#274938] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingProgress ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: MY WISHLIST & SONG (RECEIVING) */}
      {activeTab === 'my-wishlist' && (
        <div className="space-y-6">
          {/* Your Anonymous Identity Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-[#E8E6DF] bg-white p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#315B46]/10 text-[#315B46]">
                <Music className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                  Your Anonymous Song Identity (Locked)
                </p>
                <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
                  &ldquo;{session.songTitle}&rdquo;
                  {session.artist ? ` — ${session.artist}` : ''}
                </h2>
                <p className="text-xs text-[#315B46] mt-0.5">
                  Your assigned gift-giver sees this song and the wishlist below.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#E8E6DF] bg-[#F8F7F3] px-3.5 py-1.5 text-xs text-[#777B76]">
              Your Secret Identity
            </span>
          </div>

          {/* Feedback Messages */}
          {wishlistError && (
            <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
              {wishlistError}
            </div>
          )}
          {wishlistSavedMsg && (
            <div className="rounded-xl border border-[#315B46]/30 bg-[#315B46]/10 px-4 py-3 text-sm text-[#315B46]">
              {wishlistSavedMsg}
            </div>
          )}

          {/* Wishlist Editor */}
          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-6">
            <WishlistEditor
              items={myWishlist}
              preferences={myPreferences}
              maxItems={group.settings.maxWishlistItems}
              currency={group.budget.currency}
              disabled={!session.canEditWishlist}
              lockedItemIds={session.lockedWishlistItemIds}
              onChangeItems={setMyWishlist}
              onChangePreferences={setMyPreferences}
            />

            {session.canEditWishlist ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E8E6DF] pt-4">
                <p className="text-xs text-[#777B76]">
                  Make sure to save your changes so your gift-giver sees your latest ideas.
                </p>
                <button
                  type="button"
                  disabled={savingWishlist}
                  onClick={() => void handleSaveWishlist()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#315B46] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#274938] disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {savingWishlist ? 'Saving Changes...' : 'Save Wishlist Changes'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#777B76] border-t border-[#E8E6DF] pt-4">
                Wishlist editing is currently locked by the organizer for this event.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
