export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
          Privacy Policy
        </p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold text-[#262A27]">
          Built for practical anonymity
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#777B76]">
          HulaWho is designed to minimize personal data collection while keeping gift
          exchanges fair and enjoyable.
        </p>
      </div>

      <div className="space-y-8 rounded-2xl border border-[#E8E6DF] bg-white p-7 sm:p-9 text-sm leading-relaxed text-[#777B76]">
        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            1. What Information Is Stored
          </h2>
          <p>
            We store only what is required to run your exchange: group settings, anonymous song
            titles (with optional artist), wishlist items and preferences, randomized match
            assignments, and private gift-giver checklist notes. We do not collect real names,
            email addresses, phone numbers, or user accounts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            2. What Organizers Can See
          </h2>
          <p>
            Organizers can only view aggregate progress: total participant count, completed wishlist
            count, and event status. Organizers cannot view individual song titles, wishlists,
            private participant links, or who is assigned to whom.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            3. What Participants Can See
          </h2>
          <p>
            Before the draw, participants see only event details and their own submission. After the
            draw, each participant sees only their own submission and the song and wishlist of the
            single recipient assigned to them. Private gift-giver notes are visible only to the
            gift-giver.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            4. How Private Links Work
          </h2>
          <p>
            Private organizer and participant links rely on high-entropy 256-bit random tokens.
            Only SHA-256 cryptographic hashes of these tokens are stored on the server, and tokens
            are transmitted via HTTP Authorization headers rather than URL query strings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            5. Known Privacy Limitations
          </h2>
          <p>
            We do not claim absolute anonymity. For example, if a participant chooses a song
            strongly associated with them personally, friends may recognize it. Similarly, sharing
            wishlist links to personal social profiles or entering identifying details in wishlist
            notes can reveal identity.
          </p>
        </section>
      </div>
    </div>
  );
}
