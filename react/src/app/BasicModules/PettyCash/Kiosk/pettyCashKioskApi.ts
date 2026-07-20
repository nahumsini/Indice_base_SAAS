import { apiClient } from '../../../lib/apiClient';
import {
  completeKioskIdempotentOperation,
  executeKioskMutationWithMismatchRecovery,
} from '../../../components/kiosk-engine/kioskIdempotency';

export interface PublicPettyCashFund {
  id: number;
  name: string;
  currency_code: string;
  current_balance_amount: number;
  limit_amount: number;
  cut_off_day: number;
  scope_label: string;
}

export interface PublicPettyCashReceipt {
  id: number;
  statement_id?: number;
  period_key?: string;
  description: string;
  receipt_reference?: string | null;
  total_amount: number;
  currency_code: string;
  expense_date: string;
  attachment_count: number;
  status: string;
  can_delete?: boolean;
}

export interface PublicPettyCashAttachment {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_name?: string | null;
  download_url?: string | null;
  created_at?: string | null;
}

export interface PublicPettyCashPeriod {
  id: number;
  period_key: string;
  period_start: string;
  period_end: string;
  status: string;
  currency_code: string;
}

export interface PublicPettyCashIncomeMovement {
  id: number;
  statement_id?: number | null;
  period_key: string;
  type: 'INITIAL_FUNDING' | 'ADDITIONAL_DEPOSIT' | 'CARRY_FORWARD';
  amount: number;
  currency_code: string;
  movement_date: string;
  reference?: string | null;
}

export interface PublicPettyCashHistory {
  periods: PublicPettyCashPeriod[];
  expenses: PublicPettyCashReceipt[];
  income_movements: PublicPettyCashIncomeMovement[];
}

export interface PublicPettyCashBootstrapResponse {
  fund: PublicPettyCashFund;
  scope_label: string;
  auth_methods: Array<'pin'>;
  inactivity_timeout_seconds: number;
}

export interface PublicPettyCashIdentifyResponse extends PublicPettyCashHistory {
  auth_method: 'pin';
  fund: PublicPettyCashFund;
  user: {
    id: number;
    user_id: number;
    user_code?: string;
    full_name: string;
    position_title?: string;
    department?: string;
  };
  identification_token: string;
  expires_at: string;
  recent_receipts: PublicPettyCashReceipt[];
}

export interface PublicPettyCashReceiptPayload {
  identification_token: string;
  description: string;
  subtotal_amount?: number;
  tax_amount?: number;
  total_amount: number;
  currency_code: string;
  receipt_reference?: string | null;
  expense_date?: string | null;
  attachment_count?: number;
}

export interface PublicPettyCashReceiptResponse extends PublicPettyCashHistory {
  fund: PublicPettyCashFund;
  statement: Record<string, unknown>;
  settlement_line: {
    id: number;
    description: string;
    totalAmount?: number;
    total_amount?: number;
    currencyCode?: string;
    currency_code?: string;
    expenseDate?: string;
    expense_date?: string;
    attachmentCount?: number;
    attachment_count?: number;
  };
  recent_receipts: PublicPettyCashReceipt[];
}

const publicBasePath = '/api/v1/finance/petty-cash/public-kiosk';

export const pettyCashKioskApi = {
  getPublicBootstrap(fundToken: string) {
    return apiClient<PublicPettyCashBootstrapResponse>(`${publicBasePath}/${fundToken}/bootstrap`);
  },

  identifyPublicUser(fundToken: string, pin: string) {
    return apiClient<PublicPettyCashIdentifyResponse>(`${publicBasePath}/${fundToken}/identify`, {
      method: 'POST',
      body: JSON.stringify({
        auth_method: 'pin',
        credential_payload: pin,
      }),
    });
  },

  async createPublicReceipt(fundToken: string, payload: PublicPettyCashReceiptPayload) {
    return kioskMutation<PublicPettyCashReceiptResponse>(
      `petty-cash:${fundToken}:receipt:create`,
      `${publicBasePath}/${fundToken}/receipts`,
      'POST',
      payload,
    );
  },

  presignPublicAttachmentUpload(
    fundToken: string,
    settlementLineId: number,
    payload: {
      identification_token: string;
      file_name: string;
      content_type: string;
      size_bytes: number;
    },
  ) {
    return kioskMutation<{
      object_key: string;
      upload_url: string;
      expires_at: string;
      upload_headers?: Record<string, string>;
    }>(
      `petty-cash:${fundToken}:receipt:${settlementLineId}:attachment:presign:${payload.file_name}:${payload.size_bytes}`,
      `${publicBasePath}/${fundToken}/settlement-lines/${settlementLineId}/attachments/presign-upload`,
      'POST',
      payload,
    );
  },

  async registerPublicAttachment(
    fundToken: string,
    settlementLineId: number,
    payload: {
      identification_token: string;
      object_key: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
    },
  ) {
    return kioskMutation<Record<string, unknown>>(
      `petty-cash:${fundToken}:receipt:${settlementLineId}:attachment:${payload.original_filename}:${payload.size_bytes}:${payload.object_key}`,
      `${publicBasePath}/${fundToken}/settlement-lines/${settlementLineId}/attachments`,
      'POST',
      payload,
    );
  },

  listPublicAttachments(fundToken: string, settlementLineId: number, identificationToken: string) {
    return apiClient<{ items: PublicPettyCashAttachment[]; count: number }>(
      `${publicBasePath}/${fundToken}/settlement-lines/${settlementLineId}/attachments/query`,
      {
        method: 'POST',
        body: JSON.stringify({ identification_token: identificationToken }),
      },
    );
  },

  async deletePublicReceipt(fundToken: string, settlementLineId: number, identificationToken: string) {
    return kioskMutation<PublicPettyCashHistory & { fund: PublicPettyCashFund; recent_receipts: PublicPettyCashReceipt[] }>(
      `petty-cash:${fundToken}:receipt:${settlementLineId}:delete`,
      `${publicBasePath}/${fundToken}/receipts/${settlementLineId}`,
      'DELETE',
      { identification_token: identificationToken },
    );
  },
};

async function kioskMutation<T>(
  operation: string,
  path: string,
  method: 'POST' | 'DELETE',
  payload: unknown,
) {
  const result = await executeKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: (idempotencyKey) => apiClient<T>(path, {
      method,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    }),
  });
  completeKioskIdempotentOperation(operation);
  return result;
}

export async function uploadPublicPettyCashAttachment(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  uploadHeaders: Record<string, string> = {},
) {
  const headers = new Headers(uploadHeaders);

  if (contentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', contentType);
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error('PETTY_CASH_RECEIPT_UPLOAD_FAILED');
  }
}
