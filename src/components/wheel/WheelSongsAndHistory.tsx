import React, { useState } from 'react';
import type { WheelEntry, WheelWinnerRecord } from '../../types/exchange';

interface WheelSongsAndHistoryProps {
  entries: WheelEntry[];
  winnerHistory: WheelWinnerRecord[];
  isOrganizer: boolean;
  onAddEntry: (songTitle: string, artist?: string) => Promise<void>;
  onEditEntry: (entryId: string, songTitle: string, artist?: string) => Promise<void>;
  onToggleExclude: (entryId: string) => Promise<void>;
  onRemoveEntry: (entryId: string) => Promise<void>;
  onResetWheel?: () => Promise<void>;
  isDarkMode?: boolean;
  defaultTab?: 'songs' | 'history';
  forceTab?: 'songs' | 'history';
}

export const WheelSongsAndHistory: React.FC<WheelSongsAndHistoryProps> = ({
  entries,
  winnerHistory,
  isOrganizer,
  onAddEntry,
  onEditEntry,
  onToggleExclude,
  onRemoveEntry,
  onResetWheel,
  isDarkMode = false,
  defaultTab = 'songs',
  forceTab,
}) => {
  const [internalTab, setInternalTab] = useState<'songs' | 'history'>(defaultTab);
  const activeTab = forceTab ?? internalTab;

  // Triple-dot menu open state
  const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

  // Add entry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit entry modal
  const [editingEntry, setEditingEntry] = useState<WheelEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editing, setEditing] = useState(false);

  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const activeCount = entries.filter((e) => !e.excluded).length;
  const excludedCount = entries.filter((e) => e.excluded).length;

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setAdding(true);
      await onAddEntry(newTitle.trim(), newArtist.trim() || undefined);
      setNewTitle('');
      setNewArtist('');
      setShowAddModal(false);
    } finally {
      setAdding(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editTitle.trim()) return;
    try {
      setEditing(true);
      await onEditEntry(editingEntry.id, editTitle.trim(), editArtist.trim() || undefined);
      setEditingEntry(null);
    } finally {
      setEditing(false);
    }
  };

  const handleToggle = async (entryId: string) => {
    try {
      setActionBusyId(entryId);
      setOpenMenuEntryId(null);
      await onToggleExclude(entryId);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRemove = async (entryId: string) => {
    setOpenMenuEntryId(null);
    if (!window.confirm('Remove this song from the wheel?')) return;
    try {
      setActionBusyId(entryId);
      await onRemoveEntry(entryId);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmReset = async () => {
    if (!onResetWheel) return;
    try {
      setResetting(true);
      await onResetWheel();
      setShowResetConfirm(false);
    } finally {
      setResetting(false);
    }
  };

  const sortedHistory = [...winnerHistory].sort((a, b) => b.order - a.order);

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col h-full ${
        isDarkMode
          ? 'bg-[#18231C] border-[#2B3830] text-[#EDEBE6]'
          : 'bg-white border-[#E8E6DF] text-[#262A27]'
      }`}
    >
      {/* Tab Switcher: Songs / History (hidden on mobile/tablet when parent navigation directly controls tabs) */}
      <div
        className={`${forceTab ? 'hidden lg:grid' : 'grid'} grid-cols-2 rounded-xl p-1 mb-4 border transition-colors ${
          isDarkMode
            ? 'bg-[#141C16] border-[#253229]'
            : 'bg-[#F8F7F3] border-[#E8E6DF]'
        }`}
      >
        <button
          type="button"
          onClick={() => setInternalTab('songs')}
          className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'songs'
              ? 'bg-[#315B46] text-white shadow-xs font-semibold'
              : isDarkMode
                ? 'text-[#9BA39D] hover:text-white'
                : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          Songs ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setInternalTab('history')}
          className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#315B46] text-white shadow-xs font-semibold'
              : isDarkMode
                ? 'text-[#9BA39D] hover:text-white'
                : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          History ({winnerHistory.length})
        </button>
      </div>

      {/* SONGS TAB CONTENT */}
      {activeTab === 'songs' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
            <div>
              <h3 className="font-editorial text-lg font-semibold">Songs</h3>
              <p className="text-xs text-[#777B76]">
                {activeCount} active on wheel • {excludedCount} excluded
              </p>
            </div>

            {isOrganizer && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="text-xs px-3.5 py-1.5 rounded-full bg-[#315B46] hover:bg-[#274938] text-white font-medium transition-colors cursor-pointer shadow-2xs"
              >
                + Add Song
              </button>
            )}
          </div>

          {/* Songs List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] lg:max-h-[560px] pr-1">
            {entries.length === 0 ? (
              <div className="py-12 text-center text-[#777B76] text-xs">
                No songs on the wheel.
              </div>
            ) : (
              entries.map((entry) => {
                const isMenuOpen = openMenuEntryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`relative p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                      entry.excluded
                        ? isDarkMode
                          ? 'bg-[#141C16] border-[#202B23] opacity-40'
                          : 'bg-[#F8F7F3] border-[#E8E6DF] opacity-45'
                        : isDarkMode
                          ? 'bg-[#1E2C23] border-[#28372C]'
                          : 'bg-[#F8F7F3] border-[#E8E6DF]'
                    }`}
                  >
                    {/* Song Details: full width, no squishing */}
                    <div className="space-y-1 min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-sm font-semibold leading-snug break-words ${
                            entry.excluded ? 'line-through text-[#777B76]' : ''
                          }`}
                        >
                          &ldquo;{entry.songTitle}&rdquo;
                        </span>
                        {entry.source === 'manual' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#B79B62]/40 bg-[#B79B62]/10 text-[#7A6232] shrink-0">
                            Custom
                          </span>
                        )}
                      </div>

                      {entry.artist && (
                        <div className="text-xs text-[#777B76] break-words">
                          by <span className="font-medium">{entry.artist}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-[#777B76]">
                        {entry.slotNumber ? `Participant #${entry.slotNumber}` : 'Custom Entry'}
                      </div>
                    </div>

                    {/* Triple-Dot More Actions Menu */}
                    {isOrganizer && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          disabled={actionBusyId === entry.id}
                          onClick={() => setOpenMenuEntryId(isMenuOpen ? null : entry.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors cursor-pointer ${
                            isMenuOpen
                              ? 'bg-[#315B46] text-white border-[#315B46]'
                              : isDarkMode
                                ? 'border-[#2D3E32] bg-[#16201A] text-[#D8D5CE] hover:text-white hover:border-[#315B46]'
                                : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] hover:border-[#315B46]'
                          }`}
                          title="More options"
                          aria-label="More options"
                        >
                          ⋮
                        </button>

                        {/* Dropdown Popup */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenMenuEntryId(null)}
                            />
                            <div
                              className={`absolute right-0 top-9 z-30 w-36 rounded-xl border p-1 shadow-lg text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDarkMode
                                  ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
                                  : 'bg-white border-[#E8E6DF] text-[#262A27]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggle(entry.id)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDarkMode
                                    ? 'hover:bg-[#1E2C23]'
                                    : 'hover:bg-[#F8F7F3]'
                                }`}
                              >
                                {entry.excluded ? 'Restore to Wheel' : 'Exclude from Wheel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuEntryId(null);
                                  setEditingEntry(entry);
                                  setEditTitle(entry.songTitle);
                                  setEditArtist(entry.artist || '');
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDarkMode
                                    ? 'hover:bg-[#1E2C23]'
                                    : 'hover:bg-[#F8F7F3]'
                                }`}
                              >
                                Edit Song
                              </button>
                              <div className="my-1 border-t border-inherit opacity-60" />
                              <button
                                type="button"
                                onClick={() => handleRemove(entry.id)}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-[#874B4B] hover:bg-[#874B4B]/10 transition-colors cursor-pointer font-medium"
                              >
                                Remove from Wheel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB CONTENT */}
      {activeTab === 'history' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
            <div>
              <h3 className="font-editorial text-lg font-semibold">History</h3>
              <p className="text-xs text-[#777B76]">
                {winnerHistory.length === 0
                  ? 'No winners recorded yet'
                  : `${winnerHistory.length} total winner${winnerHistory.length === 1 ? '' : 's'}`}
              </p>
            </div>

            {isOrganizer && onResetWheel && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-[#2D3E32] bg-[#1E2C23] text-[#D8D5CE] hover:text-white'
                    : 'border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] hover:border-[#315B46]'
                }`}
                title="Reset wheel to start again from 1st winner"
              >
                Reset Round
              </button>
            )}
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] lg:max-h-[560px] pr-1">
            {sortedHistory.length === 0 ? (
              <div className="py-12 text-center text-[#777B76] text-xs">
                No winners yet. Spin the wheel to announce the first winner!
              </div>
            ) : (
              sortedHistory.map((item) => (
                <div
                  key={item.winnerId}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    isDarkMode
                      ? 'bg-[#1E2C23] border-[#28372C]'
                      : 'bg-[#F8F7F3] border-[#E8E6DF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[#B79B62]/40 bg-[#B79B62]/10 text-[#7A6232]">
                      {getOrdinal(item.order)} Winner
                    </span>
                    <span className="text-[11px] text-[#777B76]">
                      {new Date(item.wonAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-sm font-semibold leading-snug break-words">
                    &ldquo;{item.songTitle}&rdquo;
                  </div>

                  {item.artist && (
                    <div className="text-xs text-[#777B76] break-words mt-0.5">
                      by <span className="font-medium">{item.artist}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-[#777B76] pt-1.5">
                    {item.slotNumber ? `Participant #${item.slotNumber}` : 'Custom Entry'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className={`rounded-2xl border max-w-sm w-full p-6 space-y-4 shadow-xl text-left ${
              isDarkMode
                ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
                : 'bg-white border-[#E8E6DF] text-[#262A27]'
            }`}
          >
            <h4 className="font-editorial text-lg font-semibold">
              Reset Round?
            </h4>
            <p className="text-xs text-[#777B76] leading-relaxed">
              This will restore all songs back to the active wheel and clear winner history to start again from the 1st winner.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium rounded-full border border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleConfirmReset}
                className="px-5 py-2 text-xs font-medium rounded-full bg-[#874B4B] hover:bg-[#723B3B] text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddSubmit}
            className={`rounded-2xl border max-w-sm w-full p-6 space-y-4 shadow-xl text-left ${
              isDarkMode
                ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
                : 'bg-white border-[#E8E6DF] text-[#262A27]'
            }`}
          >
            <h4 className="font-editorial text-lg font-semibold">
              Add Song to Wheel
            </h4>
            <p className="text-xs text-[#777B76]">
              Add a custom song entry to the wheel for this event.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Song Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Last Christmas"
                  className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-[#315B46] ${
                    isDarkMode
                      ? 'bg-[#1E2C23] border-[#2D3E32] text-white'
                      : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Artist (Optional)
                </label>
                <input
                  type="text"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  placeholder="e.g. Wham!"
                  className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-[#315B46] ${
                    isDarkMode
                      ? 'bg-[#1E2C23] border-[#2D3E32] text-white'
                      : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={adding}
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-full border border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !newTitle.trim()}
                className="px-5 py-2 text-xs font-medium rounded-full bg-[#315B46] hover:bg-[#274938] text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Song'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className={`rounded-2xl border max-w-sm w-full p-6 space-y-4 shadow-xl text-left ${
              isDarkMode
                ? 'bg-[#18231C] border-[#2D3E32] text-[#EDEBE6]'
                : 'bg-white border-[#E8E6DF] text-[#262A27]'
            }`}
          >
            <h4 className="font-editorial text-lg font-semibold">
              Edit Song
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Song Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-[#315B46] ${
                    isDarkMode
                      ? 'bg-[#1E2C23] border-[#2D3E32] text-white'
                      : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Artist (Optional)
                </label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:border-[#315B46] ${
                    isDarkMode
                      ? 'bg-[#1E2C23] border-[#2D3E32] text-white'
                      : 'bg-[#F8F7F3] border-[#E8E6DF] text-[#262A27]'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={editing}
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 text-xs font-medium rounded-full border border-[#E8E6DF] bg-white text-[#777B76] hover:text-[#262A27] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editing || !editTitle.trim()}
                className="px-5 py-2 text-xs font-medium rounded-full bg-[#315B46] hover:bg-[#274938] text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {editing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
