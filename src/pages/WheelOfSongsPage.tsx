import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { wheelService } from '../services/api';
import type { WheelEntry, WheelViewState, WheelWinnerRecord } from '../types/exchange';
import { WheelCanvas } from '../components/wheel/WheelCanvas';
import { WinnerModal } from '../components/wheel/WinnerModal';
import { WheelSongsAndHistory } from '../components/wheel/WheelSongsAndHistory';
import { isSoundMuted, toggleSound } from '../utils/wheelAudio';
import {
  getOrganizerToken,
  saveOrganizerToken,
  clearOrganizerToken,
  getSuperAdminKey,
} from '../services/credentialService';

export const WheelOfSongsPage: React.FC = () => {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<WheelViewState | null>(null);

  // Theme state: defaults to light (signature Christmas parchment), toggleable to midnight fir
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mystery_wheel_theme') === 'dark';
  });

  // Audio state
  const [soundEnabled, setSoundEnabled] = useState(!isSoundMuted());

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Spinning & Target state
  const [isSpinning, setIsSpinning] = useState(false);
  const isSpinningRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);
  const lastObservedSpinIdRef = useRef<string | null>(null);
  const pendingSpinResultRef = useRef<{
    winner: WheelWinnerRecord;
    remainingCount: number;
    entries: WheelEntry[];
    winnerHistory: WheelWinnerRecord[];
  } | null>(null);
  const [currentWinnerModal, setCurrentWinnerModal] = useState<WheelWinnerRecord | null>(null);

  // Organizer Token Resolution: checks URL hash, me_org_{groupId}, or Super Admin key
  const [organizerToken, setOrganizerToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const foundToken = getOrganizerToken(groupId);
    if (foundToken) return foundToken;
    const saKey = getSuperAdminKey();
    if (saKey) return saKey.startsWith('sa_') ? saKey : `sa_${saKey}`;
    return null;
  });

  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(false);

  // Mobile view switcher ('wheel' | 'songs' | 'history')
  const [mobileView, setMobileView] = useState<'wheel' | 'songs' | 'history'>('wheel');

  // Load wheel state
  const fetchState = useCallback(async () => {
    if (!groupId) return;
    if (isSpinningRef.current || isModalOpenRef.current) return;
    try {
      const data = await wheelService.getWheelState(groupId, organizerToken);

      // Spectator live spin synchronization: if organizer spun, trigger smooth spin animation on spectator view
      if (!organizerToken && data.currentSpin) {
        const spinAge = Date.now() - Date.parse(data.currentSpin.spunAt);
        if (spinAge >= 0 && spinAge < data.currentSpin.durationMs) {
          if (!isSpinningRef.current && lastObservedSpinIdRef.current !== data.currentSpin.entryId) {
            lastObservedSpinIdRef.current = data.currentSpin.entryId;
            setTargetEntryId(data.currentSpin.entryId);
            setIsSpinning(true);
            isSpinningRef.current = true;
            return;
          }
        }
      }

      setViewState((prev) => {
        if (
          !prev ||
          prev.winnerHistory.length !== data.winnerHistory.length ||
          prev.entries.length !== data.entries.length ||
          prev.isOrganizer !== data.isOrganizer
        ) {
          return data;
        }
        return prev;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load wheel state');
    } finally {
      setLoading(false);
    }
  }, [groupId, organizerToken]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  // Periodic polling for spectator live sync (every 3 seconds when not spinning)
  useEffect(() => {
    if (isSpinning) return;
    const timer = setInterval(() => {
      void fetchState();
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchState, isSpinning]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const active = toggleSound();
    setSoundEnabled(active);
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('mystery_wheel_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Primary Spin Trigger
  const handleSpinClick = async () => {
    if (!viewState || !groupId || isSpinning) return;

    if (!organizerToken) {
      setShowTokenPrompt(true);
      return;
    }

    const eligible = viewState.entries.filter((e) => !e.excluded);
    if (eligible.length === 0) {
      alert('All eligible songs on the wheel have already won. Use Reset Round to start again.');
      return;
    }

    // Pick random eligible entry
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];

    try {
      setIsSpinning(true);
      isSpinningRef.current = true;
      // Persist the spin in backend immediately
      const res = await wheelService.spin(groupId, chosen.id, organizerToken);
      pendingSpinResultRef.current = res;

      // Trigger physics animation towards this chosen entry
      setTargetEntryId(chosen.id);
    } catch (err) {
      setIsSpinning(false);
      isSpinningRef.current = false;
      alert(err instanceof Error ? err.message : 'Unable to spin the wheel.');
    }
  };

  // Callback when physics deceleration animation stops
  const handleSpinEnd = (winningEntry: WheelEntry) => {
    setIsSpinning(false);
    isSpinningRef.current = false;
    setTargetEntryId(null);

    const spinResult = pendingSpinResultRef.current;
    if (spinResult) {
      // Keep entries and history unchanged until organizer reviews modal and clicks Continue!
      isModalOpenRef.current = true;
      setCurrentWinnerModal(spinResult.winner);
    } else {
      isModalOpenRef.current = true;
      const fallbackWinner: WheelWinnerRecord = {
        winnerId: `win_${Date.now()}`,
        entryId: winningEntry.id,
        participantId: winningEntry.participantId,
        order: (viewState?.winnerHistory.length || 0) + 1,
        songTitle: winningEntry.songTitle,
        artist: winningEntry.artist,
        slotNumber: winningEntry.slotNumber,
        wonAt: new Date().toISOString(),
      };
      setCurrentWinnerModal(fallbackWinner);
    }
  };

  // Reveal winner on the active wheel & history ONLY when Continue is clicked in modal
  const handleContinueFromModal = async () => {
    const winner = currentWinnerModal;
    setCurrentWinnerModal(null);
    isModalOpenRef.current = false;
    if (!winner || !groupId) return;

    if (organizerToken) {
      try {
        const res = await wheelService.revealWinner(groupId, winner.winnerId, organizerToken);
        setViewState((prev) =>
          prev
            ? {
                ...prev,
                entries: res.entries,
                winnerHistory: res.winnerHistory,
                totalActiveCount: res.totalActiveCount,
                totalWinnersCount: res.totalWinnersCount,
              }
            : prev
        );
      } catch (err) {
        console.error('Failed to commit reveal to server:', err);
        setViewState((prev) => {
          if (!prev) return prev;
          const updatedEntries = prev.entries.filter((e) => e.id !== winner.entryId);
          const updatedHistory = [winner, ...prev.winnerHistory.filter((w) => w.winnerId !== winner.winnerId)];
          return {
            ...prev,
            entries: updatedEntries,
            winnerHistory: updatedHistory,
            totalActiveCount: updatedEntries.filter((e) => !e.excluded).length,
            totalWinnersCount: updatedHistory.length,
          };
        });
      } finally {
        pendingSpinResultRef.current = null;
      }
    } else {
      setViewState((prev) => {
        if (!prev) return prev;
        const updatedEntries = prev.entries.filter((e) => e.id !== winner.entryId);
        const updatedHistory = [winner, ...prev.winnerHistory.filter((w) => w.winnerId !== winner.winnerId)];
        return {
          ...prev,
          entries: updatedEntries,
          winnerHistory: updatedHistory,
          totalActiveCount: updatedEntries.filter((e) => !e.excluded).length,
          totalWinnersCount: updatedHistory.length,
        };
      });
      void fetchState();
    }
  };

  // Entry Management Handlers
  const handleAddEntry = async (songTitle: string, artist?: string) => {
    if (!groupId || !organizerToken) return;
    const res = await wheelService.addEntry(groupId, songTitle, artist, organizerToken);
    setViewState((prev) => (prev ? { ...prev, entries: res.entries } : prev));
  };

  const handleEditEntry = async (entryId: string, songTitle: string, artist?: string) => {
    if (!groupId || !organizerToken) return;
    const res = await wheelService.editEntry(groupId, entryId, songTitle, artist, organizerToken);
    setViewState((prev) => (prev ? { ...prev, entries: res.entries } : prev));
  };

  const handleToggleExclude = async (entryId: string) => {
    if (!groupId || !organizerToken) return;
    const res = await wheelService.toggleExcludeEntry(groupId, entryId, organizerToken);
    setViewState((prev) => (prev ? { ...prev, entries: res.entries } : prev));
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (!groupId || !organizerToken) return;
    const res = await wheelService.removeEntry(groupId, entryId, organizerToken);
    setViewState((prev) => (prev ? { ...prev, entries: res.entries } : prev));
  };

  const handleResetWheel = async () => {
    if (!groupId || !organizerToken) return;
    const res = await wheelService.resetWheel(groupId, organizerToken);
    setViewState((prev) =>
      prev
        ? {
            ...prev,
            entries: res.entries,
            winnerHistory: [],
            totalActiveCount: res.entries.filter((e) => !e.excluded).length,
            totalWinnersCount: 0,
          }
        : prev
    );
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !groupId) return;
    const token = tokenInput.trim();
    setVerifyingToken(true);
    setTokenError(null);
    try {
      const data = await wheelService.getWheelState(groupId, token);
      if (!data.isOrganizer) {
        setTokenError('The token entered does not have organizer privileges for this group.');
        return;
      }
      saveOrganizerToken(groupId, token);
      setOrganizerToken(token);
      setViewState(data);
      setShowTokenPrompt(false);
      setTokenInput('');
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Could not verify token.');
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleLogoutOrganizer = () => {
    if (!groupId) return;
    clearOrganizerToken(groupId);
    setOrganizerToken(null);
    void fetchState();
  };

  const isOrganizerMode = !!viewState?.isOrganizer;
  const activeEntriesCount = viewState?.entries.filter((e) => !e.excluded).length || 0;

  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${
          isDarkMode ? 'bg-[#121814] text-[#EDEBE6]' : 'bg-[#F8F7F3] text-[#262A27]'
        }`}
      >
        <div className="w-8 h-8 border-3 border-[#315B46]/20 border-t-[#315B46] rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#777B76]">Loading Wheel of Songs...</p>
      </div>
    );
  }

  if (error || !viewState) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${
          isDarkMode ? 'bg-[#121814] text-[#EDEBE6]' : 'bg-[#F8F7F3] text-[#262A27]'
        }`}
      >
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 max-w-sm w-full text-center space-y-3 shadow-xs">
          <h2 className="font-editorial text-xl font-semibold text-[#262A27]">Wheel Unavailable</h2>
          <p className="text-xs text-[#874B4B]">{error || 'Could not load wheel.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-full border border-[#E8E6DF] text-xs font-medium text-[#262A27] hover:border-[#315B46]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDarkMode ? 'bg-[#121814] text-[#EDEBE6]' : 'bg-[#F8F7F3] text-[#262A27]'
      }`}
    >
      {/* Top seasonal accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#315B46] via-[#B79B62] to-[#874B4B]" />

      {/* Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-sm px-4 py-3 sm:px-6 transition-colors ${
          isDarkMode
            ? 'bg-[#121814]/90 border-[#222E26]'
            : 'bg-[#F8F7F3]/90 border-[#E8E6DF]'
        }`}
      >
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isOrganizerMode || organizerToken || location.pathname.includes('/organizer/')) {
                  navigate(`/organizer/${groupId}`);
                } else if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate(`/join/${groupId}`);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-[#2D3E32] bg-[#1A251E] text-[#D8D5CE] hover:text-white'
                  : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] hover:border-[#315B46]'
              }`}
            >
              <span>←</span>
              <span>{isOrganizerMode || organizerToken || location.pathname.includes('/organizer/') ? 'Dashboard' : 'Exit'}</span>
            </button>

            <div>
              <h1 className="font-editorial text-base sm:text-lg font-semibold leading-tight truncate max-w-[180px] sm:max-w-md">
                {viewState.groupName}
              </h1>
              <p className="text-[11px] text-[#777B76]">
                Wheel of Songs • {activeEntriesCount} active song{activeEntriesCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Organizer Login / Logout */}
            {!isOrganizerMode ? (
              <button
                type="button"
                onClick={() => {
                  setTokenError(null);
                  setShowTokenPrompt(true);
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode
                    ? 'border-[#315B46] bg-[#1E2C23] text-emerald-300 hover:bg-[#315B46] hover:text-white'
                    : 'border-[#315B46] bg-[#315B46]/10 text-[#315B46] hover:bg-[#315B46] hover:text-white'
                }`}
                title="Log in as Organizer to spin and manage songs"
              >
                <span>🔐</span>
                <span className="hidden xs:inline sm:inline">Organizer Login</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogoutOrganizer}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  isDarkMode
                    ? 'border-[#2D3E32] bg-[#1A251E] text-[#777B76] hover:text-red-400'
                    : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-red-600'
                }`}
                title="Lock organizer controls and view as Spectator"
              >
                <span>🔒</span>
                <span className="hidden sm:inline">Lock Controls</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                isDarkMode
                  ? 'border-[#2D3E32] bg-[#1A251E] text-[#B59458] hover:text-white'
                  : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] hover:border-[#315B46]'
              }`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                soundEnabled
                  ? 'border-[#B79B62]/40 bg-[#B79B62]/10 text-[#7A6232]'
                  : isDarkMode
                    ? 'border-[#2D3E32] bg-[#1A251E] text-[#777B76]'
                    : 'border-[#E8E6DF] bg-white text-[#777B76]'
              }`}
              title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            >
              <span>{soundEnabled ? '🔊' : '🔇'}</span>
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDarkMode
                  ? 'border-[#2D3E32] bg-[#1A251E] text-[#D8D5CE] hover:text-white'
                  : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] hover:border-[#315B46]'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <span>{isFullscreen ? '🗗' : '⛶'}</span>
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full Screen'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Spectator Notice */}
      {!isOrganizerMode && (
        <div
          className={`px-4 py-2 text-center text-xs border-b flex items-center justify-center gap-2 flex-wrap ${
            isDarkMode
              ? 'bg-[#18231C] border-[#253229] text-[#A6B2A8]'
              : 'bg-[#B79B62]/10 border-[#B79B62]/20 text-[#7A6232]'
          }`}
        >
          <span>Spectator Mode — Live view for participants. Results update in real-time.</span>
          <button
            type="button"
            onClick={() => {
              setTokenError(null);
              setShowTokenPrompt(true);
            }}
            className="font-medium underline cursor-pointer hover:opacity-80"
          >
            Organizer login
          </button>
        </div>
      )}

      {/* Mobile & Tablet View Switcher (Wheel vs Songs vs History) */}
      <div
        className={`lg:hidden flex border-b px-2 py-1.5 gap-1.5 ${
          isDarkMode ? 'bg-[#151D18] border-[#222E26]' : 'bg-[#EFECE6] border-[#E8E6DF]'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileView('wheel')}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer truncate ${
            mobileView === 'wheel'
              ? 'bg-[#315B46] text-white shadow-xs font-semibold'
              : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          Wheel ({activeEntriesCount})
        </button>
        <button
          type="button"
          onClick={() => setMobileView('songs')}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer truncate ${
            mobileView === 'songs'
              ? 'bg-[#315B46] text-white shadow-xs font-semibold'
              : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          Songs ({activeEntriesCount})
        </button>
        <button
          type="button"
          onClick={() => setMobileView('history')}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer truncate ${
            mobileView === 'history'
              ? 'bg-[#315B46] text-white shadow-xs font-semibold'
              : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          History ({viewState.winnerHistory.length})
        </button>
      </div>

      {/* Main Content Layout - Prominent wheel (8 cols) and compact side box (4 cols) */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 2xl:gap-16 items-start">
          {/* WHEEL SECTION (8 cols on desktop - significantly larger display) */}
          <div
            className={`lg:col-span-8 flex flex-col items-center justify-center space-y-6 ${
              mobileView === 'wheel' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div
              className="w-full max-w-[340px] xs:max-w-[440px] sm:max-w-[540px] md:max-w-[620px] lg:max-w-[700px] xl:max-w-[760px] 2xl:max-w-[800px] aspect-square flex items-center justify-center"
              style={{ aspectRatio: '1 / 1' }}
            >
              <WheelCanvas
                entries={viewState.entries}
                onSpinEnd={handleSpinEnd}
                isSpinning={isSpinning}
                targetEntryId={targetEntryId}
                disabled={!isOrganizerMode}
                onSpinRequest={handleSpinClick}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Spin CTA Button for Organizer */}
            {isOrganizerMode ? (
              <div className="w-full max-w-sm text-center space-y-2">
                <button
                  type="button"
                  disabled={isSpinning || activeEntriesCount === 0}
                  onClick={handleSpinClick}
                  className={`w-full py-3.5 px-6 rounded-full font-medium text-sm sm:text-base shadow-sm transition-all cursor-pointer ${
                    isSpinning || activeEntriesCount === 0
                      ? isDarkMode
                        ? 'bg-[#1E2822] text-[#606E64] cursor-not-allowed'
                        : 'bg-[#E8E6DF] text-[#777B76] cursor-not-allowed'
                      : 'bg-[#315B46] hover:bg-[#274938] text-white active:scale-[0.99]'
                  }`}
                >
                  {isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Spinning...
                    </span>
                  ) : activeEntriesCount === 0 ? (
                    'All Songs Have Won'
                  ) : (
                    'Spin the Wheel'
                  )}
                </button>
                <p className="text-xs text-[#777B76]">
                  {activeEntriesCount === 0
                    ? 'Use "Reset Round" to start over from 1st winner.'
                    : 'Click to select the next lucky winner'}
                </p>
              </div>
            ) : (
              <div
                className={`text-center py-3 px-5 rounded-2xl text-xs max-w-sm space-y-1.5 shadow-2xs ${
                  isDarkMode
                    ? 'bg-[#18231C] border border-[#253229] text-[#8E9C92]'
                    : 'bg-white border border-[#E8E6DF] text-[#777B76]'
                }`}
              >
                <p>Waiting for the organizer to spin...</p>
                <button
                  type="button"
                  onClick={() => {
                    setTokenError(null);
                    setShowTokenPrompt(true);
                  }}
                  className="font-medium text-[#315B46] hover:underline cursor-pointer block mx-auto text-xs"
                >
                  Are you the organizer? Log in to spin
                </button>
              </div>
            )}
          </div>

          {/* COMBINED SONGS & HISTORY PANEL (4 cols on desktop - centered on tablet & mobile) */}
          <div
            className={`lg:col-span-4 w-full flex justify-center lg:justify-end ${
              mobileView !== 'wheel' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="w-full max-w-md md:max-w-lg mx-auto lg:mx-0 lg:max-w-[420px] xl:max-w-[440px]">
              <WheelSongsAndHistory
                entries={viewState.entries}
                winnerHistory={viewState.winnerHistory}
                isOrganizer={isOrganizerMode}
                onAddEntry={handleAddEntry}
                onEditEntry={handleEditEntry}
                onToggleExclude={handleToggleExclude}
                onRemoveEntry={handleRemoveEntry}
                onResetWheel={handleResetWheel}
                isDarkMode={isDarkMode}
                forceTab={mobileView === 'wheel' ? undefined : mobileView}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Winner Announcement Modal */}
      <WinnerModal
        winner={currentWinnerModal}
        groupName={viewState.groupName}
        onClose={handleContinueFromModal}
        isDarkMode={isDarkMode}
      />

      {/* Organizer Token Prompt Modal */}
      {showTokenPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveToken}
            className={`rounded-2xl border max-w-sm w-full p-6 space-y-4 shadow-xl text-left ${
              isDarkMode
                ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
                : 'bg-white border-[#E8E6DF] text-[#262A27]'
            }`}
          >
            <h4 className="font-editorial text-lg font-semibold">
              Organizer Login
            </h4>
            <p className="text-xs text-[#777B76]">
              Enter your Organizer Token or Super Admin Secret to unlock controls.
            </p>

            {tokenError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {tokenError}
              </div>
            )}

            <div>
              <input
                type="password"
                required
                disabled={verifyingToken}
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTokenError(null);
                }}
                placeholder="org_..."
                className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-[#315B46] ${
                  isDarkMode
                    ? 'bg-[#1E2C23] border-[#2D3E32] text-white'
                    : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                }`}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={verifyingToken}
                onClick={() => {
                  setShowTokenPrompt(false);
                  setTokenError(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-full border border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyingToken}
                className="px-5 py-2 text-xs font-medium rounded-full bg-[#315B46] hover:bg-[#274938] text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {verifyingToken ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Unlock</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
