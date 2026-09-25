package com.indice.erp.sales;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.sales.SalesReferenceReadService.Customer;
import com.indice.erp.sales.SalesReferenceReadService.Page;
import com.indice.erp.sales.SalesReferenceReadService.Warehouse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
class SalesReferenceRepository {
    private final JdbcTemplate jdbc;

    SalesReferenceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    Page<Customer> customers(long companyId, HrOperationalScope scope, String query, int offset, int limit) {
        return page(companyId, scope, query, offset, limit,
            "sales_contacts", "contact_code", "company_name", "entity.unit_id", "entity.business_id",
            "id, contact_code, company_name, status, unit_id, business_id",
            (rs, row) -> new Customer(rs.getLong("id"), rs.getString("contact_code"), rs.getString("company_name"),
                rs.getString("status"), nullableId(rs, "unit_id"), nullableId(rs, "business_id")));
    }

    Page<Warehouse> warehouses(long companyId, HrOperationalScope scope, String query, int offset, int limit) {
        return page(companyId, scope, query, offset, limit,
            "sales_inventory_warehouses", "warehouse_code", "name",
            legacyIdentifier("business_unit_id"), legacyIdentifier("business_id"),
            "id, warehouse_code, name, type, status, business_unit_id, business_id",
            (rs, row) -> new Warehouse(rs.getLong("id"), rs.getString("warehouse_code"), rs.getString("name"),
                rs.getString("type"), rs.getString("status"), nullableId(rs, "business_unit_id"), nullableId(rs, "business_id")));
    }

    // All identifiers below come from the two closed owner definitions above, never from a request.
    private <T> Page<T> page(long companyId, HrOperationalScope scope, String query, int offset, int limit,
            String table, String code, String name, String unit, String business, String columns, RowMapper<T> mapper) {
        var where = " FROM " + table + " entity WHERE entity.company_id = ? AND entity.deleted_at IS NULL"
            + scope.assignmentPredicate(unit, business, "entity.company_id")
            + " AND (LOCATE(LOWER(?), LOWER(COALESCE(entity." + name + ", ''))) > 0"
            + " OR LOCATE(LOWER(?), LOWER(COALESCE(entity." + code + ", ''))) > 0)";
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(scope.assignmentParameters());
        params.add(query);
        params.add(query);
        var count = jdbc.queryForObject("SELECT COUNT(*)" + where, Integer.class, params.toArray());
        var total = count == null ? 0 : count;
        if (offset > total) throw new IllegalArgumentException("cursor is no longer valid for this result set.");
        params.add(limit);
        params.add(offset);
        var items = jdbc.query("SELECT " + columns + where + " ORDER BY entity.id ASC LIMIT ? OFFSET ?", mapper, params.toArray());
        return new Page<>(items, total);
    }

    private Long nullableId(ResultSet rs, String column) throws SQLException {
        var value = rs.getString(column);
        if (value == null || value.isBlank()) return null;
        try {
            var id = Long.parseLong(value.trim());
            return id > 0 ? id : null;
        }
        catch (NumberFormatException exception) { return null; }
    }

    private String legacyIdentifier(String column) {
        // Legacy warehouse assignments are strings. Do not let MySQL treat "101-other" as business 101.
        return "(CASE WHEN TRIM(entity." + column + ") REGEXP '^[0-9]{1,19}$'"
            + " THEN CAST(TRIM(entity." + column + ") AS UNSIGNED) ELSE NULL END)";
    }
}
