import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ParticipantPreferences,
  WishlistCategory,
  WishlistItem,
  WishlistPriority,
} from '../../types/exchange';
import { formatCurrency } from '../../utils/format';

const WISHLIST_CATEGORIES: WishlistCategory[] = [
  'Gadgets',
  'Fashion',
  'Books',
  'Beauty',
  'Food',
  'Home',
  'Hobbies',
  'Experiences',
  'Other',
];

interface WishlistEditorProps {
  items: WishlistItem[];
  preferences: ParticipantPreferences;
  maxItems: number;
  currency: string;
  disabled?: boolean;
  onChangeItems: (items: WishlistItem[]) => void;
  onChangePreferences: (prefs: ParticipantPreferences) => void;
}

interface DraftItem {
  name: string;
  description: string;
  category: WishlistCategory;
  estimatedPrice: string;
  productUrl: string;
  imageUrl: string;
  priority: WishlistPriority;
}

const EMPTY_DRAFT: DraftItem = {
  name: '',
  description: '',
  category: 'Other',
  estimatedPrice: '',
  productUrl: '',
  imageUrl: '',
  priority: 'nice_to_have',
};

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function WishlistEditor({
  items,
  preferences,
  maxItems,
  currency,
  disabled = false,
  onChangeItems,
  onChangePreferences,
}: WishlistEditorProps) {
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(items.length === 0);

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setFormError(null);
  };

  const handleSaveItem = () => {
    const name = draft.name.trim();
    if (!name) {
      setFormError('Please enter an item name.');
      return;
    }
    if (!isValidHttpUrl(draft.productUrl)) {
      setFormError('Product URL must start with https:// or http://.');
      return;
    }
    if (!isValidHttpUrl(draft.imageUrl)) {
      setFormError('Image URL must start with https:// or http://.');
      return;
    }

    let estimatedPrice: number | undefined;
    if (draft.estimatedPrice.trim() !== '') {
      const parsed = Number(draft.estimatedPrice);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError('Estimated price must be a valid non-negative number.');
        return;
      }
      estimatedPrice = Math.round(parsed * 100) / 100;
    }

    if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId
          ? {
              ...item,
              name,
              description: draft.description.trim(),
              category: draft.category,
              estimatedPrice,
              productUrl: draft.productUrl.trim() || undefined,
              imageUrl: draft.imageUrl.trim() || undefined,
              priority: draft.priority,
            }
          : item
      );
      onChangeItems(updated);
      resetForm();
      setShowForm(false);
      return;
    }

    if (items.length >= maxItems) {
      setFormError(`You can add up to ${maxItems} wishlist items.`);
      return;
    }

    const newItem: WishlistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description: draft.description.trim(),
      category: draft.category,
      estimatedPrice,
      productUrl: draft.productUrl.trim() || undefined,
      imageUrl: draft.imageUrl.trim() || undefined,
      priority: draft.priority,
      order: items.length,
    };

    onChangeItems([...items, newItem]);
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (item: WishlistItem) => {
    setDraft({
      name: item.name,
      description: item.description,
      category: item.category,
      estimatedPrice: item.estimatedPrice !== undefined ? String(item.estimatedPrice) : '',
      productUrl: item.productUrl ?? '',
      imageUrl: item.imageUrl ?? '',
      priority: item.priority,
    });
    setEditingId(item.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const filtered = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, order: index }));
    onChangeItems(filtered);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    onChangeItems(copy.map((item, idx) => ({ ...item, order: idx })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-editorial text-xl font-semibold text-[#262A27]">
            Your Wishlist ({items.length}/{maxItems})
          </h3>
          <p className="text-sm text-[#777B76]">
            Add gift ideas with links and notes to help your mystery gift-giver.
          </p>
        </div>

        {!disabled && !showForm && items.length < maxItems && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#315B46] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#274938]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Item List */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-[#E8E6DF] bg-white p-4 sm:flex-row sm:items-start"
            >
              <div className="flex min-w-0 flex-1 gap-4">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="h-16 w-16 shrink-0 rounded-lg border border-[#E8E6DF] object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#262A27] break-words [overflow-wrap:anywhere]">
                      {item.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        item.priority === 'must_have'
                          ? 'bg-[#874B4B]/10 text-[#874B4B]'
                          : 'bg-[#F8F7F3] text-[#777B76] border border-[#E8E6DF]'
                      }`}
                    >
                      {item.priority === 'must_have' ? 'Must Have' : 'Nice to Have'}
                    </span>
                    <span className="rounded-full border border-[#E8E6DF] bg-[#F8F7F3] px-2.5 py-0.5 text-[11px] text-[#777B76]">
                      {item.category}
                    </span>
                    {item.estimatedPrice !== undefined && (
                      <span className="text-xs font-medium text-[#315B46]">
                        ~{formatCurrency(item.estimatedPrice, currency)}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-sm text-[#777B76] break-words [overflow-wrap:anywhere]">
                      {item.description}
                    </p>
                  )}

                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#315B46] hover:underline"
                    >
                      View product link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {!disabled && (
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg p-1.5 text-[#777B76] hover:bg-[#F8F7F3] hover:text-[#262A27] disabled:opacity-30"
                    aria-label="Move item up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="rounded-lg p-1.5 text-[#777B76] hover:bg-[#F8F7F3] hover:text-[#262A27] disabled:opacity-30"
                    aria-label="Move item down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-lg p-1.5 text-[#777B76] hover:bg-[#F8F7F3] hover:text-[#315B46]"
                    aria-label="Edit item"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-[#777B76] hover:bg-[#874B4B]/10 hover:text-[#874B4B]"
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Item Form */}
      {!disabled && showForm && (
        <div className="rounded-2xl border border-[#E8E6DF] bg-[#F8F7F3]/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#262A27]">
              {editingId ? 'Edit Wishlist Item' : 'New Wishlist Item'}
            </h4>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-xs text-[#777B76] hover:text-[#262A27]"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <p className="rounded-lg border border-[#874B4B]/30 bg-[#874B4B]/10 px-3 py-2 text-xs text-[#874B4B]">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Item Name <span className="text-[#874B4B]">*</span>
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g., Ceramic Pour-Over Dripper"
                maxLength={120}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Category</label>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as WishlistCategory })
                }
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              >
                {WISHLIST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">Priority</label>
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as WishlistPriority })
                }
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              >
                <option value="nice_to_have">Nice to Have</option>
                <option value="must_have">Must Have</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Estimated Price ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={draft.estimatedPrice}
                onChange={(e) => setDraft({ ...draft, estimatedPrice: e.target.value })}
                placeholder="e.g., 450"
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Product Link (optional)
              </label>
              <input
                type="url"
                value={draft.productUrl}
                onChange={(e) => setDraft({ ...draft, productUrl: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={draft.imageUrl}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
                Notes / Description (size, color, edition, etc.)
              </label>
              <textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Matte white or sage green, size M..."
                maxLength={400}
                className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] focus:border-[#315B46] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveItem}
              className="rounded-full bg-[#315B46] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#274938]"
            >
              {editingId ? 'Update Item' : 'Add to Wishlist'}
            </button>
          </div>
        </div>
      )}

      {/* Optional Preferences */}
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-4">
        <div>
          <h4 className="font-editorial text-lg font-semibold text-[#262A27]">
            Gift Preferences (Optional)
          </h4>
          <p className="text-xs text-[#777B76]">
            Help your mystery gift-giver get to know your taste without revealing who you are.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Hobbies & Interests
            </label>
            <input
              type="text"
              disabled={disabled}
              value={preferences.hobbies ?? ''}
              onChange={(e) =>
                onChangePreferences({ ...preferences, hobbies: e.target.value })
              }
              placeholder="e.g., Specialty coffee, journaling, cycling"
              maxLength={300}
              className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] disabled:bg-[#F8F7F3] focus:border-[#315B46] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Favorite Things
            </label>
            <input
              type="text"
              disabled={disabled}
              value={preferences.favorites ?? ''}
              onChange={(e) =>
                onChangePreferences({ ...preferences, favorites: e.target.value })
              }
              placeholder="e.g., Matcha, indie vinyl, cozy socks"
              maxLength={300}
              className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] disabled:bg-[#F8F7F3] focus:border-[#315B46] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Preferred Colors
            </label>
            <input
              type="text"
              disabled={disabled}
              value={preferences.preferredColors ?? ''}
              onChange={(e) =>
                onChangePreferences({ ...preferences, preferredColors: e.target.value })
              }
              placeholder="e.g., Forest green, cream, warm neutrals"
              maxLength={150}
              className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] disabled:bg-[#F8F7F3] focus:border-[#315B46] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#262A27]">
              Things to Avoid / Allergies
            </label>
            <input
              type="text"
              disabled={disabled}
              value={preferences.avoidItems ?? ''}
              onChange={(e) =>
                onChangePreferences({ ...preferences, avoidItems: e.target.value })
              }
              placeholder="e.g., Nuts, scented candles"
              maxLength={300}
              className="w-full rounded-xl border border-[#E8E6DF] bg-white px-3.5 py-2.5 text-sm text-[#262A27] disabled:bg-[#F8F7F3] focus:border-[#315B46] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
