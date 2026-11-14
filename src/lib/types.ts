/**
 * Response shapes returned by the LifeSphere API. Request bodies come from the generated OpenAPI
 * types (see `Body<>` in api.ts); responses are described here because the API documents them in code.
 */
export type ID = string;
export type ISO = string;
export type Day = string; // YYYY-MM-DD

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ------------------------------------------------------------------ identity
export type StaffRole = 'support' | 'moderator' | 'privacy_officer' | 'provider_reviewer' | 'content_admin' | 'super_admin';
export type Feature = 'lifeos' | 'household' | 'familycare' | 'community' | 'consumer' | 'services' | 'assistant' | 'documents' | 'agents';
export type Theme = 'system' | 'light' | 'dark' | 'high_contrast';

export interface Accessibility {
  textScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  voiceNavigation: boolean;
  screenReaderHints: boolean;
  simpleConfirmations: boolean;
}

export interface Preferences {
  theme: Theme;
  accessibility: Accessibility;
  dashboardWidgets: { key: string; enabled: boolean; order: number }[];
  disabledFeatures: Feature[];
  lockScreenDetail: 'none' | 'generic' | 'full';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  aiEnabled: boolean;
  aiStoreHistory: boolean;
  /** null until the person says what they use LifeSphere for. */
  homeMode: HomeMode | null;
}

export type HomeMode = 'standard' | 'caregiver' | 'cared_for';

export interface Locality {
  id: ID;
  name: string;
  city: string;
  state: string;
  country?: string;
  pincodePrefix?: string | null;
}

/** GET /v1/countries */
export interface CountryInfo {
  code: string;
  dialCode: string | null;
  currency: string;
  emergency: string;
  timezone: string;
  language: string;
}

export interface Me {
  id: ID;
  status: 'active' | 'disabled' | 'pending_deletion' | 'deleted';
  phone: string | null;
  phoneMasked: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailMasked: string | null;
  emailVerified: boolean;
  deletionRequestedAt: ISO | null;
  createdAt: ISO;
  profile: {
    displayName: string;
    avatarAttachmentId: ID | null;
    locale: string;
    timezone: string;
    /** ISO 3166-1 alpha-2, e.g. "IN", "GB". */
    country: string | null;
    countryDefaults: { code: string; currency: string; emergency: string; timezone: string; language: string };
    seniorMode: boolean;
    discoverable: boolean;
    bio: string | null;
    locality: Locality | null;
  };
  preferences: Preferences;
  staffRoles: StaffRole[];
  session: { id: ID; mfaVerified: boolean };
  mfa: MfaStatus;
}

export interface MfaStatus {
  totpEnabled: boolean;
  enabledAt: ISO | null;
  recoveryCodesRemaining: number;
}

export interface SessionInfo {
  id: ID;
  deviceName: string | null;
  platform: string | null;
  createdAt: ISO;
  lastUsedAt: ISO;
  expiresAt: ISO;
  mfaVerified: boolean;
  current: boolean;
}

export interface OtpChallenge {
  challengeId: ID;
  expiresAt: ISO;
  sentTo: string;
  devCode?: string;
}

export type LoginResult =
  | { status: 'authenticated'; user: { id: ID; isNew: boolean }; sessionId: ID }
  | { status: 'mfa_required'; mfaToken: string; mfaTokenExpiresAt: ISO };

export interface ActivityItem {
  id: ID;
  action: string;
  actorType: 'user' | 'staff' | 'system';
  targetType: string | null;
  createdAt: ISO;
  metadata: Record<string, unknown>;
  byMe: boolean;
}

// ------------------------------------------------------------------ dashboard
export interface DashboardTask {
  id: ID;
  title: string;
  dueAt: ISO | null;
  priority: TaskPriority;
  status: TaskStatus;
  householdId: ID | null;
}

export interface Dashboard {
  generatedAt: ISO;
  timezone: string;
  seniorMode: boolean;
  widgets: { key: string; enabled: boolean; order: number }[];
  todayTasks?: DashboardTask[];
  overdueTaskCount?: number;
  upcomingReminders?: { id: ID; title: string; fireAt: ISO; taskId: ID | null; eventId: ID | null }[];
  myCheckIns?: { id: ID; scheduleId: ID; dueAt: ISO; state: CheckInState }[];
  peopleICheckOn?: { userId: ID; displayName: string; eventId: ID; dueAt: ISO; state: CheckInState }[];
  familyActivity?: { id: ID; title: string; kind: EventKind; startsAt: ISO; ownerUserId: ID; householdId: ID | null }[];
  pendingGrantsToReview?: number;
  pendingTaskAssignments?: { id: ID; taskId: ID; title: string; assignedBy: ID }[];
  pendingServiceRequests?: { id: ID; title: string; status: ServiceRequestStatus; scheduledAt: ISO | null }[];
  communityUpdates?: { id: ID; groupId: ID; groupName: string; kind: PostKind; title: string | null; createdAt: ISO }[];
  recentConsumerCases?: { id: ID; title: string; status: CaseStatus; nextFollowUpOn: Day | null }[];
  householdIds?: ID[];
  quickActions?: { key: string; label: string }[];
  unreadNotifications: number;
}

// ------------------------------------------------------------------ notifications
export type NotificationCategory =
  | 'reminders'
  | 'tasks'
  | 'household'
  | 'family'
  | 'checkins'
  | 'help'
  | 'community'
  | 'services'
  | 'consumer'
  | 'security'
  | 'privacy'
  | 'system';

export interface NotificationItem {
  id: ID;
  category: NotificationCategory;
  title: string;
  body: string | null;
  data: { type?: string; id?: string; [k: string]: unknown } | null;
  readAt: ISO | null;
  createdAt: ISO;
}

export interface NotificationPref {
  category: NotificationCategory;
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  bypassQuietHours: boolean;
}

export interface DeviceInfo {
  id: ID;
  platform: 'web' | 'android' | 'ios';
  label: string | null;
  createdAt?: ISO;
  lastSeenAt?: ISO;
}

export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'suppressed' | 'simulated';
export interface ChannelDelivery {
  channel: 'in_app' | 'push' | 'sms' | 'email';
  status: DeliveryStatus;
  sentAt: ISO | null;
  deliveredAt: ISO | null;
}

// ------------------------------------------------------------------ privacy
export interface Consent {
  id: ID;
  purpose: string;
  policyVersion: string | null;
  grantedAt: ISO;
  withdrawnAt: ISO | null;
}

export interface PrivacyRequest {
  id: ID;
  type: 'export' | 'delete' | 'correction' | 'grievance';
  status: 'received' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  dueAt: ISO;
  completedAt: ISO | null;
  resolutionNote: string | null;
  hasDownload: boolean;
  createdAt?: ISO;
  details?: string | null;
}

export interface DataInventory {
  collected: {
    area: string;
    field: string;
    purpose: string;
    required: string;
    access: string;
    retention: string;
    thirdParties: string;
    deletion: string;
    onConsentWithdrawal: string;
  }[];
  neverCollected: string[];
}

export interface Attachment {
  id: ID;
  purpose: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  temporary: boolean;
  expiresAt: ISO | null;
  createdAt: ISO;
}

// ------------------------------------------------------------------ LifeOS
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Visibility = 'private' | 'household' | 'shared';

export interface Task {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  title: string;
  notes: string | null;
  categoryId: ID | null;
  priority: TaskPriority;
  status: TaskStatus;
  visibility: Visibility;
  dueAt: ISO | null;
  allDay: boolean;
  recurrenceRule: string | null;
  seriesId: ID | null;
  isChore: boolean;
  completedAt: ISO | null;
  completedBy: ID | null;
  createdBy: ID | null;
  createdAt: ISO;
  updatedAt: ISO;
  overdue?: boolean;
}

export interface TaskAssignment {
  id: ID;
  taskId: ID;
  assigneeUserId: ID;
  assignedBy: ID;
  status: 'proposed' | 'accepted' | 'declined';
  respondedAt: ISO | null;
  createdAt: ISO;
  displayName?: string;
}

export interface TaskDetail extends Task {
  canEdit: boolean;
  assignments: { id: ID; userId: ID; displayName: string; status: 'proposed' | 'accepted' | 'declined'; assignedBy: ID }[];
  attachments: Attachment[];
  reminders: { id: ID; fireAt: ISO; status: Reminder['status'] }[];
}

export interface IncomingAssignment {
  id: ID;
  taskId: ID;
  title: string;
  dueAt: ISO | null;
  assignedBy: ID;
  assignedByName: string;
  createdAt: ISO;
}

export interface TaskCategory {
  id: ID;
  name: string;
  color: string | null;
  householdId: ID | null;
  ownerUserId: ID | null;
}

export interface Reminder {
  id: ID;
  userId: ID;
  taskId: ID | null;
  eventId: ID | null;
  title: string;
  fireAt: ISO;
  channels: string[];
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  sentAt: ISO | null;
  lastError: string | null;
  createdAt: ISO;
}

export type EventKind = 'appointment' | 'visit' | 'errand' | 'activity' | 'other';
export interface CalendarEvent {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  kind: EventKind;
  title: string;
  description: string | null;
  startsAt: ISO;
  endsAt: ISO | null;
  allDay: boolean;
  locationText: string | null;
  recurrenceRule: string | null;
  visibility: Visibility;
  visitForUserId: ID | null;
  cancelledAt: ISO | null;
  occurrenceStart?: ISO;
  occurrenceEnd?: ISO | null;
  attendees?: { userId: ID; displayName: string; status: 'invited' | 'accepted' | 'declined' | 'tentative' }[];
  canEdit?: boolean;
  ownerName?: string;
  myStatus?: string | null;
}

// ------------------------------------------------------------------ Household
export interface Household {
  id: ID;
  name: string;
  createdAt: ISO;
  role?: 'admin' | 'member';
  myRole?: 'admin' | 'member';
  memberCount?: number;
}

export interface HouseholdDetail {
  id: ID;
  name: string;
  createdAt: ISO;
  myRole: 'admin' | 'member';
  members: { userId: ID; displayName: string; role: 'admin' | 'member'; joinedAt: ISO }[];
}

export interface HouseholdInvitation {
  id: ID;
  householdId?: ID;
  status: string;
  role?: 'admin' | 'member';
  expiresAt: ISO;
  createdAt?: ISO;
  inviteLink?: string;
  inviteeName?: string | null;
  inviteeMasked?: string | null;
}

export interface IncomingHouseholdInvitation {
  id: ID;
  householdId: ID;
  householdName: string;
  invitedBy: ID;
  inviterName: string;
  role: 'admin' | 'member';
  expiresAt: ISO;
}

export interface Announcement {
  id: ID;
  body: string;
  pinned: boolean;
  authorId: ID;
  authorName: string;
  expiresAt: ISO | null;
  createdAt: ISO;
}

export interface ShoppingList {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  name: string;
  archivedAt: ISO | null;
  createdAt: ISO;
  updatedAt: ISO;
  openItems?: number;
}

export interface ListItem {
  id: ID;
  listId: ID;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  assignedTo: ID | null;
  position: number;
  doneAt: ISO | null;
  doneBy: ID | null;
  addedBy: ID;
}

export interface InventoryItem {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  roomOrLocation: string | null;
  installedOn: Day | null;
  purchaseDate: Day | null;
  warrantyExpiresOn: Day | null;
  notes: string | null;
  createdAt: ISO;
  nextDueOn?: Day | null;
}

export interface MaintenanceSchedule {
  id: ID;
  itemId: ID;
  title: string;
  intervalDays: number;
  nextDueOn: Day;
  reminderLeadDays: number;
  active: boolean;
}

export interface MaintenanceRecord {
  id: ID;
  itemId: ID;
  scheduleId: ID | null;
  performedOn: Day;
  description: string;
  providerName: string | null;
  createdAt: ISO;
}

export interface InventoryDetail extends InventoryItem {
  schedules: MaintenanceSchedule[];
  records: MaintenanceRecord[];
  purchases: Purchase[];
}

export interface BudgetLine {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  month: Day;
  category: string;
  plannedAmount: string;
  spentAmount: string;
  currency: string;
  note: string | null;
}

// ------------------------------------------------------------------ FamilyCare
export type GrantScope = 'tasks.view' | 'tasks.assign' | 'calendar.view' | 'checkins.view' | 'checkins.alerts' | 'help.alerts' | 'help.location';
export const GRANT_SCOPES: GrantScope[] = ['tasks.view', 'tasks.assign', 'calendar.view', 'checkins.view', 'checkins.alerts', 'help.alerts', 'help.location'];

export interface ContactGrant {
  id: ID;
  scope: GrantScope;
  status: 'pending_cooloff' | 'active' | 'revoked' | 'expired';
  effectiveAt: ISO;
  expiresAt?: ISO | null;
}

export interface Contact {
  contactUserId: ID;
  label: string | null;
  since: ISO;
  displayName: string;
  avatarAttachmentId: ID | null;
  iShare: ContactGrant[];
  sharedWithMe: ContactGrant[];
}

export interface ContactInvitation {
  id: ID;
  status: string;
  proposedScopes: GrantScope[];
  expiresAt: ISO;
  createdAt?: ISO;
  label?: string | null;
  inviteLink?: string;
  inviteeName?: string | null;
  inviteeMasked?: string | null;
}

export interface IncomingContactInvitation {
  id: ID;
  inviterUserId: ID;
  inviterName: string;
  proposedScopes: GrantScope[];
  message: string | null;
  label?: string | null;
  expiresAt: ISO;
  createdAt?: ISO;
}

export interface Grant {
  id: ID;
  direction: 'given' | 'received';
  grantorId: ID;
  grantorName: string;
  granteeId: ID;
  granteeName: string;
  scope: GrantScope;
  meaning: string;
  status: 'pending_cooloff' | 'active' | 'revoked' | 'expired';
  effectiveAt: ISO;
  expiresAt: ISO | null;
  createdAt: ISO;
  revokedAt: ISO | null;
}

export type CheckInState = 'pending' | 'reminded' | 'completed' | 'missed' | 'escalated' | 'acknowledged' | 'cancelled';
export type CheckInKind = 'daily' | 'weekly' | 'one_off' | 'visit_confirmation' | 'assistance_confirmation';

export interface CheckInSchedule {
  id: ID;
  userId: ID;
  label: string;
  kind: CheckInKind;
  timeLocal: string | null;
  daysOfWeek: number[] | null;
  oneOffAt: ISO | null;
  timezone: string;
  reminderAfterMinutes: number;
  graceMinutes: number;
  escalate: boolean;
  active: boolean;
  nextDueAt: ISO | null;
  escalationContacts: { userId: ID; displayName: string; position: number }[];
}

export interface CheckInEvent {
  id: ID;
  scheduleId: ID;
  userId: ID;
  dueAt: ISO;
  state: CheckInState;
  completedAt: ISO | null;
  remindedAt: ISO | null;
  missedAt: ISO | null;
  escalatedAt: ISO | null;
  acknowledgedBy: ID | null;
  acknowledgedAt: ISO | null;
  note: string | null;
  label?: string;
  displayName?: string;
  alertDeliveries?: { recipientUserId: ID; displayName: string; channels: ChannelDelivery[] }[];
}

export interface CheckInPerson {
  userId: ID;
  displayName: string;
  canSeeStatus?: boolean;
  receivesAlerts?: boolean;
  latest?: CheckInEvent | null;
  recent?: CheckInEvent[];
  schedules?: { id: ID; label: string; nextDueAt: ISO | null }[];
  [k: string]: unknown;
}

export interface HelpPreferences {
  userId?: ID;
  emergencyNumber: string;
  primaryCallContactId: ID | null;
  notifyContacts: boolean;
  shareLocationByDefault: boolean;
  defaultMessage: string | null;
  callTargets: { label: string; number: string; kind: string }[];
  alertRecipients: { userId: ID; displayName: string }[];
  disclaimer: string;
}

export interface HelpRequest {
  id: ID;
  requesterId: ID;
  requesterName: string;
  kind: 'notify_contacts' | 'call' | 'service_request';
  message: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'cancelled';
  createdAt: ISO;
  resolvedAt: ISO | null;
  serviceRequestId?: ID | null;
  location: { lat: string; lng: string; visibleUntil: ISO } | null;
  recipients: { userId: ID; displayName: string; acknowledgedAt: ISO | null; deliveries?: ChannelDelivery[] }[];
}

export interface IncomingHelp {
  id: ID;
  userId: ID;
  displayName: string;
  kind: HelpRequest['kind'];
  message: string | null;
  status: HelpRequest['status'];
  createdAt: ISO;
  acknowledgedAt: ISO | null;
}

export interface HelpResult {
  helpRequest: HelpRequest;
  actions: { type: string; detail: string; status: string }[];
  callTargets: { label: string; number: string; kind: string }[];
  disclaimer: string;
}

// ------------------------------------------------------------------ Consumer
export type CaseStatus = 'draft' | 'ready_to_submit' | 'submitted_by_user' | 'awaiting_response' | 'info_required' | 'resolved' | 'closed';

export interface Purchase {
  id: ID;
  ownerUserId: ID;
  householdId: ID | null;
  inventoryItemId: ID | null;
  productCategory: string;
  brand: string | null;
  model: string | null;
  purchaseDate: Day | null;
  retailerName: string | null;
  warrantyExpiresOn: Day | null;
  returnDeadline: Day | null;
  serviceReference: string | null;
  notes: string | null;
  createdAt: ISO;
}

export interface OfficialChannel {
  id: ID;
  kind: 'consumer' | 'civic' | 'government' | 'helpline';
  name: string;
  jurisdiction: string | null;
  country: string | null;
  topics: string[];
  url: string | null;
  phone: string | null;
  description: string | null;
  lastReviewedOn: Day | null;
  active: boolean;
}

export interface ConsumerCase {
  id: ID;
  ownerUserId: ID;
  purchaseId: ID | null;
  title: string;
  counterpartyName: string | null;
  category: string | null;
  status: CaseStatus;
  externalReference: string | null;
  officialChannelId: ID | null;
  submittedAt: ISO | null;
  nextFollowUpOn: Day | null;
  resolutionNote: string | null;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface CaseDetail extends ConsumerCase {
  allowedNextStatuses: CaseStatus[];
  timeline: { id: ID; kind: string; occurredOn: Day; description: string; createdAt: ISO }[];
  drafts: { id: ID; body: string; source: 'user' | 'ai'; aiModel: string | null; approvedAt: ISO | null; createdAt: ISO; updatedAt: ISO }[];
  attachments: Attachment[];
  officialChannel: OfficialChannel | null;
}

// ------------------------------------------------------------------ Community
export type PostKind = 'text' | 'announcement' | 'event' | 'recommendation' | 'help_request' | 'civic_info' | 'lost_found';
export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface Membership {
  groupId: ID;
  userId: ID;
  role: GroupRole;
  status: 'active' | 'pending' | 'banned' | 'left';
  joinedAt: ISO;
}

export interface GroupSummary {
  id: ID;
  name: string;
  slug: string;
  description: string | null;
  visibility: 'public' | 'private' | 'invite_only';
  category: string | null;
  localityId: ID | null;
  localityName?: string | null;
  memberCount: number;
  createdAt: ISO;
  membership: Membership | null;
}

export interface GroupDetail extends GroupSummary {
  canRead: boolean;
  postingPolicy: 'all_members' | 'admins_only';
  status: 'active' | 'suspended' | 'archived';
  rules: string | null;
  createdBy: ID | null;
}

export interface Post {
  id: ID;
  groupId: ID;
  authorId: ID;
  kind: PostKind;
  title: string | null;
  body: string;
  eventStartsAt: ISO | null;
  eventEndsAt: ISO | null;
  eventLocationText: string | null;
  status: 'published' | 'hidden' | 'removed' | 'deleted';
  removedReason: string | null;
  commentCount: number;
  reactionCount: number;
  pinnedAt: ISO | null;
  editedAt: ISO | null;
  createdAt: ISO;
  author: { userId: ID; displayName: string; avatarAttachmentId: ID | null };
  myReaction: Reaction | null;
  bookmarked: boolean;
  attachments: Attachment[];
  groupName?: string;
  heldForReview?: boolean;
  privacyWarning?: string | null;
}

export type Reaction = 'like' | 'helpful' | 'thanks' | 'support';

export interface Comment {
  id: ID;
  postId: ID;
  authorId: ID;
  parentCommentId: ID | null;
  body: string;
  status: string;
  editedAt: ISO | null;
  createdAt: ISO;
  authorName?: string;
  heldForReview?: boolean;
}

export interface CivicIssue {
  id: ID;
  reporterId: ID;
  localityId: ID | null;
  category: string;
  description: string;
  locationText: string | null;
  status: 'draft' | 'reported_by_user' | 'in_progress' | 'resolved' | 'closed';
  officialChannelId: ID | null;
  externalReference: string | null;
  reportedAt: ISO | null;
  postId: ID | null;
  createdAt: ISO;
  updatedAt: ISO;
  suggestedChannels?: OfficialChannel[];
  notice?: string;
}

export interface ModerationDecision {
  id: ID;
  targetType: string;
  targetId: ID;
  action: string;
  reason: string;
  expiresAt: ISO | null;
  createdAt: ISO;
  appeal?: { id: ID; status: string } | null;
}

// ------------------------------------------------------------------ Services
export type ServiceRequestStatus = 'requested' | 'accepted' | 'declined' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface ServiceCategory {
  id: ID;
  slug: string;
  name: string;
  description: string | null;
  parentId: ID | null;
  requiresVerification: boolean;
  seniorSupport: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ProviderPublic {
  id: ID;
  displayName: string;
  providerType: 'individual' | 'business' | 'volunteer' | 'organisation';
  description: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  websiteUrl: string | null;
  verificationLevel: 'none' | 'basic' | 'screened';
  verificationLabel: string;
  sponsored: boolean;
  sponsoredDisclosure: string | null;
  rating?: { average: number | null; count: number };
  services?: { id: ID; title: string; description: string | null; priceNote: string | null; categoryId: ID; categoryName: string }[];
  areas?: { id: ID; name: string; city: string }[];
  verificationChecks?: { checkType: string; status: string; checkedAt: ISO | null; expiresAt: ISO | null }[];
}

export interface Review {
  id: ID;
  rating: number;
  body: string | null;
  providerResponse: string | null;
  createdAt: ISO;
  reviewerName?: string;
}

export interface ServiceRequest {
  id: ID;
  requesterId: ID;
  onBehalfOfUserId: ID | null;
  providerId: ID | null;
  providerServiceId: ID | null;
  categoryId: ID;
  title: string;
  description: string | null;
  localityId: ID | null;
  locationNote: string | null;
  preferredStart: ISO | null;
  preferredEnd: ISO | null;
  scheduledAt: ISO | null;
  status: ServiceRequestStatus;
  statusReason: string | null;
  completedAt: ISO | null;
  createdAt: ISO;
  updatedAt: ISO;
  myRole?: 'customer' | 'provider' | 'beneficiary';
  allowedNextStatuses?: ServiceRequestStatus[];
  provider?: ProviderPublic | null;
  history?: { id: ID; actorId: ID | null; fromStatus: string | null; toStatus: string; note: string | null; createdAt: ISO }[];
  review?: Review | null;
}

export interface ProviderProfile {
  id: ID;
  displayName: string;
  providerType: ProviderPublic['providerType'];
  description: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  websiteUrl: string | null;
  status: 'draft' | 'pending_review' | 'active' | 'suspended' | 'rejected';
  verificationLevel: 'none' | 'basic' | 'screened';
  isSponsored: boolean;
  sponsoredUntil: ISO | null;
  rejectionReason: string | null;
  submittedAt: ISO | null;
  approvedAt: ISO | null;
  createdAt: ISO;
}

// ------------------------------------------------------------------ Knowledge & assistant
export interface ArticleSummary {
  id: ID;
  slug: string;
  title: string;
  summary: string | null;
  topic: string | null;
  /** Country the guide applies to; null = general. */
  country?: string | null;
  lastReviewedOn: Day | null;
  canonicalUrl: string | null;
}

export interface Citation {
  articleId: ID;
  chunkId?: ID;
  title: string;
  url: string | null;
  lastReviewedOn: Day | null;
}

export interface AssistantAnswer {
  answer: string;
  citations: Citation[];
  proposedActions: { type: string; label: string; payload: Record<string, unknown> }[];
  groundedInSources: boolean;
  simulated: boolean;
  retrievalMode: string;
  conversationId: ID | null;
  messageId: ID | null;
  disclaimer: string;
  feedbackToken?: string;
}

export interface Conversation {
  id: ID;
  title: string | null;
  expiresAt: ISO | null;
  createdAt: ISO;
  updatedAt: ISO;
  messages?: { id: ID; role: 'user' | 'assistant'; content: string; citations: Citation[]; proposedActions: AssistantAnswer['proposedActions']; createdAt: ISO }[];
}

// ------------------------------------------------------------------ documents & agents
export interface DocFolder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  fileCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocFile {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  readableText: boolean;
  lastChangedByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type MailProviderName = 'demo' | 'gmail' | 'outlook';

export interface MailAccount {
  id: string;
  provider: MailProviderName;
  address: string;
  status: string;
  lastError: string | null;
  createdAt: string;
}

export interface MailSummary {
  id: string;
  threadId: string | null;
  from: string;
  subject: string;
  date: string | null;
  snippet: string;
  unread: boolean;
}

export interface MailMessage extends MailSummary {
  to: string;
  text: string;
}

export type FolderAccess = 'read' | 'edit';

export interface Agent {
  id: string;
  kind: 'email' | 'documents';
  name: string;
  instructions: string | null;
  status: 'active' | 'paused';
  reviewBeforeSending: boolean;
  mailbox: MailAccount | null;
  folders: { folderId: string; path: string; access: FolderAccess }[];
  lastRunAt: string | null;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  request: string;
  targetRef: string | null;
  targetLabel: string | null;
  status: 'awaiting_approval' | 'sent' | 'completed' | 'failed' | 'discarded';
  output: string | null;
  actions: { tool: string; input: Record<string, unknown>; ok: boolean; note: string }[];
  error: string | null;
  simulated: boolean;
  createdAt: string;
  finishedAt: string | null;
}

// ------------------------------------------------------------------ parent care
export type CareStatus = 'help' | 'missed' | 'waiting' | 'ok' | 'quiet' | 'not_set_up' | 'starting';
export interface CareItem {
  id: ID | null;
  scheduleId: ID;
  label: string;
  purpose: 'wellbeing' | 'medicine';
  dueAt: ISO;
  /** check-in state, or 'upcoming' for later today */
  state: string;
  completedAt: ISO | null;
  acknowledgedAt: ISO | null;
  upcoming: boolean;
}
export interface CareAppointment {
  id: ID;
  title: string;
  kind: string;
  startsAt: ISO;
  locationText: string | null;
}
export interface CareWeeklyTally {
  total: number;
  completed: number;
  missed: number;
}
export interface CareWeeklyInsight {
  medicine: CareWeeklyTally;
  wellbeing: CareWeeklyTally;
  text: string | null;
}
export interface CarePerson {
  userId: ID;
  displayName: string | null;
  label: string | null;
  shares: { scope: string; status: 'active' | 'pending_cooloff'; effectiveAt: ISO }[];
  status: CareStatus;
  today: CareItem[] | null;
  /** Plain-language rollup of the last 7 days, e.g. "Missed medication twice this week"; null when nothing's shared yet. */
  weekly: CareWeeklyInsight | null;
  lastCheckInAt: ISO | null;
  openHelp: { id: ID; kind: string; message: string | null; status: string; createdAt: ISO; acknowledgedAt: ISO | null }[];
  appointments: CareAppointment[] | null;
}
export interface CarePeople {
  people: CarePerson[];
  invitations: { id: ID; label: string | null; requestedScopes: string[]; createdAt: ISO; expiresAt: ISO }[];
}
export interface CareToday {
  today: CareItem[];
  activeSchedules: number;
  schedules: { id: ID; label: string; purpose: 'wellbeing' | 'medicine'; timeLocal: string | null; nextDueAt: ISO | null }[];
  circle: { userId: ID; displayName: string | null; scopes: { scope: string; status: string; effectiveAt: ISO }[] }[];
  reminders: { id: ID; title: string; fireAt: ISO }[];
  appointments: CareAppointment[];
  callTargets: { kind: 'emergency' | 'contact'; label: string; number: string }[];
  emergencyNumber: string;
  openHelp: { id: ID; createdAt: ISO; status: string } | null;
}

// ---------------------------------------------------------------- smart inbox
export type InboxHint = 'tasks' | 'reminders' | 'calendar' | 'shopping' | 'inventory' | 'budget' | 'household' | 'family_care' | 'community' | 'help_services' | 'mixed';

export interface InboxStatus {
  setUp: boolean;
  enabled: boolean;
  rootFolderId: string | null;
  rootName: string;
  folders: { name: string; hint: InboxHint; folderId: string | null }[];
  aiReading: boolean;
  aiConsentAt: string | null;
  aiAvailable: boolean;
  aiTurnedOffInSettings: boolean;
  householdId: string | null;
  counts: { total: number; waiting: number; review: number };
}

export interface InboxImport {
  id: string;
  fileId: string | null;
  fileName: string;
  folderHint: InboxHint | null;
  status: 'queued' | 'processing' | 'done' | 'needs_review' | 'failed' | 'skipped' | 'undone';
  category: string | null;
  summary: string | null;
  createdItems: { type: string; id: string; title: string; href: string; parentId?: string }[];
  suggestions: { type: string; title: string; details: string; href: string }[];
  skippedItems: { title: string; reason: string }[];
  error: string | null;
  reader: 'ai' | 'rules' | 'none' | null;
  createdAt: string;
  processedAt: string | null;
  undoneAt: string | null;
}
