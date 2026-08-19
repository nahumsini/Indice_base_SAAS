package com.indice.erp.pos.discount;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.discount.DiscountDtos.RuleRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class DiscountRuleRepository {

    private final JdbcTemplate jdbcTemplate;

    public DiscountRuleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DiscountRuleRecord> list(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        appendVisibilityParams(params, context);
        return jdbcTemplate.query(select() + " WHERE rule.company_id = ? AND rule.deleted_at IS NULL AND "
            + visibilityPredicate(context) + " ORDER BY rule.priority DESC, rule.name ASC, rule.id ASC",
            this::map, params.toArray());
    }

    public Optional<DiscountRuleRecord> find(PosContext context, long ruleId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(ruleId);
        appendVisibilityParams(params, context);
        return jdbcTemplate.query(select() + " WHERE rule.company_id = ? AND rule.id = ? AND rule.deleted_at IS NULL AND "
            + visibilityPredicate(context), this::map, params.toArray()).stream().findFirst();
    }

    public long insert(PosContext context, RuleRequest request) {
        var keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_discount_rules (
                  company_id, unit_id, business_id, warehouse_id, name, description, scope,
                  discount_type, discount_value, currency_code, starts_at, ends_at, minimum_amount,
                  maximum_discount_amount, customer_type, product_id, category, requires_authorization,
                  stackable, priority, status, enabled_channels_json, created_by_user_id, updated_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            bind(statement, context, request, 1);
            return statement;
        }, keys);
        return keys.getKey().longValue();
    }

    public boolean update(PosContext context, long ruleId, RuleRequest request, long version) {
        return jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                UPDATE pos_discount_rules SET
                  unit_id = ?, business_id = ?, warehouse_id = ?, name = ?, description = ?, scope = ?,
                  discount_type = ?, discount_value = ?, currency_code = ?, starts_at = ?, ends_at = ?,
                  minimum_amount = ?, maximum_discount_amount = ?, customer_type = ?, product_id = ?,
                  category = ?, requires_authorization = ?, stackable = ?, priority = ?, enabled_channels_json = ?,
                  updated_by_user_id = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
                """);
            var index = bindMutation(statement, request, 1);
            statement.setLong(index++, context.userId());
            statement.setLong(index++, context.companyId());
            statement.setLong(index++, ruleId);
            statement.setLong(index, version);
            return statement;
        }) > 0;
    }

    public boolean updateStatus(PosContext context, long ruleId, String status, long version) {
        return jdbcTemplate.update("""
            UPDATE pos_discount_rules
            SET status = ?, updated_by_user_id = ?, version = version + 1
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, status, context.userId(), context.companyId(), ruleId, version) > 0;
    }

    public boolean productExists(PosContext context, long productId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM sales_products
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, Long.class, context.companyId(), productId);
        return count != null && count > 0;
    }

    public void insertApplication(
            PosContext context,
            long ruleId,
            long ticketId,
            Long ticketItemId,
            java.math.BigDecimal amount,
            Long authorizedBy,
            Object snapshot) {
        jdbcTemplate.update("""
            INSERT INTO pos_discount_applications (
              company_id, rule_id, ticket_id, ticket_item_id, discount_amount,
              authorized_by_user_id, rule_snapshot_json, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, context.companyId(), ruleId, ticketId, ticketItemId, amount, authorizedBy,
            PosJsonSupport.toJson(snapshot), context.userId());
    }

    private void bind(java.sql.PreparedStatement statement, PosContext context, RuleRequest request, int index)
            throws SQLException {
        statement.setLong(index++, context.companyId());
        index = bindMutation(statement, request, index);
        statement.setLong(index++, context.userId());
        statement.setLong(index, context.userId());
    }

    private int bindMutation(java.sql.PreparedStatement statement, RuleRequest request, int index) throws SQLException {
        statement.setObject(index++, request.unitId());
        statement.setObject(index++, request.businessId());
        statement.setObject(index++, request.warehouseId());
        statement.setString(index++, request.name().trim());
        statement.setString(index++, request.description().trim());
        statement.setString(index++, request.scope().trim().toUpperCase());
        statement.setString(index++, request.discountType().trim().toUpperCase());
        statement.setBigDecimal(index++, request.value());
        statement.setString(index++, request.currencyCode().trim().toUpperCase());
        statement.setTimestamp(index++, Timestamp.from(request.startsAt()));
        statement.setTimestamp(index++, Timestamp.from(request.endsAt()));
        statement.setBigDecimal(index++, request.minimumAmount());
        statement.setBigDecimal(index++, request.maximumDiscountAmount());
        statement.setString(index++, trimToNull(request.customerType()));
        statement.setObject(index++, request.productId());
        statement.setString(index++, trimToNull(request.category()));
        statement.setBoolean(index++, request.requiresAuthorization());
        statement.setBoolean(index++, request.stackable());
        statement.setInt(index++, request.priority());
        statement.setString(index++, PosJsonSupport.toJson(request.enabledChannels()));
        return index;
    }

    private String visibilityPredicate(PosContext context) {
        return switch (context.scope().type()) {
            case CORPORATE_OFFICE -> "1 = 1";
            case UNIT_HEADQUARTERS -> "(rule.unit_id IS NULL OR rule.unit_id = ? OR rule.business_id IN (SELECT id FROM businesses WHERE unit_id = ?))";
            case BUSINESS_OFFICE -> "(rule.business_id IS NULL OR rule.business_id = ?) AND (rule.unit_id IS NULL OR rule.unit_id = ?)";
        };
    }

    private void appendVisibilityParams(List<Object> params, PosContext context) {
        switch (context.scope().type()) {
            case CORPORATE_OFFICE -> { }
            case UNIT_HEADQUARTERS -> {
                params.add(context.scope().unitId());
                params.add(context.scope().unitId());
            }
            case BUSINESS_OFFICE -> {
                params.add(context.scope().businessId());
                params.add(context.scope().unitId());
            }
        }
    }

    private String select() {
        return "SELECT rule.* FROM pos_discount_rules rule";
    }

    private DiscountRuleRecord map(ResultSet rs, int rowNum) throws SQLException {
        return new DiscountRuleRecord(
            rs.getLong("id"), rs.getLong("company_id"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), PosSqlSupport.nullableLong(rs, "warehouse_id"),
            rs.getString("name"), rs.getString("description"), rs.getString("scope"),
            rs.getString("discount_type"), rs.getBigDecimal("discount_value"), rs.getString("currency_code"),
            PosSqlSupport.instant(rs, "starts_at"), PosSqlSupport.instant(rs, "ends_at"),
            rs.getBigDecimal("minimum_amount"), rs.getBigDecimal("maximum_discount_amount"),
            rs.getString("customer_type"), PosSqlSupport.nullableLong(rs, "product_id"), rs.getString("category"),
            rs.getBoolean("requires_authorization"), rs.getBoolean("stackable"), rs.getInt("priority"),
            rs.getString("status"), rs.getString("enabled_channels_json"), rs.getLong("version"),
            PosSqlSupport.instant(rs, "created_at"), PosSqlSupport.instant(rs, "updated_at"));
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
