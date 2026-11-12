import type { EventStatus } from '../../types/exchange';
import { getStatusLabel } from '../../utils/format';

export function StatusBadge({ status }: { status: EventStatus }) {
  const styles: Record<EventStatus, string> = {
    CREATED: 'border-[#E8E6DF] bg-[#F8F7F3] text-[#777B76]',
    COLLECTING: 'border-[#315B46]/25 bg-[#315B46]/10 text-[#315B46]',
    REGISTRATION_CLOSED: 'border-[#B79B62]/35 bg-[#B79B62]/15 text-[#7A6232]',
    READY: 'border-[#315B46]/30 bg-[#315B46]/15 text-[#315B46]',
    LOCKED: 'border-[#B79B62]/40 bg-[#B79B62]/20 text-[#7A6232]',
    DRAWN: 'border-[#315B46] bg-[#315B46] text-white',
    COMPLETED: 'border-[#262A27]/20 bg-[#262A27] text-white',
    CANCELLED: 'border-[#874B4B]/30 bg-[#874B4B]/10 text-[#874B4B]',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${styles[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
