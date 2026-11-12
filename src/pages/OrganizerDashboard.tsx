import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Edit3,
  Gift,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { CopyShareActions } from '../components/common/CopyShareActions';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { groupService } from '../services/api';
import {
  buildInvitationUrl,
  buildOrganizerUrl,
  buildParticipantUrl,
  getOrganizerToken,
  saveOrganizerToken,
} from '../services/credentialService';
import type { AnonymousSlot, OrganizerGroupView } from '../types/exchange';
import { formatBudget, formatDate } from '../utils/format';

export function OrganizerDashboard() {
  const { groupId = '' } = useParams<{ groupId: string }>();

  const [token, setToken] = useState<string | null>(() => getOrganizerToken(groupId));
  const [tokenInput, setTokenInput] = useState('');
  const [group, setGroup] = useState<OrganizerGroupView | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Edit details state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editInstructions, setEditInstructions] = useState('');

  // Confirmation modals
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [slotToRemove, setSlotToRemove] = useState<AnonymousSlot | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  const loadGroup = useCallback(
    async (activeToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await groupService.getOrganizerGroup(groupId, activeToken);
        setGroup(data);
        setEditName(data.groupName);
        setEditDate(data.eventDate ?? '');
        setEditBudget(data.budget.amount !== undefined ? String(data.budget.amount) : '');
        setEditInstructions(data.instructions ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load organizer dashboard.');
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    const t = getOrganizerToken(groupId);
    setToken(t);
    if (t) {
      void loadGroup(t);
    } else {
      setLoading(false);
    }
  }, [groupId, loadGroup]);

  const handleUnlock = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    saveOrganizerToken(groupId, trimmed);
    setToken(trimmed);
    void loadGroup(trimmed);
  };

  const runAction = async (body: Record<string, unknown>, successMessage: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setActionMsg(null);
    try {
      const updated = await groupService.organizerAction(groupId, token, body);
      setGroup(updated);
      setActionMsg(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!group) return;
    await runAction(
      {
        action: 'update_details',
        groupName: editName,
        eventDate: editDate,
        instructions: editInstructions,
        budget: {
          ...group.budget,
          amount: editBudget.trim() === '' ? undefined : Number(editBudget),
        },
      },
      'Exchange details updated.'
    );
    setEditing(false);
  };

  const handleRegenerateLink = async (slot: AnonymousSlot) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await groupService.regenerateParticipantLink(groupId, token, slot.slotId);
      const url = buildParticipantUrl(res.privateToken, res.isDrawn);
      setGeneratedLinks((prev) => ({ ...prev, [slot.slotId]: url }));
      setActionMsg(`Fresh private link generated for "${slot.songTitle}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartDraw = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setActionMsg(null);
    try {
      const updated = await groupService.startDraw(groupId, token);
      setGroup(updated);
      setDrawModalOpen(false);
      setActionMsg(
        'The draw is complete! Participants can now reopen their private links to see their mystery match.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete draw.');
      setDrawModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
                Organizer Access
              </h1>
              <p className="text-xs text-[#777B76]">Group ID: {groupId}</p>
            </div>
          </div>
          <p className="text-sm text-[#777B76]">
            Enter your private organizer token (or open your saved organizer management link) to
            access this dashboard.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="org_..."
              className="w-full rounded-xl border border-[#E8E6DF] px-4 py-2.5 text-sm focus:border-[#315B46] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !group) {
    return (
      <LoadingScreen
        title="Loading Organizer Dashboard..."
        subtitle="Verifying credentials and fetching participant progress."
      />
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 space-y-3">
          <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
            Unable to access organizer dashboard
          </h1>
          <p className="text-sm text-[#874B4B]">{error}</p>
        </div>
      </div>
    );
  }

  const inviteUrl = buildInvitationUrl(group.groupId);
  const recoverUrl = `${window.location.origin}/recover/${encodeURIComponent(group.groupId)}`;
  const organizerUrl = buildOrganizerUrl(group.groupId, token);
  const isBeforeDraw =
    group.status !== 'DRAWN' &&
    group.status !== 'LOCKED' &&
    group.status !== 'COMPLETED' &&
    group.status !== 'CANCELLED';
  const progressPct = Math.min(
    100,
    Math.round((group.participantCount / group.settings.maxParticipants) * 100)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
            Organizer Dashboard · {group.category}
          </p>
          <h1 className="mt-1 font-editorial text-3xl font-semibold text-[#262A27] sm:text-4xl">
            {group.groupName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={group.status} />
          <button
            type="button"
            onClick={() => void loadGroup(token)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] bg-white px-3.5 py-1.5 text-xs font-medium text-[#262A27] hover:border-[#315B46]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
          {error}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-xl border border-[#315B46]/30 bg-[#315B46]/10 px-4 py-3 text-sm text-[#315B46]">
          {actionMsg}
        </div>
      )}

      {/* Aggregate Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#777B76]">
            <Users className="h-4 w-4 text-[#315B46]" />
            Participants
          </div>
          <p className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
            {group.participantCount} / {group.settings.maxParticipants}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F8F7F3]">
            <div
              className="h-full rounded-full bg-[#315B46] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#777B76]">
            <CheckCircle2 className="h-4 w-4 text-[#315B46]" />
            Wishlists Completed
          </div>
          <p className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
            {group.completedWishlistCount} / {group.participantCount}
          </p>
          <p className="mt-2 text-xs text-[#777B76]">Aggregate count only</p>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#777B76]">
            <Gift className="h-4 w-4 text-[#874B4B]" />
            Gift Budget
          </div>
          <p className="mt-2 text-lg font-semibold text-[#262A27]">
            {formatBudget(group.budget)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#777B76]">
            <Calendar className="h-4 w-4 text-[#B79B62]" />
            Exchange Date
          </div>
          <p className="mt-2 text-lg font-semibold text-[#262A27]">
            {formatDate(group.eventDate)}
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#E8E6DF] bg-white p-5 text-sm text-[#777B76]">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#315B46]" />
        <div>
          <strong className="text-[#262A27]">Privacy Protection Active:</strong> Individual
          wishlists and match assignments are hidden from the organizer and are never sent to this
          browser. Song titles are shown below only so you can manage slots or regenerate a
          forgotten link.
        </div>
      </div>

      {/* Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 space-y-3">
          <h2 className="font-editorial text-lg font-semibold text-[#262A27]">
            Public Invitation &amp; Recovery Links
          </h2>
          <p className="break-all rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] px-3 py-2 font-mono text-xs text-[#262A27]">
            {inviteUrl}
          </p>
          <CopyShareActions
            url={inviteUrl}
            shareTitle={group.groupName}
            shareText={`Join "${group.groupName}" on HulaWho!`}
            copyLabel="Copy Invitation Link"
            compact
          />
          <div className="border-t border-[#E8E6DF] pt-3 space-y-2">
            <p className="text-xs text-[#777B76]">
              If a participant forgets their private link, share this self-service recovery link:
            </p>
            <CopyShareActions
              url={recoverUrl}
              copyLabel="Copy Self-Service Recovery Link"
              compact
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 space-y-3">
          <h2 className="font-editorial text-lg font-semibold text-[#262A27]">
            Private Organizer Link
          </h2>
          <p className="text-xs text-[#777B76]">
            Keep this link private. Anyone with it can manage the exchange.
          </p>
          <CopyShareActions
            url={organizerUrl}
            copyLabel="Copy Private Management Link"
            compact
          />
        </div>
      </div>

      {/* Participant Slots */}
      {group.anonymousSlots.length > 0 && (
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
              Participants by Song ({group.anonymousSlots.length})
            </h2>
            <p className="text-xs text-[#777B76]">
              Song titles are listed so you can remove a slot before the draw or generate a fresh
              private link if someone forgot theirs. Wishlists and match assignments remain private.
            </p>
          </div>

          <div className="divide-y divide-[#E8E6DF] rounded-xl border border-[#E8E6DF]">
            {group.anonymousSlots.map((slot) => {
              const generatedUrl = generatedLinks[slot.slotId];
              return (
                <div key={slot.slotId} className="space-y-3 px-4 py-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-medium text-[#262A27]">
                        &ldquo;{slot.songTitle}&rdquo;
                      </span>
                      {slot.artist && (
                        <span className="text-xs text-[#777B76]">by {slot.artist}</span>
                      )}
                      <span className="text-xs text-[#777B76]">
                        Joined {new Date(slot.joinedAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          slot.wishlistCompleted
                            ? 'bg-[#315B46]/10 text-[#315B46]'
                            : 'border border-[#E8E6DF] bg-[#F8F7F3] text-[#777B76]'
                        }`}
                      >
                        {slot.wishlistCompleted ? 'Wishlist completed' : 'No wishlist items'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRegenerateLink(slot)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] bg-white px-3 py-1 text-xs font-medium text-[#315B46] hover:border-[#315B46] disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Generate Link
                      </button>

                      {isBeforeDraw && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setSlotToRemove(slot)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] px-3 py-1 text-xs text-[#777B76] hover:border-[#874B4B] hover:text-[#874B4B] disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {generatedUrl && (
                    <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3 space-y-2">
                      <p className="text-[11px] font-medium text-[#262A27]">
                        Private link for &ldquo;{slot.songTitle}&rdquo; (share only with this
                        participant):
                      </p>
                      <p className="break-all font-mono text-[11px] text-[#777B76]">
                        {generatedUrl}
                      </p>
                      <CopyShareActions
                        url={generatedUrl}
                        shareTitle={`HulaWho Link — ${slot.songTitle}`}
                        shareText={`Here is your private HulaWho link for "${slot.songTitle}":`}
                        copyLabel="Copy Participant Link"
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Draw & Lifecycle Controls */}
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
              Exchange Controls
            </h2>
            <p className="mt-1 text-sm text-[#777B76]">
              {group.status === 'DRAWN'
                ? 'The random draw has been finalized. Participants can view their matches via their private links.'
                : 'Close registration when everyone has joined, then start the random draw.'}
            </p>
          </div>

          {isBeforeDraw && (
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] px-4 py-2 text-xs font-medium text-[#262A27] hover:border-[#315B46]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {editing ? 'Close Editor' : 'Edit Details'}
            </button>
          )}
        </div>

        {editing && isBeforeDraw && (
          <form
            onSubmit={handleSaveDetails}
            className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-5 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#262A27]">Group Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#262A27]">Event Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#262A27]">
                  Budget ({group.budget.currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#262A27]">Instructions</label>
              <textarea
                rows={2}
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#315B46] px-5 py-2 text-xs font-medium text-white hover:bg-[#274938]"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Draw Readiness */}
        {isBeforeDraw && !group.drawReadiness.isReady && (
          <div className="rounded-xl border border-[#B79B62]/35 bg-[#B79B62]/10 p-4 text-sm text-[#262A27]">
            <p className="font-medium">Not ready for the draw yet:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-[#777B76]">
              {group.drawReadiness.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {(group.status === 'CREATED' || group.status === 'COLLECTING') && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction({ action: 'close_registration' }, 'Registration is now closed.')
              }
              className="inline-flex items-center gap-2 rounded-full border border-[#315B46] bg-white px-5 py-2.5 text-sm font-medium text-[#315B46] hover:bg-[#315B46]/5 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              Close Registration
            </button>
          )}

          {(group.status === 'REGISTRATION_CLOSED' || group.status === 'READY') && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction({ action: 'reopen_registration' }, 'Registration reopened.')
              }
              className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-5 py-2.5 text-sm font-medium text-[#262A27] hover:border-[#315B46] disabled:opacity-50"
            >
              Reopen Registration
            </button>
          )}

          {isBeforeDraw && (
            <button
              type="button"
              disabled={busy || !group.drawReadiness.isReady}
              onClick={() => setDrawModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#274938] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Sparkles className="h-4 w-4" />
              Start Exchange
            </button>
          )}

          {(group.status === 'DRAWN' || group.status === 'COMPLETED') && (
            <>
              {group.status === 'DRAWN' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction({ action: 'complete_event' }, 'Exchange marked as completed.')
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#274938]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Event Completed
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setResetModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#874B4B]/30 px-4 py-2.5 text-xs font-medium text-[#874B4B] hover:bg-[#874B4B]/10 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset &amp; Start Over
              </button>
            </>
          )}

          {isBeforeDraw && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setResetModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] px-4 py-2.5 text-xs font-medium text-[#777B76] hover:border-[#874B4B] hover:text-[#874B4B]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Group
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#874B4B]/30 px-4 py-2.5 text-xs font-medium text-[#874B4B] hover:bg-[#874B4B]/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Event
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={drawModalOpen}
        title="Ready to reveal the mystery?"
        message="Starting the exchange will lock submissions and randomly assign everyone to another participant. This action cannot be undone."
        confirmLabel="Start Exchange"
        isLoading={busy}
        onConfirm={() => void handleStartDraw()}
        onCancel={() => setDrawModalOpen(false)}
      />

      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset this exchange group?"
        message="This will clear all participant submissions, assignments, and gift progress, allowing you to reuse this group link for a brand new round."
        confirmLabel="Reset Group"
        destructive
        isLoading={busy}
        onConfirm={() => {
          setResetModalOpen(false);
          void runAction({ action: 'reset_group' }, 'Group has been reset and is ready for new participants.');
        }}
        onCancel={() => setResetModalOpen(false)}
      />

      <ConfirmModal
        isOpen={cancelModalOpen}
        title="Cancel this exchange?"
        message="Cancelling will permanently close this exchange so no new participants can join and no draw can occur."
        confirmLabel="Cancel Event"
        destructive
        isLoading={busy}
        onConfirm={() => {
          setCancelModalOpen(false);
          void runAction({ action: 'cancel_event' }, 'Exchange has been cancelled.');
        }}
        onCancel={() => setCancelModalOpen(false)}
      />

      <ConfirmModal
        isOpen={slotToRemove !== null}
        title={slotToRemove ? `Remove Participant #${slotToRemove.slotNumber}?` : 'Remove participant?'}
        message="This will permanently remove this anonymous submission and invalidate their private access link. This is only possible before the draw."
        confirmLabel="Remove Participant"
        destructive
        isLoading={busy}
        onConfirm={() => {
          if (!slotToRemove) return;
          const targetId = slotToRemove.slotId;
          setSlotToRemove(null);
          void runAction(
            { action: 'remove_participant', slotId: targetId },
            'Participant slot removed.'
          );
        }}
        onCancel={() => setSlotToRemove(null)}
      />
    </div>
  );
}
