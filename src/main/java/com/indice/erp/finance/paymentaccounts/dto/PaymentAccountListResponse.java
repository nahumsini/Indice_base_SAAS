package com.indice.erp.finance.paymentaccounts.dto;

import java.util.List;

public record PaymentAccountListResponse(List<PaymentAccountResponse> accounts, int count) {
}
