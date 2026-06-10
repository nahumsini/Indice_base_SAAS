package com.indice.erp.finance.shared;

public record FinanceScope(Type type, Long unitId, Long businessId) {

    public static FinanceScope corporateOffice() {
        return new FinanceScope(Type.CORPORATE_OFFICE, null, null);
    }

    public static FinanceScope unitHeadquarters(Long unitId) {
        return new FinanceScope(Type.UNIT_HEADQUARTERS, unitId, null);
    }

    public static FinanceScope businessOffice(Long unitId, Long businessId) {
        return new FinanceScope(Type.BUSINESS_OFFICE, unitId, businessId);
    }

    public boolean isCorporateOffice() {
        return type == Type.CORPORATE_OFFICE;
    }

    public enum Type {
        CORPORATE_OFFICE,
        UNIT_HEADQUARTERS,
        BUSINESS_OFFICE
    }
}
