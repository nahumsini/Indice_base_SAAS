package com.indice.erp.finance.shared;

import com.indice.erp.finance.FinanceApiException;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Pattern;

public final class FinanceValidationSupport {

    private static final Pattern CURRENCY_CODE = Pattern.compile("^[A-Z]{3}$");

    private FinanceValidationSupport() {
    }

    public static BigDecimal requireNonNegative(BigDecimal amount, String fieldName) {
        if (amount == null) {
            throw FinanceApiException.badRequest(fieldName + " is required.");
        }
        if (amount.signum() < 0) {
            throw FinanceApiException.badRequest(fieldName + " must be non-negative.");
        }
        return amount;
    }

    public static String requireCurrencyCode(String currencyCode) {
        var normalized = currencyCode == null ? "" : currencyCode.trim().toUpperCase(Locale.ROOT);
        if (!CURRENCY_CODE.matcher(normalized).matches()) {
            throw FinanceApiException.badRequest("currencyCode must be an ISO 4217 code.");
        }
        return normalized;
    }
}
