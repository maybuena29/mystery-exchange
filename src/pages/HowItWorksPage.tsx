import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Gift,
  HelpCircle,
  KeyRound,
  Music,
  Shield,
  Shuffle,
  Sparkles,
  Users,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Do I need an account or email to participate?',
    answer:
      'No. HulaWho is completely account-free and password-free. We never ask for your real name, email address, or phone number. When you join, you receive a private access link that grants you secure access to your exchange dashboard.',
  },
  {
    question: 'How does the anonymous song identity work?',
    answer:
      'Instead of using real names, each participant chooses a song title (such as a beloved Christian worship or uplifting song like "Goodness of God", "Friend of God", or "Ikaw Lamang") as their alias. Your gift-giver will only know you by this song and your wishlist until the grand reveal on gift day!',
  },
  {
    question: 'Can the organizer see my wishlist or my assigned recipient?',
    answer:
      'No. Wishlists and recipient match pairings are protected by cryptographic server-side authorization. Only your assigned gift-giver can view your wishlist after the draw. The organizer dashboard only displays registered song titles in numbered slots to assist with coordination, and cannot see who is assigned to whom.',
  },
  {
    question: 'Can the organizer edit event details or budget after the draw has started?',
    answer:
      'Yes! Organizers can update group settings, gift budget, event date, and instructions at any time—even after the secret draw has finalized. If participants need to tweak their wishlists, the organizer can also toggle post-draw wishlist editing.',
  },
  {
    question: 'Can the draw be restarted or reset if plans change?',
    answer:
      'Yes. If a participant joined late or your group needs to re-run the exchange, the organizer can click "Reset & Start Over" in their dashboard. This securely resets the draw back to the collecting stage with a safety confirmation, allowing you to add more members before running the draw again.',
  },
  {
    question: 'What if I lose or forget my private link?',
    answer:
      'We have three easy ways to recover: 1) Self-Service Recovery: Go to /recover and enter your group code, your song title, and the secret recovery phrase you set when joining. 2) Ask Your Organizer: Your organizer has a "Generate Link" button in their dashboard that generates a fresh private link for your song slot. 3) Super Admin: Platform administrators can also assist organizers with link recovery.',
  },
  {
    question: 'Can I receive my own song in the draw?',
    answer:
      'No. Our draw engine uses a mathematically verified derangement algorithm (crypto.getRandomValues) that strictly guarantees zero self-assignments, ensuring everyone gives and receives exactly one gift.',
  },
  {
    question: 'Can I edit my wishlist after joining?',
    answer:
      'Yes! You can edit your wishlist and gift preferences anytime before the draw. Organizers can also enable post-draw editing so you can update notes, sizes, or links even after matches are revealed.',
  },
  {
    question: 'How do I see who I am giving a gift to?',
    answer:
      'Simply reopen or bookmark the private link you received when joining. Once your organizer clicks "Start Secret Draw", reopening your link reveals your recipient\'s song title, their wishlist ideas with direct product links, and a gift preparation checklist.',
  },
  {
    question: 'How many participants can join an exchange?',
    answer:
      'Between 3 and 50 participants per exchange. At least 3 members are required to guarantee a fair, anonymous round-robin matching.',
  },
  {
    question: 'Is HulaWho completely free?',
    answer:
      'Yes! HulaWho is 100% free with no hidden charges, advertisements, or premium tiers. It is designed to make church fellowships, youth groups, families, and office teams celebrate the joy of giving together.',
  },
];

export function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-16 lg:px-8 space-y-12 sm:space-y-16 lg:space-y-20 overflow-x-hidden">
      {/* Section A: Hero Intro */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#315B46] shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#B79B62]" />
          Platform Guide &amp; Walkthrough
        </p>

        <h1 className="font-editorial text-3xl font-semibold text-[#262A27] sm:text-5xl sm:leading-[1.12]">
          A little mystery. <br className="hidden sm:inline" />
          A lot of thoughtfulness.
        </h1>

        <p className="text-sm leading-relaxed text-[#777B76] sm:text-base max-w-2xl mx-auto">
          Instead of drawing names from a hat, each participant chooses a song title as their
          anonymous identity. You prepare a gift for a song and a wishlist—keeping the gift
          exchange spirit genuinely mysterious until gift day.
        </p>

        {/* Action CTAs */}
        <div className="pt-2 flex flex-col items-stretch sm:items-center sm:flex-row justify-center gap-3">
          <Link
            to="/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white shadow-xs hover:bg-[#274938] transition-colors"
          >
            Create an Exchange
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/join"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-6 py-3 text-sm font-medium text-[#262A27] hover:border-[#315B46] hover:text-[#315B46] transition-colors"
          >
            Join an Exchange
          </Link>
          <a
            href="/video-guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#B79B62]/40 bg-[#B79B62]/10 px-5 py-3 text-sm font-medium text-[#7A6232] hover:bg-[#B79B62]/20 transition-colors"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B79B62] text-white text-[9px] font-bold">▶</span>
            Watch Video Walkthrough
          </a>
        </div>
      </section>

      {/* Section B: For Organizers */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
              For Organizers
            </h2>
            <p className="text-xs text-[#777B76]">
              Coordinate your event with full administrative control while maintaining total secret anonymity.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              step: '1. Create Your Group',
              items: [
                'Set group name, occasion category & budget',
                'Specify event date & optional registration deadline',
                'Set participant limits (3–50) & wishlist guidelines',
                'Write custom gift instructions or theme guidelines',
              ],
            },
            {
              step: '2. Share Your Invitation',
              items: [
                'Copy the formatted public invitation message',
                'Share it in your Messenger, WhatsApp, or Slack group',
                'Keep your private organizer link saved to manage the group',
                'Participants join by choosing a song and saving their link',
              ],
            },
            {
              step: '3. Monitor & Assist',
              items: [
                'Track participant counts & completed wishlists',
                'Remove accidental duplicate slots before the draw',
                'Generate a fresh link if a participant forgets theirs',
                'Update details, budget, or event dates anytime',
              ],
            },
            {
              step: '4. Start the Draw (or Reset)',
              items: [
                'Close registration & trigger the cryptographically fair draw',
                'Participants reopen their private links to see their match',
                'Settings & instructions can still be edited after the draw',
                'Reset the draw anytime if plans change or people join late',
              ],
            },
          ].map((card) => (
            <div
              key={card.step}
              className="rounded-2xl border border-[#E8E6DF] bg-white p-5 sm:p-6 space-y-3 shadow-2xs"
            >
              <h3 className="font-editorial text-base sm:text-lg font-semibold text-[#262A27]">
                {card.step}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#777B76]">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#315B46]" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section C: For Participants */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#874B4B]/10 text-[#874B4B]">
            <Music className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
              For Participants
            </h2>
            <p className="text-xs text-[#777B76]">
              Four simple steps to joining, sharing your wishlist, and getting your mystery match.
            </p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: '01',
              title: 'Open Group Invite',
              desc: 'Click the public invitation link shared by your exchange organizer.',
            },
            {
              num: '02',
              title: 'Pick a Song Alias',
              desc: 'Choose a song title (e.g. Christian worship or uplifting song) as your secret identity.',
            },
            {
              num: '03',
              title: 'Build Wishlist & Save Link',
              desc: 'Add gift ideas, priorities, and save your private access link and recovery phrase.',
            },
            {
              num: '04',
              title: 'Reveal Your Recipient',
              desc: 'Reopen your private link after the draw to see your recipient’s song and wishlist!',
            },
          ].map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-2 shadow-2xs"
            >
              <span className="text-[11px] font-semibold tracking-widest text-[#B79B62]">
                STEP {step.num}
              </span>
              <h3 className="font-editorial text-base sm:text-lg font-semibold text-[#262A27]">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-[#777B76]">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Important Bookmark Notice */}
        <div className="rounded-2xl border border-[#B79B62]/40 bg-[#B79B62]/10 p-4 sm:p-5 flex items-start gap-3">
          <KeyRound className="h-5 w-5 text-[#B79B62] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#262A27] space-y-1">
            <p className="font-semibold">Save your private link upon joining!</p>
            <p className="text-[#777B76] leading-relaxed">
              We never collect your email or phone number. Bookmark your private link or keep your
              recovery phrase safe. You can also self-recover at any time on{' '}
              <Link to="/recover" className="text-[#315B46] font-medium underline">
                the recovery page
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Section D: How Anonymity Works */}
      <section className="rounded-3xl border border-[#E8E6DF] bg-white p-6 sm:p-8 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#262A27]">
            How Privacy &amp; Anonymity Work
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm text-[#777B76]">
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#315B46] mt-0.5" />
              <span>No personal data: No real names, emails, phone numbers, or social logins are stored.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#315B46] mt-0.5" />
              <span>Song titles act as your alias: Only the song title is visible to other participants.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#315B46] mt-0.5" />
              <span>Private wishlists: Only your assigned gift-giver can see your wishlist after the draw.</span>
            </li>
          </ul>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#315B46] mt-0.5" />
              <span>Zero-leak pairing: The organizer cannot view who is matched to whom.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#315B46] mt-0.5" />
              <span>Mathematical derangement: Server-side cryptographic algorithms guarantee zero self-matches.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B79B62] mt-0.5" />
              <span>Tip: Choose a song that reflects your personality, but doesn’t immediately give away your identity!</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section E: The Random Draw */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Shuffle className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            The Secret Matching Draw
          </h2>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-[#777B76]">
          Using cryptographically secure randomness on the server, the draw guarantees that no one receives
          their own song, every participant is assigned exactly one recipient, and every recipient gets
          exactly one giver.
        </p>

        {/* Illustrative assignment diagram */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 sm:p-6 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777B76] mb-3">
            Sample Matching Flow (Worship Songs)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                giver: '"Friend of God"',
                artist: 'Israel Houghton',
                recipient: '"Goodness of God"',
                recArtist: 'CeCe Winans',
              },
              {
                giver: '"Goodness of God"',
                artist: 'CeCe Winans',
                recipient: '"Ikaw Lamang"',
                recArtist: 'JIL Worship',
              },
              {
                giver: '"Ikaw Lamang"',
                artist: 'JIL Worship',
                recipient: '"Friend of God"',
                recArtist: 'Israel Houghton',
              },
            ].map((pair) => (
              <div
                key={pair.giver}
                className="flex flex-col items-center justify-center rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-4 text-center space-y-1"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#262A27] break-words">
                  {pair.giver}
                </span>
                <span className="text-[10px] text-[#777B76]">{pair.artist}</span>
                <span className="my-1 inline-flex items-center gap-1 rounded-full bg-[#315B46]/10 px-2 py-0.5 text-[10px] font-medium text-[#315B46]">
                  gives gift to ↓
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[#874B4B] break-words">
                  {pair.recipient}
                </span>
                <span className="text-[10px] text-[#777B76]">{pair.recArtist}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section F: Updated FAQs */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#E8E6DF] rounded-2xl border border-[#E8E6DF] bg-white shadow-2xs overflow-hidden">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4.5 text-left text-xs sm:text-sm font-medium text-[#262A27] hover:bg-[#F8F7F3]/60 transition-colors"
                >
                  <span className="leading-snug">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#777B76] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#315B46]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-6 sm:pb-5 text-xs sm:text-sm leading-relaxed text-[#777B76] animate-fade-in">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section G: CTA Banner */}
      <section className="rounded-3xl border border-[#E8E6DF] bg-white p-6 sm:p-10 text-center space-y-4 shadow-2xs">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
          <Gift className="h-6 w-6" />
        </span>
        <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#262A27]">
          Ready to start your song-based exchange?
        </h2>
        <p className="text-xs sm:text-sm text-[#777B76] max-w-md mx-auto">
          Create an exchange in under a minute and share the invite with your friends, family, or fellowship!
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/create"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#315B46] px-7 py-3 text-sm font-medium text-white hover:bg-[#274938] transition-colors"
          >
            Create an Exchange
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/join"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-7 py-3 text-sm font-medium text-[#262A27] hover:border-[#315B46] transition-colors"
          >
            Join with Code
          </Link>
        </div>
      </section>
    </div>
  );
}
