package com.indice.erp.finance.shared;

public final class FinanceSqlSupport {

    private FinanceSqlSupport() {
    }

    public static String activeCompanyPredicate(String tableAlias) {
        var prefix = prefix(tableAlias);
        return prefix + "company_id = ? AND " + prefix + "deleted_at IS NULL";
    }

    public static String scopePredicate(String tableAlias, FinanceScope scope) {
        var prefix = prefix(tableAlias);
        var predicate = switch (scope.type()) {
            case CORPORATE_OFFICE -> "1 = 1";
            case UNIT_HEADQUARTERS -> prefix + "unit_id = ?";
            case BUSINESS_OFFICE -> prefix + "business_id = ?";
        };
        return " " + predicate + "\n";
    }

    public static String optimisticLockPredicate(String tableAlias) {
        return prefix(tableAlias) + "version = ?";
    }

    private static String prefix(String tableAlias) {
        if (tableAlias == null || tableAlias.isBlank()) {
            return "";
        }
        return tableAlias.trim() + ".";
    }
}
