import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { CopyShareActions } from '../components/common/CopyShareActions';
import { participantService } from '../services/api';
import { buildParticipantUrl } from '../services/credentialService';

export function RecoverLinkPage() {
  const { groupId: paramGroupId = '' } = useParams<{ groupId?: string }>();

  const [groupId, setGroupId] = useState(paramGroupId);
  const [songTitle, setSongTitle] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<{ privateToken: string; isDrawn: boolean } | null>(
    null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedGroup = groupId.trim();
    const match = trimmedGroup.match(/\/(?:join|recover)\/([^/?#]+)/i);
    const resolvedGroupId = match ? match[1] : trimmedGroup;

    if (!resolvedGroupId || !songTitle.trim() || !recoveryPhrase.trim()) {
      setError('Please enter your group code, song title, and secret recovery phrase.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await participantService.recoverLink({
        groupId: resolvedGroupId,
        songTitle: songTitle.trim(),
        recoveryPhrase: recoveryPhrase.trim(),
      });
      setRecovered(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recover your link.');
    } finally {
      setSubmitting(false);
    }
  };

  if (recovered) {
    const newUrl = buildParticipantUrl(recovered.privateToken, recovered.isDrawn);
    const targetRoute = recovered.isDrawn
      ? `/result/${encodeURIComponent(recovered.privateToken)}`
      : `/participant/${encodeURIComponent(recovered.privateToken)}`;

    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-editorial text-2xl font-semibold text-[#262A27]">
                Fresh Private Link Ready
              </h1>
              <p className="mt-1 text-xs text-[#777B76]">
                For security, your previous private link has been invalidated. Save this new link.
              </p>
            </div>
          </div>

          <p className="break-all rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] px-3.5 py-2.5 font-mono text-xs text-[#262A27]">
            {newUrl}
          </p>

          <CopyShareActions url={newUrl} copyLabel="Copy New Private Link" compact />

          <Link
            to={targetRoute}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
          >
            {recovered.isDrawn ? 'View My Mystery Match' : 'Open My Dashboard'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 space-y-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
              Self-Service Recovery
            </p>
            <h1 className="mt-1 font-editorial text-2xl font-semibold text-[#262A27]">
              Recover Your Private Link
            </h1>
            <p className="mt-1 text-xs text-[#777B76]">
              Enter the song title and secret recovery phrase you set when joining. The organizer
              never sees your song or phrase.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[#874B4B]/30 bg-[#874B4B]/10 px-4 py-3 text-xs text-[#874B4B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!paramGroupId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Group Code or Invitation Link
              </label>
              <input
                type="text"
                required
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Paste group code or /join/... link"
                className="w-full rounded-xl border border-[#E8E6DF] px-4 py-2.5 text-sm focus:border-[#315B46] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Your Song Title
            </label>
            <input
              type="text"
              required
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="e.g., Goodness of God"
              className="w-full rounded-xl border border-[#E8E6DF] px-4 py-2.5 text-sm focus:border-[#315B46] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Secret Recovery Phrase / PIN
            </label>
            <div className="relative">
              <input
                type={showRecoveryPhrase ? 'text' : 'password'}
                required
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                placeholder="Enter your secret phrase or PIN"
                className="w-full rounded-xl border border-[#E8E6DF] py-2.5 pl-4 pr-11 text-sm focus:border-[#315B46] focus:outline-none"
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
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938] disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Generate Fresh Private Link'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
