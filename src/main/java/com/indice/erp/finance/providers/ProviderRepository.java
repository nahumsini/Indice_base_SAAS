package com.indice.erp.finance.providers;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceScope;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class ProviderRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ProviderMapper mapper;

    ProviderRepository(JdbcTemplate jdbcTemplate, ProviderMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<ProviderRecord> findAll(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + ProviderSql.SELECT_COLUMNS + """
            FROM finance_providers provider
            WHERE provider.company_id = ?
              AND provider.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("provider", context.scope()) + """
            ORDER BY provider.name ASC, provider.id ASC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<ProviderRecord> findById(FinanceContext context, long providerId) {
        var params = scopedParams(context);
        params.add(1, providerId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + ProviderSql.SELECT_COLUMNS + """
            FROM finance_providers provider
            WHERE provider.company_id = ?
              AND provider.id = ?
              AND provider.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("provider", context.scope()) + """
            """,
            mapper::mapRow,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    ProviderRecord insert(FinanceContext context, ProviderCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(ProviderSql.INSERT, Statement.RETURN_GENERATED_KEYS);
            ProviderStatementBinder.bindInsert(statement, context, command);
            return statement;
        }, keyHolder);
        var providerId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, providerId).orElseThrow();
    }

    boolean update(FinanceContext context, long providerId, ProviderCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(ProviderSql.UPDATE);
            ProviderStatementBinder.bindUpdate(statement, context, providerId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean existsByName(FinanceContext context, String name, Long excludedProviderId) {
        return existsByField(context, "name", name, excludedProviderId);
    }

    boolean existsByTaxId(FinanceContext context, String taxId, Long excludedProviderId) {
        if (taxId == null || taxId.isBlank()) {
            return false;
        }
        return existsByField(context, "tax_id", taxId, excludedProviderId);
    }

    boolean softDelete(FinanceContext context, long providerId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_providers
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            providerId
        );
        return updated > 0;
    }

    private boolean existsByField(FinanceContext context, String column, String value, Long excludedProviderId) {
        var sql = "SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND deleted_at IS NULL AND "
            + column + " = ?";
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(value);
        if (excludedProviderId != null) {
            sql += " AND id <> ?";
            params.add(excludedProviderId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    private ArrayList<Object> scopedParams(FinanceContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        appendScopeParam(params, context.scope());
        return params;
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }
}
