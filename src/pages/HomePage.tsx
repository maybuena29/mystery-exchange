import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Disc3,
  Gift,
  Lock,
  Music,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-ambient relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:px-8">
          {/* Minimalist Scandinavian Evergreen & Music Line-Art Header Motif */}
          <div className="mx-auto mb-6 flex justify-center animate-fade-up" aria-hidden="true">
            <svg
              viewBox="0 0 220 44"
              className="h-10 w-52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 24C44 24 62 12 88 22"
                stroke="#E8E6DF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M208 24C176 24 158 12 132 22"
                stroke="#E8E6DF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M110 7L102 19H106.5L100 28H120L113.5 19H118L110 7Z"
                stroke="#315B46"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M110 28V35" stroke="#315B46" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="110" cy="4.5" r="2" fill="#B79B62" />
              <circle cx="88" cy="22" r="2" fill="#874B4B" />
              <circle cx="132" cy="22" r="2" fill="#B79B62" />
            </svg>
          </div>

          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#315B46] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#B79B62]" />
              A Different Kind of Gift Exchange
            </p>

            <h1 className="mt-7 font-editorial text-4xl font-semibold tracking-tight text-[#262A27] sm:text-6xl sm:leading-[1.08]">
              The <span className="text-[#874B4B]">season of giving</span> meets{' '}
              the <span className="italic font-medium text-[#315B46]">art of guessing.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#777B76] sm:text-lg">
              Share a song that represents you, create your wishlist, and discover who you&apos;re
              giving a gift to.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                to="/create"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#315B46] px-7 py-3.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#274938] hover:shadow-md sm:w-auto"
              >
                Create an Exchange
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/join"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-7 py-3.5 text-sm font-medium text-[#262A27] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#315B46] hover:text-[#315B46] sm:w-auto"
              >
                Join an Exchange
              </Link>
            </div>
          </div>

          {/* Subtle Editorial Song-Tag Preview */}
          <div className="mx-auto mt-14 max-w-2xl animate-fade-up">
            <div className="card-editorial rounded-2xl border border-[#E8E6DF] bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E8E6DF] bg-[#F8F7F3] text-[#874B4B]">
                    <Disc3 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B79B62]">
                      Anonymous Song Identity
                    </p>
                    <p className="font-editorial text-lg font-semibold text-[#262A27]">
                      &ldquo;Goodness of God&rdquo;
                      <span className="ml-2 text-xs font-sans font-normal text-[#777B76]">
                        · CeCe Winans · 4 wishlist items
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#315B46]/20 bg-[#315B46]/8 px-3 py-1 text-xs font-medium text-[#315B46]">
                    <Lock className="h-3 w-3" />
                    Real name hidden
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Simple Steps */}
      <section className="border-y border-[#E8E6DF] bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B79B62]">
              Simple by Design
            </p>
            <h2 className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
              Three quiet steps to a thoughtful exchange
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                step: 'Step 01',
                title: 'Choose Your Song',
                desc: 'Enter a song title as your anonymous identity. No real names, no email addresses, and no account sign-ups.',
                icon: Music,
                accent: 'text-[#315B46] group-hover:bg-[#315B46] group-hover:text-white',
              },
              {
                step: 'Step 02',
                title: 'Create Your Wishlist',
                desc: 'Add up to 20 gift ideas with descriptions, links, priorities, and optional preferences—then save your private access link.',
                icon: Gift,
                accent: 'text-[#874B4B] group-hover:bg-[#874B4B] group-hover:text-white',
              },
              {
                step: 'Step 03',
                title: 'Discover Your Mystery Match',
                desc: "Once the organizer starts the draw, reopen your private link to see your recipient's song and wishlist.",
                icon: Sparkles,
                accent: 'text-[#B79B62] group-hover:bg-[#B79B62] group-hover:text-white',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.step}
                  className="group rounded-2xl border border-[#E8E6DF] bg-[#F8F7F3]/55 p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[#315B46]/30 hover:bg-white hover:shadow-md"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E6DF] bg-white transition-colors duration-200 ${card.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#777B76]">
                    {card.step}
                  </p>
                  <h3 className="mt-1.5 font-editorial text-xl font-semibold text-[#262A27]">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#777B76]">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="card-editorial rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#315B46]">
                <ShieldCheck className="h-4 w-4" />
                Privacy-First Architecture
              </div>
              <h2 className="mt-3 font-editorial text-3xl font-semibold text-[#262A27]">
                Real names are never required. Submissions stay hidden.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#777B76] sm:text-base">
                Organizers only see aggregate counts—how many people have joined and how many
                wishlists are complete. Individual songs, wishlists, and match assignments are
                protected by server-side authorization and never sent to the organizer&apos;s
                browser.
              </p>
              <div className="mt-7 flex flex-wrap gap-5">
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#315B46] hover:underline"
                >
                  Read how it works
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#777B76] hover:text-[#262A27]"
                >
                  View privacy details
                </Link>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <div className="flex items-start gap-3.5 rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-4 transition-colors hover:border-[#315B46]/30">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#315B46]" />
                <div>
                  <p className="text-sm font-medium text-[#262A27]">Blind Organizer Mode</p>
                  <p className="mt-0.5 text-xs text-[#777B76]">
                    Even the host can join and play fairly without seeing who picked which song.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3.5 rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-4 transition-colors hover:border-[#874B4B]/30">
                <Music className="mt-0.5 h-4 w-4 shrink-0 text-[#874B4B]" />
                <div>
                  <p className="text-sm font-medium text-[#262A27]">Song-Only Identity</p>
                  <p className="mt-0.5 text-xs text-[#777B76]">
                    No accounts, no phone numbers, and no email spam. Just a song and a private
                    link.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
