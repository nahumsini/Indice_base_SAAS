package com.indice.erp.pos;

public record PosScope(Type type, Long unitId, Long businessId) {

    public static PosScope corporateOffice() {
        return new PosScope(Type.CORPORATE_OFFICE, null, null);
    }

    public static PosScope unitHeadquarters(Long unitId) {
        return new PosScope(Type.UNIT_HEADQUARTERS, unitId, null);
    }

    public static PosScope businessOffice(Long unitId, Long businessId) {
        return new PosScope(Type.BUSINESS_OFFICE, unitId, businessId);
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
