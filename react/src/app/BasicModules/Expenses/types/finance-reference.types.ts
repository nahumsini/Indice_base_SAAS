export type FinanceReferenceOption = {
  label: string;
  businessId?: string;
  unitId?: string;
  value: string;
};

export type FinanceReferenceUnit = {
  id: string;
  name: string;
  status?: string | null;
};

export type FinanceReferenceBusiness = {
  id: string;
  name: string;
  unitId?: string;
  status?: string | null;
};

export type FinanceReferenceUser = {
  id: string;
  name: string;
  email?: string;
  unitId?: string;
  businessId?: string;
  status?: string | null;
};

export type FinanceReferenceData = {
  businesses: FinanceReferenceBusiness[];
  currentUser?: FinanceReferenceUser;
  units: FinanceReferenceUnit[];
  users: FinanceReferenceUser[];
};
