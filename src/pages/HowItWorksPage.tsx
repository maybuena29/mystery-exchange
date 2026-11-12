import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Lock,
  Music,
  Shield,
  Shuffle,
  Users,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Do I need an account?',
    answer:
      'No. HulaWho does not use accounts, passwords, or logins. Each participant receives a unique private access link after joining.',
  },
  {
    question: 'Do I need to enter my real name?',
    answer:
      'No. Your song title is your anonymous identity for the entire exchange. We never ask for your real name, email address, or phone number.',
  },
  {
    question: 'Can the organizer see my song?',
    answer:
      'No. The organizer dashboard only displays aggregate counts (total participants and completed wishlists). Song titles are never sent to the organizer.',
  },
  {
    question: 'Can the organizer see my wishlist?',
    answer:
      'No. Only your assigned gift-giver can view your wishlist after the random draw is completed.',
  },
  {
    question: 'Can I receive my own song?',
    answer:
      'No. Our backend randomizer uses a mathematically verified derangement algorithm that guarantees zero self-assignments.',
  },
  {
    question: 'How do I see my assignment?',
    answer:
      'Bookmark or save your private access link when you join, then reopen that same link after the organizer starts the draw.',
  },
  {
    question: 'Can I edit my wishlist?',
    answer:
      'Yes, depending on the organizer’s settings. By default, wishlists can be edited before the draw, while your song identity remains locked after submission.',
  },
  {
    question: 'Can the draw be restarted?',
    answer:
      'No. Once the organizer confirms and finalizes the draw, assignments are permanently locked and cannot be reset or re-drawn.',
  },
  {
    question: 'What if I lose my private link?',
    answer:
      'Because we do not collect emails or phone numbers, recovery is not possible without your original private link. Please save or bookmark it immediately after joining.',
  },
  {
    question: 'How many participants are required?',
    answer:
      'At least 3 participants are required to run a fair anonymous draw, with a maximum of 50 participants per exchange.',
  },
  {
    question: 'Does the website send emails?',
    answer:
      'No. HulaWho does not collect email addresses or send automated emails.',
  },
];

export function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 space-y-20">
      {/* Section A: Introduction */}
      <section className="text-center max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#315B46]">
          How It Works
        </p>
        <h1 className="mt-3 font-editorial text-4xl font-semibold text-[#262A27] sm:text-5xl">
          A little mystery. A lot of thoughtfulness.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[#777B76]">
          Instead of drawing real names from a hat, each participant chooses a song title as their
          anonymous identity. You prepare a gift for a song and a wishlist—keeping the gift
          exchange spirit genuinely mysterious until gift day.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-6 py-3 text-sm font-medium text-white hover:bg-[#274938]"
          >
            Create an Exchange
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/join"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-6 py-3 text-sm font-medium text-[#262A27] hover:border-[#315B46]"
          >
            Join an Exchange
          </Link>
          <a
            href="/video-guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#B79B62]/40 bg-[#B79B62]/10 px-5 py-3 text-sm font-medium text-[#7A6232] hover:bg-[#B79B62]/20"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B79B62] text-white text-[9px] font-bold">▶</span>
            Watch Video Walkthrough
          </a>
        </div>
      </section>

      {/* Section B: For Organizers */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            For Organizers
          </h2>
        </div>
        <p className="text-sm text-[#777B76]">
          Organizers coordinate the event without ever seeing individual songs, wishlists, or who
          is assigned to whom.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              step: '1. Create Your Group',
              items: [
                'Set group name & category',
                'Event date & registration deadline',
                'Gift budget & currency (default PHP)',
                'Participant limit (3–50) & wishlist settings',
                'Custom exchange instructions',
              ],
            },
            {
              step: '2. Share Your Invitation',
              items: [
                'Copy the public invitation link',
                'Share it in your group chat or channel',
                'Keep your private organizer link safe for management',
              ],
            },
            {
              step: '3. Monitor Participants',
              items: [
                'View total participant count',
                'Track wishlist completion count',
                'Adjust event settings or close/reopen registration',
              ],
            },
            {
              step: '4. Start the Exchange',
              items: [
                'Close registration & lock submissions',
                'Run the cryptographically secure random draw',
                'Participants reopen their private links to view matches',
              ],
            },
          ].map((card) => (
            <div
              key={card.step}
              className="rounded-2xl border border-[#E8E6DF] bg-white p-6 space-y-3"
            >
              <h3 className="font-editorial text-lg font-semibold text-[#262A27]">{card.step}</h3>
              <ul className="space-y-1.5 text-sm text-[#777B76]">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#315B46]" />
                    <span>{item}</span>
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
          <Music className="h-5 w-5 text-[#874B4B]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            For Participants
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: '01',
              title: 'Join the Exchange',
              desc: 'Open the invitation link shared by your organizer.',
            },
            {
              num: '02',
              title: 'Choose Your Mystery Song',
              desc: 'Pick a song title (and optional artist) as your anonymous identity.',
            },
            {
              num: '03',
              title: 'Create Your Wishlist',
              desc: 'Add gift ideas, links, and preferences—then save your private access link.',
            },
            {
              num: '04',
              title: 'Discover Your Mystery Match',
              desc: 'Reopen your saved private link after the draw to see your recipient.',
            },
          ].map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-2"
            >
              <span className="text-xs font-semibold tracking-widest text-[#B79B62]">
                STEP {step.num}
              </span>
              <h3 className="font-editorial text-lg font-semibold text-[#262A27]">{step.title}</h3>
              <p className="text-sm text-[#777B76]">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#B79B62]/35 bg-[#B79B62]/10 p-4 text-sm text-[#262A27]">
          <strong>Important:</strong> Save or bookmark your private access link immediately after
          joining. You will reopen that same link after the draw to view your assigned recipient.
        </div>
      </section>

      {/* Section D: Anonymity */}
      <section className="rounded-3xl border border-[#E8E6DF] bg-white p-8 space-y-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27]">
            How Anonymity Works
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-[#777B76]">
          <ul className="space-y-2">
            <li>• No real names, emails, or phone numbers are collected.</li>
            <li>• Song titles act as anonymous participant identities.</li>
            <li>• Organizers see aggregate counts only—never individual submissions.</li>
          </ul>
          <ul className="space-y-2">
            <li>• Participants cannot browse other participants&apos; submissions.</li>
            <li>• Only the assigned gift-giver can view a recipient&apos;s wishlist after the draw.</li>
            <li>
              • <strong>Realistic limitation:</strong> If friends already know your signature song,
              they might recognize it—so pick a song that keeps the fun!
            </li>
          </ul>
        </div>
      </section>

      {/* Section E: Random Draw */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Shuffle className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            The Random Draw
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-[#777B76]">
          Using cryptographically secure randomness on the server (<code>crypto.getRandomValues</code>),
          the draw guarantees: no self-assignment, one recipient per participant, every participant
          assigned exactly once, and every song assigned exactly once.
        </p>

        {/* Illustrative assignment diagram */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#777B76] mb-4">
            Illustrative Assignment Diagram (Sample Songs)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                giver: '"Friend of God" (Israel Houghton)',
                recipient: '"Goodness of God" (CeCe Winans)',
              },
              {
                giver: '"Goodness of God" (CeCe Winans)',
                recipient: '"Ikaw Lamang" (JIL Worship)',
              },
              {
                giver: '"Ikaw Lamang" (JIL Worship)',
                recipient: '"Friend of God" (Israel Houghton)',
              },
            ].map((pair) => (
              <div
                key={pair.giver}
                className="flex flex-col items-center justify-center rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-4 text-center"
              >
                <span className="text-sm font-medium text-[#262A27]">{pair.giver}</span>
                <span className="my-1.5 text-xs text-[#315B46] font-medium">gives a gift to ↓</span>
                <span className="text-sm font-medium text-[#874B4B]">{pair.recipient}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section F: FAQ */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-[#315B46]" />
          <h2 className="font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#E8E6DF] rounded-2xl border border-[#E8E6DF] bg-white">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-medium text-[#262A27] hover:bg-[#F8F7F3]/60"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#777B76] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-sm leading-relaxed text-[#777B76]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section G: Final CTA */}
      <section className="rounded-3xl border border-[#E8E6DF] bg-white p-10 text-center">
        <Gift className="mx-auto h-7 w-7 text-[#315B46]" />
        <h2 className="mt-4 font-editorial text-3xl font-semibold text-[#262A27]">
          Ready to make gift-giving more exciting?
        </h2>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-7 py-3 text-sm font-medium text-white hover:bg-[#274938]"
          >
            Create an Exchange
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/join"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-7 py-3 text-sm font-medium text-[#262A27] hover:border-[#315B46]"
          >
            Join an Exchange
          </Link>
        </div>
      </section>
    </div>
  );
}
