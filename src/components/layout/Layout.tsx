import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Music, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${
      isActive ? 'text-[#315B46] font-medium' : 'text-[#777B76] hover:text-[#262A27]'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F3] text-[#262A27]">
      <header className="sticky top-0 z-40 border-b border-[#E8E6DF] bg-[#F8F7F3]/95 backdrop-blur-sm">
        {/* Subtle evergreen & gold seasonal top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#315B46] via-[#B79B62] to-[#874B4B]" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 text-[#262A27] transition-opacity hover:opacity-85"
          >
            {/* Custom minimalist evergreen + music + gift SVG emblem */}
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E6DF] bg-white shadow-xs">
              <svg
                viewBox="0 0 32 32"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M16 4L10.5 13H13.5L9 20H23L18.5 13H21.5L16 4Z"
                  stroke="#315B46"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M16 20V26" stroke="#315B46" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="22.5" cy="9.5" r="2" fill="#B79B62" />
                <path
                  d="M24.5 9.5V5.5L27 6.5"
                  stroke="#874B4B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="font-editorial text-lg font-semibold tracking-tight leading-none">
                HulaWho
              </span>
              <span className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[#777B76]">
                <Music className="h-2.5 w-2.5 text-[#B79B62]" />
                Song-Based Gift Exchange
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
            <NavLink to="/how-it-works" className={navLinkClass}>
              How It Works
            </NavLink>
            <NavLink to="/privacy" className={navLinkClass}>
              Privacy
            </NavLink>
            <NavLink to="/join" className={navLinkClass}>
              Join Exchange
            </NavLink>
            <Link
              to="/create"
              className="rounded-full bg-[#315B46] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#274938]"
            >
              Create Exchange
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-[#E8E6DF] bg-white p-2 text-[#262A27] md:hidden"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#E8E6DF] bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3" aria-label="Mobile navigation">
              <NavLink
                to="/how-it-works"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#262A27] hover:bg-[#F8F7F3]"
              >
                How It Works
              </NavLink>
              <NavLink
                to="/privacy"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#262A27] hover:bg-[#F8F7F3]"
              >
                Privacy
              </NavLink>
              <NavLink
                to="/join"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#262A27] hover:bg-[#F8F7F3]"
              >
                Join Exchange
              </NavLink>
              <Link
                to="/create"
                onClick={() => setMobileOpen(false)}
                className="mt-1 rounded-full bg-[#315B46] px-4 py-2.5 text-center text-sm font-medium text-white"
              >
                Create Exchange
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#E8E6DF] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="space-y-1">
            <p className="font-editorial text-base font-semibold text-[#262A27]">
              HulaWho
            </p>
            <p className="text-xs text-[#777B76]">
              Anonymous song-based gift exchanges. No real names, no accounts, no email required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#777B76]">
            <Link to="/how-it-works" className="hover:text-[#262A27] transition-colors">
              How It Works
            </Link>
            <Link to="/privacy" className="hover:text-[#262A27] transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[#262A27] transition-colors">
              Terms
            </Link>
            <a
              href="mailto:hello@mysteryexchange.example"
              className="hover:text-[#262A27] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
