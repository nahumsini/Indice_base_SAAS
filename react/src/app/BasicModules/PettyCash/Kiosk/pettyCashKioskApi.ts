import { apiClient } from '../../../lib/apiClient';

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
  description: string;
  total_amount: number;
  currency_code: string;
  expense_date: string;
  attachment_count: number;
  status: string;
}

export interface PublicPettyCashBootstrapResponse {
  fund: PublicPettyCashFund;
  scope_label: string;
  auth_methods: Array<'pin'>;
  inactivity_timeout_seconds: number;
}

export interface PublicPettyCashIdentifyResponse {
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
  total_amount: number;
  currency_code: string;
  receipt_reference?: string | null;
  expense_date?: string | null;
  attachment_count?: number;
}

export interface PublicPettyCashReceiptResponse {
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

  createPublicReceipt(fundToken: string, payload: PublicPettyCashReceiptPayload) {
    return apiClient<PublicPettyCashReceiptResponse>(`${publicBasePath}/${fundToken}/receipts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
    return apiClient<{
      object_key: string;
      upload_url: string;
      expires_at: string;
      upload_headers?: Record<string, string>;
    }>(`${publicBasePath}/${fundToken}/settlement-lines/${settlementLineId}/attachments/presign-upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerPublicAttachment(
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
    return apiClient<Record<string, unknown>>(`${publicBasePath}/${fundToken}/settlement-lines/${settlementLineId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

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
