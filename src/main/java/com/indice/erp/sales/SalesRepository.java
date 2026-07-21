package com.indice.erp.sales;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class SalesRepository {

    private static final Set<String> FILTER_CONTROL_KEYS = Set.of(
            "search",
            "includeItems",
            "include_items",
            "entityType",
            "entity_type",
            "entityId",
            "entity_id");

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    SalesRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    List<Map<String, Object>> list(long companyId, SalesEntityDefinition definition, Map<String, String> filters) {
        var sql = new StringBuilder("SELECT ")
                .append(listSelectColumns(definition))
                .append(", ")
                .append("(SELECT COUNT(*) FROM sales_files file WHERE file.company_id = entity.company_id ")
                .append("AND file.entity_type = ? AND file.entity_id = entity.id AND file.deleted_at IS NULL) AS files_count ")
                .append("FROM ")
                .append(definition.tableName())
                .append(" entity WHERE entity.company_id = ? AND entity.deleted_at IS NULL");
        var params = new ArrayList<Object>();
        params.add(definition.entityType());
        params.add(companyId);
        appendFilters(sql, params, definition, filters);
        sql.append(" ORDER BY entity.").append(definition.defaultOrder());

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> rowToApi(rs, definition), params.toArray());
    }

    private String listSelectColumns(SalesEntityDefinition definition) {
        var columns = new ArrayList<String>();
        columns.add("entity.id");
        for (var field : definition.fields()) {
            if ("metadata_json".equals(field.columnName())) {
                continue;
            }
            columns.add("entity." + field.columnName());
        }
        columns.add("entity.created_at");
        columns.add("entity.updated_at");
        return String.join(", ", columns);
    }

    Map<String, Object> get(long companyId, SalesEntityDefinition definition, long id) {
        var rows = jdbcTemplate.query(
                "SELECT entity.*, (SELECT COUNT(*) FROM sales_files file WHERE file.company_id = entity.company_id "
                        + "AND file.entity_type = ? AND file.entity_id = entity.id AND file.deleted_at IS NULL) AS files_count "
                        + "FROM " + definition.tableName() + " entity WHERE entity.company_id = ? AND entity.id = ? AND entity.deleted_at IS NULL",
                (rs, rowNum) -> rowToApi(rs, definition),
                definition.entityType(),
                companyId,
                id);
        if (rows.isEmpty()) {
            throw new NoSuchElementException(definition.entityType() + " not found.");
        }
        return rows.getFirst();
    }

    long create(long companyId, long userId, SalesEntityDefinition definition, Map<String, Object> payload) {
        requireFields(definition, payload);
        var fieldMap = definition.fieldMap();
        var columns = new ArrayList<String>();
        var values = new ArrayList<Object>();
        var types = new ArrayList<SalesFieldType>();
        var knownFields = new ArrayList<>(fieldMap.keySet());

        columns.add("company_id");
        values.add(companyId);
        types.add(SalesFieldType.LONG);

        for (var field : definition.fields()) {
            var value = SalesPayloadSupport.value(payload, field.apiName());
            if (field.apiName().equals(definition.codeApiName()) && isBlank(value)) {
                value = nextCode(companyId, definition);
            }
            if (field.apiName().equals("customFields") && isBlank(value)) {
                var customFields = SalesPayloadSupport.customFields(payload, knownFields);
                if (!customFields.isEmpty()) {
                    value = customFields;
                }
            }
            if (value == null) {
                continue;
            }
            columns.add(field.columnName());
            values.add(coerceValue(field.type(), value));
            types.add(field.type());
        }

        columns.add("created_by_user_id");
        values.add(userId);
        types.add(SalesFieldType.LONG);
        columns.add("updated_by_user_id");
        values.add(userId);
        types.add(SalesFieldType.LONG);

        var placeholders = String.join(", ", java.util.Collections.nCopies(columns.size(), "?"));
        var sql = "INSERT INTO " + definition.tableName() + " (" + String.join(", ", columns) + ") VALUES (" + placeholders + ")";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (var index = 0; index < values.size(); index++) {
                SalesPayloadSupport.setValue(statement, index + 1, types.get(index), values.get(index), objectMapper);
            }
            return statement;
        }, keyHolder);

        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
    }

    void update(long companyId, long userId, SalesEntityDefinition definition, long id, Map<String, Object> payload) {
        get(companyId, definition, id);
        var fieldMap = definition.fieldMap();
        var assignments = new ArrayList<String>();
        var values = new ArrayList<Object>();
        var types = new ArrayList<SalesFieldType>();
        var knownFields = new ArrayList<>(fieldMap.keySet());

        for (var field : definition.fields()) {
            if (!SalesPayloadSupport.contains(payload, field.apiName())) {
                continue;
            }
            assignments.add(field.columnName() + " = ?");
            values.add(coerceValue(field.type(), SalesPayloadSupport.value(payload, field.apiName())));
            types.add(field.type());
        }

        var customFields = SalesPayloadSupport.customFields(payload, knownFields);
        if (!customFields.isEmpty() && !SalesPayloadSupport.contains(payload, "customFields") && fieldMap.containsKey("customFields")) {
            var customField = fieldMap.get("customFields");
            assignments.add(customField.columnName() + " = ?");
            values.add(customFields);
            types.add(SalesFieldType.JSON);
        }

        if (assignments.isEmpty()) {
            return;
        }
        assignments.add("updated_by_user_id = ?");
        values.add(userId);
        types.add(SalesFieldType.LONG);

        var sql = "UPDATE " + definition.tableName() + " SET " + String.join(", ", assignments)
                + " WHERE company_id = ? AND id = ? AND deleted_at IS NULL";
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(sql);
            for (var index = 0; index < values.size(); index++) {
                SalesPayloadSupport.setValue(statement, index + 1, types.get(index), values.get(index), objectMapper);
            }
            statement.setLong(values.size() + 1, companyId);
            statement.setLong(values.size() + 2, id);
            return statement;
        });
    }

    void softDelete(long companyId, SalesEntityDefinition definition, long id) {
        get(companyId, definition, id);
        jdbcTemplate.update(
                "UPDATE " + definition.tableName() + " SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?",
                companyId,
                id);
    }

    List<Map<String, Object>> listQuoteItems(long companyId, long quoteId) {
        return jdbcTemplate.query(
                """
                        SELECT *
                        FROM sales_quote_items
                        WHERE company_id = ?
                          AND quote_id = ?
                        ORDER BY sort_order ASC, id ASC
                        """,
                (rs, rowNum) -> quoteItemRow(rs),
                companyId,
                quoteId);
    }

    long createQuoteItem(long companyId, long quoteId, Map<String, Object> payload) {
        var productName = firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "productName"),
                SalesPayloadSupport.stringValue(payload, "name"),
                "Quote item");
        var quantity = firstDecimal(SalesPayloadSupport.decimalValue(payload, "quantity"), BigDecimal.ONE);
        var unitPrice = firstDecimal(SalesPayloadSupport.decimalValue(payload, "unitPrice"), BigDecimal.ZERO);
        var discountPercent = firstDecimal(SalesPayloadSupport.decimalValue(payload, "discountPercent"), BigDecimal.ZERO);
        var taxPercent = firstDecimal(SalesPayloadSupport.decimalValue(payload, "taxPercent"), BigDecimal.ZERO);
        var lineTotal = calculateLineTotal(quantity, unitPrice, discountPercent, taxPercent);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            INSERT INTO sales_quote_items
                            (company_id, quote_id, product_id, section, product_name, sku, quantity, unit_price,
                             discount_percent, tax_percent, line_total, sort_order, metadata_json)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setLong(2, quoteId);
            statement.setObject(3, SalesPayloadSupport.longValue(payload, "productId"));
            statement.setString(4, SalesPayloadSupport.stringValue(payload, "section"));
            statement.setString(5, productName);
            statement.setString(6, SalesPayloadSupport.stringValue(payload, "sku"));
            statement.setBigDecimal(7, quantity);
            statement.setBigDecimal(8, unitPrice);
            statement.setBigDecimal(9, discountPercent);
            statement.setBigDecimal(10, taxPercent);
            statement.setBigDecimal(11, lineTotal);
            statement.setObject(12, firstInteger(SalesPayloadSupport.integerValue(payload, "sortOrder"), 0));
            statement.setString(13, SalesPayloadSupport.jsonValue(objectMapper, SalesPayloadSupport.value(payload, "metadata")));
            return statement;
        }, keyHolder);
        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
    }

    void updateQuoteItem(long companyId, long quoteId, long itemId, Map<String, Object> payload) {
        var current = requireQuoteItem(companyId, quoteId, itemId);
        var quantity = firstDecimal(SalesPayloadSupport.decimalValue(payload, "quantity"), (BigDecimal) current.get("quantity"));
        var unitPrice = firstDecimal(SalesPayloadSupport.decimalValue(payload, "unitPrice"), (BigDecimal) current.get("unitPrice"));
        var discountPercent = firstDecimal(SalesPayloadSupport.decimalValue(payload, "discountPercent"), (BigDecimal) current.get("discountPercent"));
        var taxPercent = firstDecimal(SalesPayloadSupport.decimalValue(payload, "taxPercent"), (BigDecimal) current.get("taxPercent"));
        var lineTotal = calculateLineTotal(quantity, unitPrice, discountPercent, taxPercent);

        jdbcTemplate.update(
                """
                        UPDATE sales_quote_items
                        SET product_id = ?,
                            section = ?,
                            product_name = ?,
                            sku = ?,
                            quantity = ?,
                            unit_price = ?,
                            discount_percent = ?,
                            tax_percent = ?,
                            line_total = ?,
                            sort_order = ?,
                            metadata_json = ?
                        WHERE company_id = ?
                          AND quote_id = ?
                          AND id = ?
                        """,
                firstLong(SalesPayloadSupport.longValue(payload, "productId"), (Long) current.get("productId")),
                firstNonBlank(SalesPayloadSupport.stringValue(payload, "section"), (String) current.get("section")),
                firstNonBlank(SalesPayloadSupport.stringValue(payload, "productName"), (String) current.get("productName")),
                firstNonBlank(SalesPayloadSupport.stringValue(payload, "sku"), (String) current.get("sku")),
                quantity,
                unitPrice,
                discountPercent,
                taxPercent,
                lineTotal,
                firstInteger(SalesPayloadSupport.integerValue(payload, "sortOrder"), (Integer) current.get("sortOrder")),
                SalesPayloadSupport.jsonValue(objectMapper, firstObject(SalesPayloadSupport.value(payload, "metadata"), current.get("metadata"))),
                companyId,
                quoteId,
                itemId);
    }

    void deleteQuoteItem(long companyId, long quoteId, long itemId) {
        jdbcTemplate.update(
                "DELETE FROM sales_quote_items WHERE company_id = ? AND quote_id = ? AND id = ?",
                companyId,
                quoteId,
                itemId);
    }

    void deleteQuoteItems(long companyId, long quoteId) {
        jdbcTemplate.update(
                "DELETE FROM sales_quote_items WHERE company_id = ? AND quote_id = ?",
                companyId,
                quoteId);
    }

    BigDecimal quoteItemsTotal(long companyId, long quoteId) {
        var total = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(line_total), 0) FROM sales_quote_items WHERE company_id = ? AND quote_id = ?",
                BigDecimal.class,
                companyId,
                quoteId);
        return total == null ? BigDecimal.ZERO : total;
    }

    List<Map<String, Object>> listFiles(long companyId, String entityType, Long entityId) {
        var sql = new StringBuilder("SELECT * FROM sales_files WHERE company_id = ? AND deleted_at IS NULL");
        var params = new ArrayList<Object>();
        params.add(companyId);
        if (entityType != null && !entityType.isBlank()) {
            sql.append(" AND entity_type = ?");
            params.add(entityType);
        }
        if (entityId != null) {
            sql.append(" AND entity_id = ?");
            params.add(entityId);
        }
        sql.append(" ORDER BY created_at DESC, id DESC");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> fileRow(rs), params.toArray());
    }

    Map<String, Object> findFile(long companyId, long fileId) {
        return jdbcTemplate.query(
            "SELECT * FROM sales_files WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
            (rs, rowNum) -> fileRow(rs), companyId, fileId
        ).stream().findFirst().orElse(null);
    }

    long createFile(long companyId, long userId, Map<String, Object> payload) {
        var entityType = requiredString(payload, "entityType");
        var entityId = SalesPayloadSupport.longValue(payload, "entityId");
        var fileName = requiredString(payload, "fileName");
        if (entityId == null) {
            throw new IllegalArgumentException("entityId is required.");
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            INSERT INTO sales_files
                            (company_id, entity_type, entity_id, file_name, file_kind, file_status, source,
                             object_key, url, metadata_json, created_by_user_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setString(2, entityType);
            statement.setLong(3, entityId);
            statement.setString(4, fileName);
            statement.setString(5, SalesPayloadSupport.stringValue(payload, "fileKind"));
            statement.setString(6, SalesPayloadSupport.stringValue(payload, "fileStatus"));
            statement.setString(7, SalesPayloadSupport.stringValue(payload, "source"));
            statement.setString(8, SalesPayloadSupport.stringValue(payload, "objectKey"));
            statement.setString(9, SalesPayloadSupport.stringValue(payload, "url"));
            statement.setString(10, SalesPayloadSupport.jsonValue(objectMapper, SalesPayloadSupport.value(payload, "metadata")));
            statement.setLong(11, userId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
    }

    void deleteFile(long companyId, long fileId) {
        jdbcTemplate.update(
                "UPDATE sales_files SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?",
                companyId,
                fileId);
    }

    List<Map<String, Object>> contextUsers(long companyId) {
        return jdbcTemplate.query(
                """
                        SELECT uc.id AS user_company_id,
                               uc.user_id,
                               COALESCE(NULLIF(TRIM(up.full_name), ''), NULLIF(TRIM(u.full_name), ''), u.email) AS full_name,
                               u.email,
                               uc.role,
                               uc.status
                        FROM user_companies uc
                        INNER JOIN users u ON u.id = uc.user_id
                        LEFT JOIN user_profiles up ON up.user_id = u.id
                        WHERE uc.company_id = ?
                          AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                        ORDER BY full_name ASC, uc.id ASC
                        """,
                (rs, rowNum) -> {
                    var row = new LinkedHashMap<String, Object>();
                    row.put("userCompanyId", rs.getLong("user_company_id"));
                    row.put("userId", rs.getLong("user_id"));
                    row.put("name", rs.getString("full_name"));
                    row.put("email", rs.getString("email"));
                    row.put("role", rs.getString("role"));
                    row.put("status", rs.getString("status"));
                    return row;
                },
                companyId);
    }

    List<Map<String, Object>> contextUnits(long companyId) {
        return jdbcTemplate.query(
                """
                        SELECT id, name, description, status
                        FROM units
                        WHERE (company_id = ? OR company_id IS NULL)
                          AND (status = 'active' OR status IS NULL OR status = '')
                        ORDER BY name ASC, id ASC
                        """,
                (rs, rowNum) -> {
                    var row = new LinkedHashMap<String, Object>();
                    row.put("id", rs.getLong("id"));
                    row.put("name", rs.getString("name"));
                    row.put("description", rs.getString("description"));
                    row.put("status", rs.getString("status"));
                    return row;
                },
                companyId);
    }

    List<Map<String, Object>> contextBusinesses(long companyId) {
        return jdbcTemplate.query(
                """
                        SELECT id, unit_id, name, address, description, status
                        FROM businesses
                        WHERE (company_id = ? OR company_id IS NULL)
                          AND (status = 'active' OR status IS NULL OR status = '')
                        ORDER BY name ASC, id ASC
                        """,
                (rs, rowNum) -> {
                    var row = new LinkedHashMap<String, Object>();
                    row.put("id", rs.getLong("id"));
                    row.put("unitId", nullableLong(rs, "unit_id"));
                    row.put("name", rs.getString("name"));
                    row.put("address", rs.getString("address"));
                    row.put("description", rs.getString("description"));
                    row.put("status", rs.getString("status"));
                    return row;
                },
                companyId);
    }

    boolean existsInCompany(String tableName, long companyId, long id) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName + " WHERE company_id = ? AND id = ?",
                Integer.class,
                companyId,
                id);
        return count != null && count > 0;
    }

    boolean existsNullableCompanyTable(String tableName, long companyId, long id) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName + " WHERE (company_id = ? OR company_id IS NULL) AND id = ?",
                Integer.class,
                companyId,
                id);
        return count != null && count > 0;
    }

    Map<String, Object> kpis(long companyId) {
        var body = new LinkedHashMap<String, Object>();
        body.put("contacts", count("sales_contacts", companyId));
        body.put("opportunities", count("sales_opportunities", companyId));
        body.put("activeOpportunities", countWhere(
                "sales_opportunities",
                companyId,
                "LOWER(status) NOT IN ('closed') AND LOWER(stage) NOT IN ('won', 'lost')"));
        body.put("quotes", count("sales_quotes", companyId));
        body.put("approvedQuotes", countWhere("sales_quotes", companyId, "LOWER(status) IN ('approved', 'closed_won', 'closed won', 'accepted')"));
        body.put("products", count("sales_products", companyId));
        body.put("sales", count("sales_records", companyId));
        body.put("postSales", count("sales_post_sale_cases", companyId));
        body.put("contracts", count("sales_contracts", companyId));
        body.put("pendingSignatures", countWhere("sales_contracts", companyId, "LOWER(signature_status) IN ('waiting', 'pending_signature', 'pending signature')"));
        body.put("pipelineValue", sum("sales_opportunities", companyId, "estimated_value"));
        body.put("quotedValue", sum("sales_quotes", companyId, "amount"));
        body.put("salesValue", sum("sales_records", companyId, "total_amount"));
        body.put("monthlySales", countWhere(
                "sales_records",
                companyId,
                "sale_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AND sale_date < DATE_ADD(LAST_DAY(CURRENT_DATE()), INTERVAL 1 DAY)"));
        body.put("monthlySalesValue", sumWhere(
                "sales_records",
                companyId,
                "total_amount",
                "sale_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AND sale_date < DATE_ADD(LAST_DAY(CURRENT_DATE()), INTERVAL 1 DAY)"));
        body.put("weeklySales", countWhere(
                "sales_records",
                companyId,
                "sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY) AND sale_date < DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY), INTERVAL 7 DAY)"));
        body.put("weeklySalesValue", sumWhere(
                "sales_records",
                companyId,
                "total_amount",
                "sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY) AND sale_date < DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY), INTERVAL 7 DAY)"));
        body.put("pendingFinanceSales", countWhere("sales_records", companyId, "LOWER(finance_status) IN ('pending', 'pending_validation')"));
        body.put("pendingInventorySales", countWhere("sales_records", companyId, "LOWER(inventory_movement_status) IN ('not_generated', 'pending')"));
        return body;
    }

    void updateQuoteAmount(long companyId, long quoteId, BigDecimal amount) {
        jdbcTemplate.update(
                "UPDATE sales_quotes SET amount = ? WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
                amount,
                companyId,
                quoteId);
    }

    void linkQuoteToOpportunity(long companyId, long quoteId, Long opportunityId, String connectionStatus) {
        jdbcTemplate.update(
                """
                        UPDATE sales_quotes
                        SET opportunity_id = ?,
                            connection_status = ?
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                opportunityId,
                connectionStatus,
                companyId,
                quoteId);
    }

    private void appendFilters(
            StringBuilder sql,
            List<Object> params,
            SalesEntityDefinition definition,
            Map<String, String> filters) {
        if (filters == null || filters.isEmpty()) {
            return;
        }
        var fieldMap = definition.fieldMap();
        var search = filters.get("search");
        if (search != null && !search.isBlank() && !definition.searchFields().isEmpty()) {
            var searchConditions = new ArrayList<String>();
            for (var searchField : definition.searchFields()) {
                var field = fieldMap.get(searchField);
                if (field != null) {
                    searchConditions.add("LOWER(COALESCE(entity." + field.columnName() + ", '')) LIKE ?");
                    params.add("%" + search.trim().toLowerCase(Locale.ROOT) + "%");
                }
            }
            if (!searchConditions.isEmpty()) {
                sql.append(" AND (").append(String.join(" OR ", searchConditions)).append(")");
            }
        }
        for (var entry : filters.entrySet()) {
            if (FILTER_CONTROL_KEYS.contains(entry.getKey()) || entry.getValue() == null || entry.getValue().isBlank()
                    || "all".equalsIgnoreCase(entry.getValue())) {
                continue;
            }
            var apiName = snakeToCamel(entry.getKey());
            var field = fieldMap.get(apiName);
            if (field == null) {
                continue;
            }
            sql.append(" AND entity.").append(field.columnName()).append(" = ?");
            params.add(entry.getValue());
        }
    }

    private void requireFields(SalesEntityDefinition definition, Map<String, Object> payload) {
        for (var field : definition.requiredOnCreate()) {
            if (isBlank(SalesPayloadSupport.value(payload, field))) {
                throw new IllegalArgumentException(field + " is required.");
            }
        }
    }

    private Map<String, Object> rowToApi(ResultSet rs, SalesEntityDefinition definition) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put(definition.idApiName(), rs.getLong("id"));
        var metadata = rs.getMetaData();
        for (var field : definition.fields()) {
            if (hasColumn(metadata, field.columnName())) {
                row.put(field.apiName(), valueFromResultSet(rs, field.columnName(), field.type()));
            }
        }
        row.put("filesCount", hasColumn(metadata, "files_count") ? rs.getLong("files_count") : 0L);
        row.put("createdAt", valueFromResultSet(rs, "created_at", SalesFieldType.DATETIME));
        row.put("updatedAt", valueFromResultSet(rs, "updated_at", SalesFieldType.DATETIME));
        return row;
    }

    private Map<String, Object> quoteItemRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("quoteId", rs.getLong("quote_id"));
        row.put("productId", nullableLong(rs, "product_id"));
        row.put("section", rs.getString("section"));
        row.put("productName", rs.getString("product_name"));
        row.put("sku", rs.getString("sku"));
        row.put("quantity", rs.getBigDecimal("quantity"));
        row.put("unitPrice", rs.getBigDecimal("unit_price"));
        row.put("discountPercent", rs.getBigDecimal("discount_percent"));
        row.put("taxPercent", rs.getBigDecimal("tax_percent"));
        row.put("lineTotal", rs.getBigDecimal("line_total"));
        row.put("sortOrder", rs.getInt("sort_order"));
        row.put("metadata", SalesPayloadSupport.parseJson(objectMapper, rs.getString("metadata_json")));
        return row;
    }

    private Map<String, Object> fileRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("entityType", rs.getString("entity_type"));
        row.put("entityId", rs.getLong("entity_id"));
        row.put("fileName", rs.getString("file_name"));
        row.put("fileKind", rs.getString("file_kind"));
        row.put("fileStatus", rs.getString("file_status"));
        row.put("source", rs.getString("source"));
        row.put("objectKey", rs.getString("object_key"));
        row.put("url", rs.getString("url"));
        row.put("metadata", SalesPayloadSupport.parseJson(objectMapper, rs.getString("metadata_json")));
        row.put("createdByUserId", nullableLong(rs, "created_by_user_id"));
        row.put("createdAt", valueFromResultSet(rs, "created_at", SalesFieldType.DATETIME));
        return row;
    }

    private Map<String, Object> requireQuoteItem(long companyId, long quoteId, long itemId) {
        var rows = jdbcTemplate.query(
                "SELECT * FROM sales_quote_items WHERE company_id = ? AND quote_id = ? AND id = ?",
                (rs, rowNum) -> quoteItemRow(rs),
                companyId,
                quoteId,
                itemId);
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Quote item not found.");
        }
        return rows.getFirst();
    }

    private Object valueFromResultSet(ResultSet rs, String columnName, SalesFieldType type) throws SQLException {
        return switch (type) {
            case LONG -> nullableLong(rs, columnName);
            case INTEGER -> {
                var value = rs.getObject(columnName);
                yield value == null ? null : ((Number) value).intValue();
            }
            case DECIMAL -> rs.getBigDecimal(columnName);
            case BOOLEAN -> {
                var value = rs.getObject(columnName);
                yield value == null ? null : rs.getBoolean(columnName);
            }
            case DATE -> {
                var date = rs.getDate(columnName);
                yield date == null ? null : date.toLocalDate().toString();
            }
            case DATETIME -> {
                var timestamp = rs.getTimestamp(columnName);
                yield timestamp == null ? null : timestamp.toLocalDateTime().toString();
            }
            case JSON -> SalesPayloadSupport.parseJson(objectMapper, rs.getString(columnName));
            case STRING -> rs.getString(columnName);
        };
    }

    private Object coerceValue(SalesFieldType type, Object value) {
        if (value == null) {
            return null;
        }
        return switch (type) {
            case STRING -> String.valueOf(value).trim();
            case LONG -> SalesPayloadSupport.toLong(value);
            case INTEGER -> value instanceof Number number ? number.intValue() : Integer.parseInt(String.valueOf(value));
            case DECIMAL -> SalesPayloadSupport.toBigDecimal(value);
            case BOOLEAN -> value instanceof Boolean bool ? bool : Boolean.TRUE.equals(SalesPayloadSupport.booleanValue(Map.of("value", value), "value"));
            case DATE -> value instanceof LocalDate ? value : LocalDate.parse(String.valueOf(value).length() > 10 ? String.valueOf(value).substring(0, 10) : String.valueOf(value));
            case DATETIME -> value instanceof LocalDateTime ? value : SalesPayloadSupport.toLocalDateTime(value);
            case JSON -> value;
        };
    }

    private String nextCode(long companyId, SalesEntityDefinition definition) {
        var next = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(id), 0) + 1 FROM " + definition.tableName() + " WHERE company_id = ?",
                Long.class,
                companyId);
        return definition.codePrefix() + "-" + String.format("%05d", next == null ? 1L : next);
    }

    private int count(String tableName, long companyId) {
        return countWhere(tableName, companyId, "1 = 1");
    }

    private int countWhere(String tableName, long companyId, String condition) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName + " WHERE company_id = ? AND deleted_at IS NULL AND " + condition,
                Integer.class,
                companyId);
        return count == null ? 0 : count;
    }

    private BigDecimal sum(String tableName, long companyId, String column) {
        var total = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(" + column + "), 0) FROM " + tableName + " WHERE company_id = ? AND deleted_at IS NULL",
                BigDecimal.class,
                companyId);
        return total == null ? BigDecimal.ZERO : total;
    }

    private BigDecimal sumWhere(String tableName, long companyId, String column, String condition) {
        var total = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(" + column + "), 0) FROM " + tableName + " WHERE company_id = ? AND deleted_at IS NULL AND " + condition,
                BigDecimal.class,
                companyId);
        return total == null ? BigDecimal.ZERO : total;
    }

    private static BigDecimal calculateLineTotal(BigDecimal quantity, BigDecimal unitPrice, BigDecimal discountPercent, BigDecimal taxPercent) {
        var subtotal = quantity.multiply(unitPrice);
        var discount = subtotal.multiply(discountPercent).divide(BigDecimal.valueOf(100));
        var afterDiscount = subtotal.subtract(discount);
        var tax = afterDiscount.multiply(taxPercent).divide(BigDecimal.valueOf(100));
        return afterDiscount.add(tax);
    }

    private static boolean hasColumn(ResultSetMetaData metadata, String columnName) throws SQLException {
        for (var index = 1; index <= metadata.getColumnCount(); index++) {
            if (columnName.equalsIgnoreCase(metadata.getColumnLabel(index))) {
                return true;
            }
        }
        return false;
    }

    private static Long nullableLong(ResultSet rs, String columnName) throws SQLException {
        var value = rs.getObject(columnName);
        return value == null ? null : ((Number) value).longValue();
    }

    private static boolean isBlank(Object value) {
        return value == null || String.valueOf(value).trim().isBlank();
    }

    private static String requiredString(Map<String, Object> payload, String field) {
        var value = SalesPayloadSupport.stringValue(payload, field);
        if (value == null) {
            throw new IllegalArgumentException(field + " is required.");
        }
        return value;
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private static String firstNonBlank(String first, String second, String fallback) {
        var value = firstNonBlank(first, second);
        return value != null && !value.isBlank() ? value : fallback;
    }

    private static BigDecimal firstDecimal(BigDecimal first, BigDecimal fallback) {
        return first != null ? first : fallback;
    }

    private static Long firstLong(Long first, Long fallback) {
        return first != null ? first : fallback;
    }

    private static Integer firstInteger(Integer first, Integer fallback) {
        return first != null ? first : fallback;
    }

    private static Object firstObject(Object first, Object fallback) {
        return first != null ? first : fallback;
    }

    private static String snakeToCamel(String value) {
        if (value == null || !value.contains("_")) {
            return value;
        }
        var parts = value.split("_");
        var result = new StringBuilder(parts[0]);
        for (var index = 1; index < parts.length; index++) {
            if (!parts[index].isBlank()) {
                result.append(parts[index].substring(0, 1).toUpperCase(Locale.ROOT));
                if (parts[index].length() > 1) {
                    result.append(parts[index].substring(1));
                }
            }
        }
        return result.toString();
    }
}
