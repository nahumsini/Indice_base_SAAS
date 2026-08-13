import type {
  EditablePlatformAccountType,
  PlatformAccountCreatePayload,
  PlatformAccountCreateResult,
  PlatformCatalogProduct,
} from "../../api/platformAdmin";

export type CreatedAccountAccess = PlatformAccountCreateResult & {
  temporaryPassword: string;
};

export type AccountCreationModalProps = {
  products: PlatformCatalogProduct[];
  existingOwnerEmails: string[];
  onClose: () => void;
  onCreate: (
    payload: PlatformAccountCreatePayload,
  ) => Promise<PlatformAccountCreateResult>;
  onOpenAccount: (companyId: number) => void;
  lockedAccountType?: EditablePlatformAccountType;
  returnTo?: string;
};

export type AccountCreationFocusField =
  | "company_name"
  | "owner_email"
  | "phone"
  | "temporary_password"
  | null;
