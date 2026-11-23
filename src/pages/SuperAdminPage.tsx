import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { adminService } from '../services/api';
import {
  clearSuperAdminKey,
  getSuperAdminKey,
  saveSuperAdminKey,
} from '../services/credentialService';
import type {
  AdminGroupSummary,
  AdminOverviewResponse,
  EventStatus,
} from '../types/exchange';
import { formatBudget, formatDate } from '../utils/format';

type ActiveTab = 'groups' | 'reports';

export function SuperAdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(() => getSuperAdminKey());
  const [keyInput, setKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('groups');
  const [loading, setLoading] = useState(Boolean(adminKey));
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Data
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'participants' | 'eventDate'>('newest');

  // Modals & Inspect
  const [inspectGroup, setInspectGroup] = useState<AdminGroupSummary | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<AdminGroupSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Change Modal
  const [statusModalGroup, setStatusModalGroup] = useState<AdminGroupSummary | null>(null);
  const [targetStatus, setTargetStatus] = useState<EventStatus>('DRAWN');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  }, []);

  const loadOverview = useCallback(
    async (key: string, isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setDataError(null);
      try {
        const res = await adminService.getOverview(key);
        setOverview(res);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch platform data.';
        setDataError(msg);
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          clearSuperAdminKey();
          setAdminKey(null);
          setAuthError('Super Admin session expired or access key invalid.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (adminKey) {
      loadOverview(adminKey);
    }
  }, [adminKey, loadOverview]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setAuthError('Please enter the Super Admin master key.');
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      await adminService.authenticate(trimmed);
      saveSuperAdminKey(trimmed, rememberKey);
      setAdminKey(trimmed);
      setKeyInput('');
      await loadOverview(trimmed);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid Super Admin master key.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSuperAdminKey();
    setAdminKey(null);
    setOverview(null);
    setAuthError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete || !adminKey) return;
    setIsDeleting(true);
    try {
      await adminService.deleteGroup(groupToDelete.groupId, adminKey);
      showToast(`Group "${groupToDelete.groupName}" was deleted.`);
      setGroupToDelete(null);
      await loadOverview(adminKey, true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete group.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openStatusModal = (g: AdminGroupSummary) => {
    setStatusModalGroup(g);
    setTargetStatus(g.status);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalGroup || !adminKey) return;
    setIsUpdatingStatus(true);
    try {
      const res = await adminService.updateGroupStatus(
        statusModalGroup.groupId,
        targetStatus,
        adminKey
      );
      showToast(res.message);
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) =>
            g.groupId === statusModalGroup.groupId ? { ...g, status: targetStatus } : g
          ),
        };
      });
      setInspectGroup((prev) =>
        prev?.groupId === statusModalGroup.groupId ? { ...prev, status: targetStatus } : prev
      );
      setStatusModalGroup(null);
      void loadOverview(adminKey, true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update group status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`);
    } catch {
      showToast('Could not copy automatically. Please copy manually.');
    }
  };

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    if (!overview?.groups) return [];
    let list = [...overview.groups];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.groupName.toLowerCase().includes(q) ||
          g.groupId.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.anonymousSlots?.some((s) => s.songTitle.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((g) => g.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter((g) => g.category === categoryFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'participants') {
        return b.participantCount - a.participantCount;
      }
      if (sortBy === 'eventDate') {
        const da = a.eventDate ? Date.parse(a.eventDate) : 0;
        const db = b.eventDate ? Date.parse(b.eventDate) : 0;
        return db - da;
      }
      // default: newest
      const ca = Date.parse(a.createdAt || '') || 0;
      const cb = Date.parse(b.createdAt || '') || 0;
      return cb - ca;
    });

    return list;
  }, [overview?.groups, searchQuery, statusFilter, categoryFilter, sortBy]);

  // CSV Export
  const exportCsv = () => {
    if (!overview?.groups || overview.groups.length === 0) {
      alert('No groups to export.');
      return;
    }

    const headers = [
      'Group ID',
      'Group Name',
      'Category',
      'Status',
      'Event Date',
      'Budget Amount',
      'Currency',
      'Participants Count',
      'Wishlists Completed',
      'Created At',
      'Drawn At',
      'Public Invite Link',
    ];

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const rows = overview.groups.map((g) => [
      `"${g.groupId}"`,
      `"${g.groupName.replace(/"/g, '""')}"`,
      `"${g.category}"`,
      `"${g.status}"`,
      `"${g.eventDate || ''}"`,
      `"${g.budget.amount ?? ''}"`,
      `"${g.budget.currency}"`,
      g.participantCount,
      g.completedWishlistCount,
      `"${g.createdAt}"`,
      `"${g.drawnAt || ''}"`,
      `"${origin}${g.invitationUrl}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hulawho_groups_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Groups report CSV exported!');
  };

  // Toast banner
  const toastBanner = toastMessage && (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#262A27] px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in">
      <CheckCircle2 className="h-4 w-4 text-[#7BB898]" />
      <span>{toastMessage}</span>
    </div>
  );

  // 1. Password Gate View (if not logged in)
  if (!adminKey) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        {toastBanner}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 shadow-xs">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#315B46]/10 text-[#315B46]">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-4 font-editorial text-2xl font-semibold text-[#262A27]">
              HulaWho Super Admin
            </h1>
            <p className="mt-1 text-xs text-[#777B76]">
              Platform-wide administration, group directories, and reports.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            {authError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label htmlFor="masterKey" className="block text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                Super Admin Master Key
              </label>
              <div className="relative mt-1">
                <input
                  id="masterKey"
                  type={showKeyInput ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter administrator secret key"
                  className="w-full rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] px-3.5 py-2.5 pr-10 text-sm text-[#262A27] focus:border-[#315B46] focus:bg-white focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#777B76] hover:text-[#262A27]"
                  title={showKeyInput ? 'Hide key' : 'Show key'}
                >
                  {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#777B76]">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded border-[#E8E6DF] text-[#315B46] focus:ring-[#315B46]"
                />
                <span>Remember on this browser</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#315B46] px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-[#274938] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Unlock Admin Portal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !overview) {
    return <LoadingScreen title="Accessing platform storage..." subtitle="Gathering groups directory and system telemetry" />;
  }

  const stats = overview?.stats;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {toastBanner}

      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8E6DF] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#315B46]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#315B46]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#315B46] animate-pulse" />
              Super Admin Control
            </span>
            <span className="text-xs text-[#777B76]">All Groups & Metrics</span>
          </div>
          <h1 className="mt-1 font-editorial text-2xl font-semibold text-[#262A27] sm:text-3xl">
            HulaWho Admin Portal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => adminKey && loadOverview(adminKey, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] bg-white px-3.5 py-2 text-xs font-medium text-[#262A27] shadow-2xs hover:bg-[#F8F7F3] disabled:opacity-50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DF] bg-white px-3.5 py-2 text-xs font-medium text-[#262A27] shadow-2xs hover:bg-[#F8F7F3] transition-colors"
            title="Export CSV Report"
          >
            <Download className="h-3.5 w-3.5 text-[#315B46]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            title="Log out of Super Admin"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {dataError && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{dataError}</span>
          </div>
          <button
            onClick={() => adminKey && loadOverview(adminKey)}
            className="font-medium underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-[#E8E6DF]">
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'text-[#315B46] border-b-2 border-[#315B46]'
              : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Groups Directory</span>
          <span className="rounded-full bg-[#E8E6DF] px-2 py-0.5 text-xs text-[#262A27]">
            {overview?.groups?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'reports'
              ? 'text-[#315B46] border-b-2 border-[#315B46]'
              : 'text-[#777B76] hover:text-[#262A27]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Reports & Analytics</span>
        </button>
      </div>

      {/* TAB 1: GROUPS DIRECTORY */}
      {activeTab === 'groups' && (
        <div className="mt-6 space-y-6">
          {/* Quick Metrics Ribbon */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777B76]">
                  Total Groups
                </span>
                <p className="mt-1 font-editorial text-2xl font-semibold text-[#262A27]">
                  {stats.totalGroups}
                </p>
                <span className="text-[11px] text-[#777B76]">All-time created</span>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777B76]">
                  Active Exchanges
                </span>
                <p className="mt-1 font-editorial text-2xl font-semibold text-[#315B46]">
                  {stats.activeGroups}
                </p>
                <span className="text-[11px] text-[#777B76]">Collecting or ready</span>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777B76]">
                  Participants Joined
                </span>
                <p className="mt-1 font-editorial text-2xl font-semibold text-[#262A27]">
                  {stats.totalParticipants}
                </p>
                <span className="text-[11px] text-[#777B76]">Across all groups</span>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777B76]">
                  Draws Finalized
                </span>
                <p className="mt-1 font-editorial text-2xl font-semibold text-[#B79B62]">
                  {stats.totalDrawsCompleted}
                </p>
                <span className="text-[11px] text-[#777B76]">
                  {stats.drawCompletionRate}% completion rate
                </span>
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777B76]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by group name, ID, category, or song..."
                  className="w-full rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] pl-9 pr-3.5 py-2 text-xs text-[#262A27] focus:border-[#315B46] focus:bg-white focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#777B76] hover:text-[#262A27]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-medium text-[#777B76] shrink-0 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Status:
                </span>
                {['ALL', 'CREATED', 'COLLECTING', 'READY', 'DRAWN', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0 ${
                      statusFilter === st
                        ? 'bg-[#315B46] text-white'
                        : 'bg-[#F8F7F3] text-[#777B76] hover:text-[#262A27]'
                    }`}
                  >
                    {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-filters row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E6DF]/60 text-xs text-[#777B76]">
              <div className="flex items-center gap-2">
                <span>Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-xs text-[#262A27] focus:border-[#315B46] focus:outline-hidden"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Christmas">Christmas</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Office Exchange">Office Exchange</option>
                  <option value="Family Exchange">Family Exchange</option>
                  <option value="Friends Exchange">Friends Exchange</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'participants' | 'eventDate')}
                  className="rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-xs text-[#262A27] focus:border-[#315B46] focus:outline-hidden"
                >
                  <option value="newest">Newest Created</option>
                  <option value="participants">Most Participants</option>
                  <option value="eventDate">Event Date</option>
                </select>
                <span className="ml-2 font-medium text-[#262A27]">
                  Showing {filteredGroups.length} of {overview?.groups.length ?? 0} groups
                </span>
              </div>
            </div>
          </div>

          {/* Groups Table / List */}
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-[#777B76]" />
              <h3 className="mt-2 text-sm font-semibold text-[#262A27]">No groups match the filter</h3>
              <p className="mt-1 text-xs text-[#777B76]">
                Try adjusting your search terms or status filters.
              </p>
              {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCategoryFilter('ALL');
                  }}
                  className="mt-3 text-xs font-medium text-[#315B46] underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E8E6DF] bg-white shadow-2xs">
              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-[#E8E6DF]">
                {filteredGroups.map((g) => {
                  const fullInvite = typeof window !== 'undefined' ? `${window.location.origin}${g.invitationUrl}` : g.invitationUrl;
                  const fullOrganizer = typeof window !== 'undefined' ? `${window.location.origin}${g.organizerUrl}` : g.organizerUrl;

                  return (
                    <div key={g.groupId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-[#262A27] truncate">
                            {g.groupName}
                          </h4>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#777B76]">
                            <span className="rounded-sm bg-[#E8E6DF] px-1.5 py-0.5 font-mono text-[10px]">
                              {g.groupId}
                            </span>
                            <span>·</span>
                            <span>{g.category}</span>
                            <span>·</span>
                            <span>{g.createdAt ? formatDate(g.createdAt) : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={g.status} />
                          <button
                            type="button"
                            onClick={() => openStatusModal(g)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#E8E6DF] bg-white px-2 py-0.5 text-[11px] font-medium text-[#262A27] hover:border-[#315B46] hover:text-[#315B46] transition-colors"
                            title="Change event status"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Change</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F7F3] p-2.5 rounded-xl">
                        <div>
                          <span className="text-[#777B76] text-[10px] block">Participants</span>
                          <span className="font-medium text-[#262A27]">
                            {g.participantCount} joined ({g.completedWishlistCount} ready)
                          </span>
                        </div>
                        <div>
                          <span className="text-[#777B76] text-[10px] block">Budget &amp; Date</span>
                          <span className="font-medium text-[#262A27]">
                            {formatBudget(g.budget)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullInvite, 'Invite link')}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-[#E8E6DF] bg-white py-1.5 px-2 text-xs font-medium text-[#262A27] hover:bg-[#F8F7F3]"
                        >
                          <Copy className="h-3 w-3 text-[#777B76]" />
                          <span>Invite</span>
                        </button>

                        <a
                          href={g.organizerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#315B46] py-1.5 px-2 text-xs font-medium text-white hover:bg-[#274938]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Organizer</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullOrganizer, 'Organizer master link')}
                          className="p-1.5 rounded-lg border border-[#E8E6DF] text-[#777B76] hover:bg-[#F8F7F3]"
                          title="Copy organizer master URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectGroup(g)}
                          className="p-1.5 rounded-lg border border-[#E8E6DF] text-[#315B46] hover:bg-[#315B46]/10"
                          title="Inspect details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setGroupToDelete(g)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Delete group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E8E6DF] bg-[#F8F7F3] font-semibold text-[#777B76] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Group Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Participants</th>
                      <th className="px-4 py-3">Event &amp; Budget</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Links &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DF]">
                    {filteredGroups.map((g) => {
                      const fullInvite = typeof window !== 'undefined' ? `${window.location.origin}${g.invitationUrl}` : g.invitationUrl;
                      const fullOrganizer = typeof window !== 'undefined' ? `${window.location.origin}${g.organizerUrl}` : g.organizerUrl;

                      return (
                        <tr key={g.groupId} className="hover:bg-[#F8F7F3]/60 transition-colors">
                          {/* Group Details */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-[#262A27]">
                                {g.groupName}
                              </span>
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#777B76]">
                                <span className="rounded-sm bg-[#E8E6DF] px-1.5 py-0.5 font-mono text-[10px]">
                                  {g.groupId}
                                </span>
                                <span>·</span>
                                <span>{g.category}</span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={g.status} />
                              <button
                                type="button"
                                onClick={() => openStatusModal(g)}
                                className="inline-flex items-center gap-1 rounded-md border border-[#E8E6DF] bg-white px-2 py-0.5 text-[11px] font-medium text-[#262A27] hover:border-[#315B46] hover:text-[#315B46] transition-colors"
                                title="Change event status"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Change</span>
                              </button>
                            </div>
                          </td>

                          {/* Participants Progress */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-[#262A27]">
                                {g.participantCount} joined
                              </span>
                              <span className="text-[11px] text-[#777B76]">
                                {g.completedWishlistCount} / {g.participantCount} wishlists ready
                              </span>
                              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#E8E6DF]">
                                <div
                                  className="h-full bg-[#315B46] rounded-full transition-all"
                                  style={{
                                    width: `${
                                      g.participantCount > 0
                                        ? Math.round((g.completedWishlistCount / g.participantCount) * 100)
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Event & Budget */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col text-[11px]">
                              <span className="text-[#262A27] font-medium">
                                {formatBudget(g.budget)}
                              </span>
                              <span className="text-[#777B76]">
                                {g.eventDate ? formatDate(g.eventDate) : 'No date set'}
                              </span>
                            </div>
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-[#777B76]">
                            {g.createdAt ? formatDate(g.createdAt) : '—'}
                          </td>

                          {/* Action Links & Buttons */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Copy Public Invite Link */}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fullInvite, 'Invite link')}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-[11px] font-medium text-[#262A27] hover:bg-[#F8F7F3] transition-colors"
                                title="Copy public participant invite link"
                              >
                                <Copy className="h-3 w-3 text-[#777B76]" />
                                <span>Invite</span>
                              </button>

                              {/* Open Organizer Dashboard */}
                              <a
                                href={g.organizerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-[#315B46] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#274938] transition-colors"
                                title="Open group organizer dashboard with master admin rights"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Organizer</span>
                              </a>

                              {/* Copy Organizer Master Link */}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fullOrganizer, 'Organizer master link')}
                                className="p-1 rounded-lg border border-[#E8E6DF] text-[#777B76] hover:text-[#262A27] hover:bg-[#F8F7F3]"
                                title="Copy organizer master URL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>

                              {/* Inspect Details */}
                              <button
                                type="button"
                                onClick={() => setInspectGroup(g)}
                                className="p-1 rounded-lg border border-[#E8E6DF] text-[#315B46] hover:bg-[#315B46]/10"
                                title="Inspect group slots & settings"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Group */}
                              <button
                                type="button"
                                onClick={() => setGroupToDelete(g)}
                                className="p-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                title="Delete group (Super Admin)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTS & ANALYTICS */}
      {activeTab === 'reports' && stats && (
        <div className="mt-6 space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                  Total Exchanges
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
                  <Layers className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
                {stats.totalGroups}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#777B76]">
                <span className="text-[#315B46] font-medium">{stats.activeGroups} active</span>
                <span>·</span>
                <span className="text-[#B79B62] font-medium">{stats.totalDrawsCompleted} drawn</span>
                <span>·</span>
                <span>{stats.cancelledGroups} cancelled</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                  Total Participants
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-editorial text-3xl font-semibold text-[#262A27]">
                {stats.totalParticipants}
              </p>
              <p className="mt-2 text-xs text-[#777B76]">
                Avg{' '}
                {stats.totalGroups > 0 ? (stats.totalParticipants / stats.totalGroups).toFixed(1) : 0}{' '}
                participants per exchange
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                  Wishlists Completed
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#315B46]/10 text-[#315B46]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-editorial text-3xl font-semibold text-[#315B46]">
                {stats.wishlistCompletionRate}%
              </p>
              <p className="mt-2 text-xs text-[#777B76]">
                {stats.totalWishlistsCompleted} of {stats.totalParticipants} completed
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#777B76]">
                  Draw Completion Rate
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B79B62]/10 text-[#B79B62]">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-editorial text-3xl font-semibold text-[#B79B62]">
                {stats.drawCompletionRate}%
              </p>
              <p className="mt-2 text-xs text-[#777B76]">
                {stats.totalDrawsCompleted} groups completed the secret draw
              </p>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Status Distribution */}
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
                <h3 className="font-editorial text-base font-semibold text-[#262A27]">
                  Exchange Status Breakdown
                </h3>
                <span className="text-xs text-[#777B76]">Total: {stats.totalGroups}</span>
              </div>

              <div className="mt-4 space-y-3">
                {Object.entries(stats.statusCounts).map(([st, count]) => {
                  const pct = stats.totalGroups > 0 ? Math.round((count / stats.totalGroups) * 100) : 0;
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#262A27]">{st.replace('_', ' ')}</span>
                        <span className="text-[#777B76]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F8F7F3]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            st === 'DRAWN' || st === 'COMPLETED'
                              ? 'bg-[#B79B62]'
                              : st === 'CANCELLED'
                              ? 'bg-red-400'
                              : 'bg-[#315B46]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
                <h3 className="font-editorial text-base font-semibold text-[#262A27]">
                  Category Popularity
                </h3>
                <span className="text-xs text-[#777B76]">Occasion types</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(stats.categoryCounts).map(([cat, count]) => {
                  const pct = stats.totalGroups > 0 ? Math.round((count / stats.totalGroups) * 100) : 0;
                  return (
                    <div
                      key={cat}
                      className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3 text-center"
                    >
                      <span className="block text-xs font-semibold text-[#262A27] truncate">
                        {cat}
                      </span>
                      <span className="mt-1 block font-editorial text-xl font-bold text-[#315B46]">
                        {count}
                      </span>
                      <span className="text-[10px] text-[#777B76]">{pct}% of groups</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Platform Activity Timeline */}
          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#315B46]" />
                <h3 className="font-editorial text-base font-semibold text-[#262A27]">
                  Recent Platform Activity Feed
                </h3>
              </div>
              <span className="text-xs text-[#777B76]">Latest system events</span>
            </div>

            <div className="mt-4 divide-y divide-[#E8E6DF]/60">
              {stats.recentActivity.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#777B76]">No recorded activity yet.</p>
              ) : (
                stats.recentActivity.map((act) => (
                  <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        act.type === 'draw_completed'
                          ? 'bg-[#B79B62]/20 text-[#B79B62]'
                          : 'bg-[#315B46]/10 text-[#315B46]'
                      }`}
                    >
                      {act.type === 'draw_completed' ? (
                        <Sparkles className="h-3.5 w-3.5" />
                      ) : (
                        <Layers className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#262A27] truncate">
                          {act.groupName}
                        </span>
                        <span className="text-[11px] text-[#777B76] shrink-0">
                          {formatDate(act.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[#777B76]">{act.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT GROUP MODAL */}
      {inspectGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl animate-fade-in overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8E6DF] px-6 py-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#777B76]">
                  Inspect Exchange Group
                </span>
                <h3 className="font-editorial text-lg font-semibold text-[#262A27]">
                  {inspectGroup.groupName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectGroup(null)}
                className="p-1 rounded-lg text-[#777B76] hover:bg-[#F8F7F3]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-[#F8F7F3] p-3">
                <div>
                  <span className="text-[#777B76] block">Group ID</span>
                  <span className="font-mono font-medium text-[#262A27]">{inspectGroup.groupId}</span>
                </div>
                <div>
                  <span className="text-[#777B76] block">Category</span>
                  <span className="font-medium text-[#262A27]">{inspectGroup.category}</span>
                </div>
                <div>
                  <span className="text-[#777B76] block mb-1">Status</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={inspectGroup.status} />
                    <button
                      type="button"
                      onClick={() => openStatusModal(inspectGroup)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E8E6DF] bg-white px-2 py-0.5 text-[11px] font-medium text-[#262A27] hover:border-[#315B46] hover:text-[#315B46] transition-colors"
                      title="Change status"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[#777B76] block">Budget</span>
                  <span className="font-medium text-[#262A27]">
                    {formatBudget(inspectGroup.budget)}
                  </span>
                </div>
              </div>

              {inspectGroup.instructions && (
                <div>
                  <span className="font-semibold text-[#262A27] block mb-1">
                    Organizer Instructions
                  </span>
                  <p className="rounded-xl border border-[#E8E6DF] bg-white p-3 text-[#777B76]">
                    {inspectGroup.instructions}
                  </p>
                </div>
              )}

              {/* Participant Slots Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#262A27]">
                    Participant Song Slots ({inspectGroup.anonymousSlots?.length ?? 0})
                  </span>
                  <span className="text-[#777B76]">
                    {inspectGroup.completedWishlistCount} wishlists completed
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#E8E6DF]">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F7F3] text-[10px] uppercase font-semibold text-[#777B76]">
                      <tr>
                        <th className="px-3 py-2">Slot</th>
                        <th className="px-3 py-2">Song Title</th>
                        <th className="px-3 py-2">Joined</th>
                        <th className="px-3 py-2">Wishlist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6DF]">
                      {inspectGroup.anonymousSlots && inspectGroup.anonymousSlots.length > 0 ? (
                        inspectGroup.anonymousSlots.map((s) => (
                          <tr key={s.slotId} className="hover:bg-[#F8F7F3]/50">
                            <td className="px-3 py-2 font-mono text-[11px]">#{s.slotNumber}</td>
                            <td className="px-3 py-2 font-medium text-[#262A27]">
                              {s.songTitle}
                              {s.artist && <span className="text-[#777B76] text-[11px] block">{s.artist}</span>}
                            </td>
                            <td className="px-3 py-2 text-[#777B76] text-[11px]">
                              {formatDate(s.joinedAt)}
                            </td>
                            <td className="px-3 py-2">
                              {s.wishlistCompleted ? (
                                <span className="inline-flex items-center gap-1 text-[#315B46] font-medium text-[11px]">
                                  <Check className="h-3 w-3" /> Ready
                                </span>
                              ) : (
                                <span className="text-[#777B76] text-[11px]">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-[#777B76]">
                            No participants joined yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#E8E6DF] px-6 py-3 bg-[#F8F7F3]">
              <div className="flex items-center gap-2">
                <a
                  href={inspectGroup.organizerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#315B46] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#274938]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Launch Organizer</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    copyToClipboard(`${origin}${inspectGroup.invitationUrl}`, 'Invite link');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E8E6DF] bg-white px-3 py-1.5 text-xs font-medium text-[#262A27] hover:bg-[#F8F7F3]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Invite</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectGroup(null)}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-[#777B76] hover:text-[#262A27]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE STATUS MODAL */}
      {statusModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !isUpdatingStatus && setStatusModalGroup(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E8E6DF] bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#315B46]">
                  Super Admin Override
                </span>
                <h3 className="font-editorial text-xl font-semibold text-[#262A27]">
                  Change Event Status
                </h3>
              </div>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setStatusModalGroup(null)}
                className="p-1 rounded-lg text-[#777B76] hover:bg-[#F8F7F3]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-[#E8E6DF] bg-[#F8F7F3] p-3.5 space-y-1 text-xs">
              <span className="text-[#777B76] block">Target Group</span>
              <p className="font-semibold text-sm text-[#262A27] truncate">
                {statusModalGroup.groupName}
              </p>
              <p className="font-mono text-[11px] text-[#777B76]">
                ID: {statusModalGroup.groupId}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#777B76]">
                Current Status
              </label>
              <div>
                <StatusBadge status={statusModalGroup.status} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#262A27]">
                Select New Status
              </label>
              <select
                value={targetStatus}
                disabled={isUpdatingStatus}
                onChange={(e) => setTargetStatus(e.target.value as EventStatus)}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3 py-2.5 text-xs font-medium text-[#262A27] focus:border-[#315B46] focus:outline-hidden"
              >
                <option value="CREATED">CREATED — Initial event created</option>
                <option value="COLLECTING">COLLECTING — Open for joins &amp; wishlist entries</option>
                <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED — Participant joins locked</option>
                <option value="READY">READY — All participants ready for secret draw</option>
                <option value="LOCKED">LOCKED — Draw executing</option>
                <option value="DRAWN">DRAWN — Mystery matches revealed to participants</option>
                <option value="COMPLETED">COMPLETED — Event concluded</option>
                <option value="CANCELLED">CANCELLED — Exchange cancelled</option>
              </select>
            </div>

            <div className="rounded-xl border border-[#315B46]/20 bg-[#315B46]/5 p-3 text-xs text-[#262A27] space-y-1">
              <p className="font-semibold text-[#315B46]">Status Behavior:</p>
              <p className="text-[#777B76] leading-relaxed">
                Selecting <span className="font-semibold text-[#262A27]">DRAWN</span> lets participants reveal their mystery matches and edit wishlists (if allowed). Selecting <span className="font-semibold text-[#262A27]">COMPLETED</span> marks the exchange finished. No changes are saved until you click the update button below.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E6DF]">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setStatusModalGroup(null)}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#777B76] hover:text-[#262A27] hover:bg-[#F8F7F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || targetStatus === statusModalGroup.status}
                onClick={() => void handleConfirmStatusChange()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#315B46] px-5 py-2 text-xs font-semibold text-white hover:bg-[#274938] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {isUpdatingStatus ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <span>Update Main Event Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRM MODAL */}
      <ConfirmModal
        isOpen={Boolean(groupToDelete)}
        title="Delete Exchange Group?"
        message={`Are you sure you want to permanently delete "${groupToDelete?.groupName}" (ID: ${groupToDelete?.groupId})? This removes the group and all its participant data from platform storage. This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        cancelLabel="Cancel"
        destructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setGroupToDelete(null)}
      />
    </div>
  );
}
