export type Consultant = {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
};
export type ConsultantInput = Omit<Consultant, "id" | "createdAt">;
