package com.indice.erp.pos;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

public final class PosSqlSupport {

    private PosSqlSupport() {
    }

    public static String scopePredicate(String alias, PosScope scope) {
        var predicate = switch (scope.type()) {
            case CORPORATE_OFFICE -> "1 = 1";
            case UNIT_HEADQUARTERS -> "(" + alias + ".unit_id = ? OR " + alias + ".business_id IN "
                + "(SELECT id FROM businesses WHERE unit_id = ?))";
            case BUSINESS_OFFICE -> alias + ".business_id = ?";
        };
        return " " + predicate + " ";
    }

    public static void appendScopeParams(List<Object> params, PosScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> {
                params.add(scope.unitId());
                params.add(scope.unitId());
            }
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

    public static Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    public static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
