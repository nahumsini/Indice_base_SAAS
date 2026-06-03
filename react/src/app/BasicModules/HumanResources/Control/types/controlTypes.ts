export interface ControlWorkSiteForm {
  user_company_ids: number[];
  location_ids: number[];
  location_id: number;
  effective_start_date: string;
  effective_end_date: string;
  start_time: string;
  end_time: string;
}

export type KioskType = 'business_unit' | 'contract_site' | 'head_office' | 'open_attendance';
