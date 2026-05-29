package com.indice.erp.hr;

import java.util.List;

public record HrOperationalScope(Type type, Long unitId, Long businessId) {

    public static HrOperationalScope corporateOffice() {
        return new HrOperationalScope(Type.CORPORATE_OFFICE, null, null);
    }

    public static HrOperationalScope unitHeadquarters(Long unitId) {
        if (unitId == null) {
            return corporateOffice();
        }
        return new HrOperationalScope(Type.UNIT_HEADQUARTERS, unitId, null);
    }

    public static HrOperationalScope businessOffice(Long unitId, Long businessId) {
        if (businessId == null) {
            return unitHeadquarters(unitId);
        }
        return new HrOperationalScope(Type.BUSINESS_OFFICE, unitId, businessId);
    }

    public boolean isCorporateOffice() {
        return Type.CORPORATE_OFFICE.equals(type);
    }

    public String hrUserPredicate(String alias) {
        var tableAlias = alias == null || alias.isBlank() ? "e" : alias.trim();
        return assignmentPredicate(tableAlias + ".unit_id", tableAlias + ".business_id", tableAlias + ".company_id");
    }

    public List<Object> hrUserParameters() {
        return assignmentParameters();
    }

    public String assignmentPredicate(String unitExpression, String businessExpression, String companyExpression) {
        return switch (type) {
            case CORPORATE_OFFICE -> "";
            case UNIT_HEADQUARTERS -> """
                 AND (
                   %1$s = ?
                   OR EXISTS (
                     SELECT 1
                     FROM businesses scope_business
                     WHERE scope_business.id = %2$s
                       AND scope_business.unit_id = ?
                       AND (scope_business.company_id = %3$s OR scope_business.company_id IS NULL)
                   )
                 )
                """.formatted(unitExpression, businessExpression, companyExpression);
            case BUSINESS_OFFICE -> " AND " + businessExpression + " = ?\n";
        };
    }

    public List<Object> assignmentParameters() {
        return switch (type) {
            case CORPORATE_OFFICE -> List.of();
            case UNIT_HEADQUARTERS -> List.of(unitId, unitId);
            case BUSINESS_OFFICE -> List.of(businessId);
        };
    }

    public enum Type {
        CORPORATE_OFFICE,
        UNIT_HEADQUARTERS,
        BUSINESS_OFFICE
    }
}
