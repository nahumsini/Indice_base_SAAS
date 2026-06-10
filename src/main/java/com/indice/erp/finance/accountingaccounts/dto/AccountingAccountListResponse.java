package com.indice.erp.finance.accountingaccounts.dto;

import java.util.List;

public record AccountingAccountListResponse(List<AccountingAccountResponse> accounts, int count) {
}
