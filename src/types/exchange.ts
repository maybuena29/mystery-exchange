export type EventStatus =
  | 'CREATED'
  | 'COLLECTING'
  | 'REGISTRATION_CLOSED'
  | 'READY'
  | 'LOCKED'
  | 'DRAWN'
  | 'COMPLETED'
  | 'CANCELLED';

export type EventCategory =
  | 'Christmas'
  | 'Birthday'
  | 'Office Exchange'
  | 'Family Exchange'
  | 'Friends Exchange'
  | 'Custom';

export type WishlistCategory =
  | 'Gadgets'
  | 'Fashion'
  | 'Books'
  | 'Beauty'
  | 'Food'
  | 'Home'
  | 'Hobbies'
  | 'Experiences'
  | 'Other';

export type WishlistPriority = 'must_have' | 'nice_to_have';

export interface WishlistItem {
  id: string;
  name: string;
  description: string;
  category: WishlistCategory;
  estimatedPrice?: number;
  productUrl?: string;
  imageUrl?: string;
  priority: WishlistPriority;
  order: number;
}

export interface ParticipantPreferences {
  hobbies?: string;
  favorites?: string;
  preferredColors?: string;
  avoidItems?: string;
}

export interface BudgetSettings {
  amount?: number;
  min?: number;
  max?: number;
  currency: string;
}

export interface GroupSettings {
  maxParticipants: number;
  maxWishlistItems: number;
  allowEditBeforeDraw: boolean;
  allowEditAfterDraw: boolean;
  requireCompletedWishlist: boolean;
}

export interface PublicGroupInfo {
  groupId: string;
  groupName: string;
  description?: string;
  category: EventCategory;
  eventDate?: string;
  registrationDeadline?: string;
  instructions?: string;
  budget: BudgetSettings;
  settings: GroupSettings;
  status: EventStatus;
  participantCount: number;
  isOpenForJoining: boolean;
}

export interface DrawReadiness {
  isReady: boolean;
  reasons: string[];
}

export interface AnonymousSlot {
  slotNumber: number;
  slotId: string;
  songTitle: string;
  artist?: string;
  joinedAt: string;
  wishlistCompleted: boolean;
}

export interface OrganizerGroupView extends PublicGroupInfo {
  completedWishlistCount: number;
  anonymousSlots: AnonymousSlot[];
  drawReadiness: DrawReadiness;
  createdAt: string;
  updatedAt: string;
  drawnAt?: string;
}

export interface GiftChecklist {
  reviewedWishlist: boolean;
  choseGift: boolean;
  purchasedGift: boolean;
  wrappedGift: boolean;
  readyToBring: boolean;
}

export interface GiftProgress {
  checklist: GiftChecklist;
  privateNotes: string;
  updatedAt: string;
}

export interface AssignedRecipientView {
  songTitle: string;
  artist?: string;
  wishlist: WishlistItem[];
  preferences: ParticipantPreferences;
  finalizedAt: string;
}

export interface ParticipantSessionView {
  group: PublicGroupInfo;
  songTitle: string;
  artist?: string;
  wishlist: WishlistItem[];
  preferences: ParticipantPreferences;
  wishlistCompleted: boolean;
  joinedAt: string;
  canEditWishlist: boolean;
  assignment?: AssignedRecipientView;
  giftProgress?: GiftProgress;
}

export interface CreateGroupPayload {
  groupName: string;
  description?: string;
  category?: EventCategory;
  eventDate?: string;
  registrationDeadline?: string;
  instructions?: string;
  budget: BudgetSettings;
  settings: Partial<GroupSettings>;
}

export interface CreateGroupResponse {
  groupId: string;
  organizerToken: string;
  group: OrganizerGroupView;
}

export interface JoinGroupPayload {
  groupId: string;
  songTitle: string;
  artist?: string;
  recoveryPhrase?: string;
  wishlist: Omit<WishlistItem, 'id' | 'order'>[];
  preferences?: ParticipantPreferences;
}

export interface JoinGroupResponse {
  privateToken: string;
  session: ParticipantSessionView;
}
