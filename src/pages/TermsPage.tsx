export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
          Terms of Use
        </p>
        <h1 className="mt-2 font-editorial text-4xl font-semibold text-[#262A27]">
          Simple terms for a community tool
        </h1>
      </div>

      <div className="space-y-7 rounded-2xl border border-[#E8E6DF] bg-white p-7 sm:p-9 text-sm leading-relaxed text-[#777B76]">
        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            1. Acceptable Use
          </h2>
          <p>
            HulaWho is provided for organizing friendly, lawful gift exchanges. Do not
            submit harmful, abusive, or malicious content, or attempt to bypass access controls.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            2. Finality of the Draw & Private Links
          </h2>
          <p>
            Once an organizer starts and finalizes a draw, assignments are permanent and cannot be
            reset. Because no email addresses are collected, lost private links cannot be recovered
            by support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            3. External Product Links
          </h2>
          <p>
            Wishlist items may contain links to third-party stores provided by participants. HulaWho
            is not responsible for external websites, pricing, or purchases.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">
            4. Service Availability
          </h2>
          <p>
            This application is provided &ldquo;as is&rdquo; without warranties of any kind.
          </p>
        </section>
      </div>
    </div>
  );
}
