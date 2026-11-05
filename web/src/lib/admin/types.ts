/*
 * Shapes of the admin API. Each type follows one Java record under `api/src/main/java/vn/nepnhaxudong`,
 * field by field. `LocalDate` and `Instant` are ISO strings in JSON. A Java `Long` or `Integer` is `number`.
 * In a request, a field that the API fills in with a default (the record's compact constructor)
 * is optional here.
 */

// --- common (LocalizedText, LocalizedList) ---

/** A blank value is `null`, never "". */
export type LocalizedText = { vi: string | null; en: string | null };

/** An empty `en` list means the English version is missing. */
export type LocalizedList = { vi: string[]; en: string[] };

// --- product ---

export type PackagingDto = {
  weightGrams: number;
  priceVnd: number | null;
  sortOrder: number | null;
};

export type ProductAdminDto = {
  id: number;
  sortOrder: number;
  showPrice: boolean;
  /** "Hiện trên web". A new product is hidden; it changes only through `/show` and `/hide`, never through a save. */
  visible: boolean;
  name: LocalizedText;
  description: LocalizedText;
  features: LocalizedList;
  cookingTips: LocalizedText;
  packagings: PackagingDto[];
  mediaIds: number[];
  missingEn: boolean;
};

export type ProductRequest = {
  sortOrder?: number | null;
  showPrice?: boolean | null;
  name: LocalizedText;
  description?: LocalizedText | null;
  features?: LocalizedList | null;
  cookingTips?: LocalizedText | null;
  packagings?: PackagingDto[] | null;
  mediaIds?: number[] | null;
};

// --- timeline ---

export type TimelineEventAdminDto = {
  id: number;
  year: number;
  sortOrder: number;
  title: LocalizedText;
  description: LocalizedText;
  mediaId: number | null;
  missingEn: boolean;
};

export type TimelineEventRequest = {
  year: number;
  sortOrder?: number | null;
  title: LocalizedText;
  description?: LocalizedText | null;
  mediaId?: number | null;
};

// --- press ---

export type PressMentionAdminDto = {
  id: number;
  url: string;
  sourceName: string;
  publishedOn: string | null;
  title: LocalizedText;
  mediaId: number | null;
  sortOrder: number;
  missingEn: boolean;
};

export type PressMentionRequest = {
  url: string;
  sourceName: string;
  publishedOn: string | null;
  title: LocalizedText;
  mediaId?: number | null;
  sortOrder?: number | null;
};

/** Result of reading a page for its title, date and source. Any field can be `null`. */
export type PressPreviewDto = {
  title: string | null;
  publishedOn: string | null;
  sourceName: string | null;
};

// --- story ---

export type StoryStatus = "DRAFT" | "PUBLISHED";

export type StoryAdminDto = {
  id: number;
  status: StoryStatus;
  publishedAt: string | null;
  coverMediaId: number | null;
  slug: LocalizedText;
  title: LocalizedText;
  excerpt: LocalizedText;
  bodyHtml: LocalizedText;
  missingEn: boolean;
};

export type StoryRequest = {
  coverMediaId?: number | null;
  slug?: LocalizedText | null;
  title: LocalizedText;
  excerpt?: LocalizedText | null;
  bodyHtml?: LocalizedText | null;
};

// --- media ---

/** `url` starts with "/media/". */
export type MediaAdminDto = {
  id: number;
  url: string;
  width: number;
  height: number;
  mime: string;
  altVi: string | null;
  altEn: string | null;
};

// --- site settings ---

export type ContactSettings = {
  phone: string | null;
  zalo: string | null;
  messenger: string | null;
  address: LocalizedText | null;
  mapUrl: string | null;
  hours: LocalizedText | null;
};

export type SocialSettings = {
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
};

export type BrandSettings = {
  tagline: LocalizedText | null;
};

/** The API sends `value` as free JSON; the setting `key` tells which settings type it is. */
export type SiteSettingAdminDto = {
  id: number;
  key: string;
  value: unknown;
};

// --- auth and accounts ---

/** "Chủ" manages the accounts; "Người nhà" edits content only. */
export type UserRole = "OWNER" | "MEMBER";

export type UserResponse = {
  id: number;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  role: UserRole;
  totpEnabled: boolean;
  /** An owner switched off this user's two-factor login: it must be set up again before anything else. */
  mustSetupTotp: boolean;
  /** After such a forced setup, only an owner may switch two-factor login off. */
  totpRequired: boolean;
};

export type UserSummary = {
  id: number;
  email: string;
  displayName: string;
  enabled: boolean;
  totpEnabled: boolean;
  mustChangePassword: boolean;
  role: UserRole;
  mustSetupTotp: boolean;
  totpRequired: boolean;
};

export type ChangeRoleRequest = {
  role: UserRole;
};

export type CreateUserRequest = {
  email: string;
  displayName: string;
  temporaryPassword: string;
};

export type ResetPasswordRequest = {
  temporaryPassword: string;
};

export type TotpSetupResponse = {
  secret: string;
  otpauthUri: string;
};

// --- audit (history) ---

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type AuditEntryDto = {
  id: number;
  userDisplayName: string;
  entityType: string;
  entityId: number;
  action: AuditAction;
  createdAt: string;
  label: string;
  restorable: boolean;
};

/** `before` and `after` are the stored copies of the entity (free JSON); one is `null` for a create or a delete. */
export type AuditDetailDto = AuditEntryDto & {
  before: unknown;
  after: unknown;
};
