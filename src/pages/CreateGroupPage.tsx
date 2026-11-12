import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';
import { CopyShareActions } from '../components/common/CopyShareActions';
import { groupService } from '../services/api';
import {
  buildInvitationUrl,
  buildOrganizerUrl,
  saveOrganizerToken,
} from '../services/credentialService';
import type { CreateGroupResponse, EventCategory } from '../types/exchange';

const CATEGORIES: EventCategory[] = [
  'Christmas',
  'Birthday',
  'Office Exchange',
  'Family Exchange',
  'Friends Exchange',
  'Custom',
];

const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD', 'CAD'];

export function CreateGroupPage() {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Christmas');
  const [eventDate, setEventDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [instructions, setInstructions] = useState('');

  const [currency, setCurrency] = useState('PHP');
  const [budgetMode, setBudgetMode] = useState<'fixed' | 'range'>('fixed');
  const [budgetAmount, setBudgetAmount] = useState('500');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [maxParticipants, setMaxParticipants] = useState(20);
  const [maxWishlistItems, setMaxWishlistItems] = useState(20);
  const [allowEditBeforeDraw, setAllowEditBeforeDraw] = useState(true);
  const [allowEditAfterDraw, setAllowEditAfterDraw] = useState(false);
  const [requireCompletedWishlist, setRequireCompletedWishlist] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateGroupResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (groupName.trim().length < 2) {
      setError('Please enter a group name (at least 2 characters).');
      return;
    }

    const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));

    setSubmitting(true);
    try {
      const res = await groupService.createGroup({
        groupName: groupName.trim(),
        description: description.trim() || undefined,
        category,
        eventDate: eventDate || undefined,
        registrationDeadline: registrationDeadline || undefined,
        instructions: instructions.trim() || undefined,
        budget:
          budgetMode === 'fixed'
            ? { amount: toNum(budgetAmount), currency }
            : { min: toNum(budgetMin), max: toNum(budgetMax), currency },
        settings: {
          maxParticipants,
          maxWishlistItems,
          allowEditBeforeDraw,
          allowEditAfterDraw,
          requireCompletedWishlist,
        },
      });

      saveOrganizerToken(res.groupId, res.organizerToken);
      setCreated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create exchange.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const inviteUrl = buildInvitationUrl(created.groupId);
    const organizerUrl = buildOrganizerUrl(created.groupId, created.organizerToken);

    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-10 space-y-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
                Exchange Created
              </p>
              <h1 className="mt-1 font-editorial text-3xl font-semibold text-[#262A27]">
                {created.group.groupName}
              </h1>
              <p className="mt-1 text-sm text-[#777B76]">
                Your anonymous song-based exchange is ready for participants.
              </p>
            </div>
          </div>

          {/* Public Invitation Link */}
          <div className="rounded-2xl border border-[#E8E6DF] bg-[#F8F7F3] p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#262A27]">
              1. Public Invitation Link (Share with Participants)
            </p>
            <p className="break-all rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 font-mono text-xs text-[#262A27]">
              {inviteUrl}
            </p>
            <CopyShareActions
              url={inviteUrl}
              copyText={`🎁 ${created.group.groupName}\nJoin our anonymous song-based gift exchange on HulaWho!\n\n👉 ${inviteUrl}`}
              shareTitle={created.group.groupName}
              shareText={`Join "${created.group.groupName}" on HulaWho!\n\n${inviteUrl}`}
              copyLabel="Copy Invite Message"
            />
          </div>

          {/* Private Organizer Management Link */}
          <div className="rounded-2xl border border-[#B79B62]/40 bg-[#B79B62]/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#262A27]">
              <KeyRound className="h-4 w-4 text-[#B79B62]" />
              2. Private Organizer Management Link (Keep Secret!)
            </div>
            <p className="text-xs text-[#777B76]">
              Save or bookmark this link to manage settings, monitor progress, and start the draw.
              Never share this link with participants.
            </p>
            <p className="break-all rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 font-mono text-xs text-[#262A27]">
              {organizerUrl}
            </p>
            <CopyShareActions url={organizerUrl} copyLabel="Copy Management Link" compact />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <Link
              to={`/organizer/${created.groupId}#token=${encodeURIComponent(created.organizerToken)}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
            >
              Open Organizer Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#777B76]">
              <ShieldAlert className="h-3.5 w-3.5 text-[#315B46]" />
              Organizer cannot view songs or wishlists
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
          Organizer Setup
        </p>
        <h1 className="mt-2 font-editorial text-3xl font-semibold text-[#262A27] sm:text-4xl">
          Create a HulaWho Exchange
        </h1>
        <p className="mt-2 text-sm text-[#777B76]">
          Configure your exchange details. You&apos;ll receive a public invite link for guests and
          a private management link for yourself.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-sm text-[#874B4B]">
            {error}
          </div>
        )}

        {/* Group Details */}
        <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">Group Details</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Group Name <span className="text-[#874B4B]">*</span>
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Christmas Gift Exchange 2026"
                maxLength={100}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Exchange Date (optional)
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Registration Deadline (optional)
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Max Participants (3–50)
              </label>
              <input
                type="number"
                min={3}
                max={50}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Description (optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A warm, anonymous gift exchange for our team..."
                maxLength={500}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Gift Exchange Instructions (optional)
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Wrap gifts with the recipient's song title on the tag!"
                maxLength={1000}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Budget Settings */}
        <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">Gift Budget</h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Budget Type</label>
              <select
                value={budgetMode}
                onChange={(e) => setBudgetMode(e.target.value as 'fixed' | 'range')}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              >
                <option value="fixed">Target Amount</option>
                <option value="range">Min – Max Range</option>
              </select>
            </div>

            {budgetMode === 'fixed' ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Min</label>
                  <input
                    type="number"
                    min={0}
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="300"
                    className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Max</label>
                  <input
                    type="number"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="500"
                    className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Wishlist Settings */}
        <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-5">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">Wishlist Settings</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Max Wishlist Items per Participant (1–20)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxWishlistItems}
                onChange={(e) => setMaxWishlistItems(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 text-sm text-[#262A27]">
              <input
                type="checkbox"
                checked={allowEditBeforeDraw}
                onChange={(e) => setAllowEditBeforeDraw(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DF] accent-[#315B46]"
              />
              <span>Allow participants to edit their wishlist before the draw</span>
            </label>

            <label className="flex items-start gap-3 text-sm text-[#262A27]">
              <input
                type="checkbox"
                checked={allowEditAfterDraw}
                onChange={(e) => setAllowEditAfterDraw(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DF] accent-[#315B46]"
              />
              <span>Allow participants to update their wishlist after the draw</span>
            </label>

            <label className="flex items-start gap-3 text-sm text-[#262A27]">
              <input
                type="checkbox"
                checked={requireCompletedWishlist}
                onChange={(e) => setRequireCompletedWishlist(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E8E6DF] accent-[#315B46]"
              />
              <span>Require at least one wishlist item from everyone before starting the draw</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#274938] disabled:opacity-50"
          >
            {submitting ? 'Creating Exchange...' : 'Create Exchange'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
