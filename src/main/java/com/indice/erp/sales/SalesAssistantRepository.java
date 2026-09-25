package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.sales.SalesAssistantContracts.*;

@Repository
class SalesAssistantRepository {
    private final JdbcTemplate jdbc;
    SalesAssistantRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    String collection(String kind) {
        return switch (kind) { case "customer" -> "contacts"; case "opportunity" -> "opportunities";
            case "quote" -> "quotes"; default -> throw new IllegalArgumentException("Unknown commercial entity."); };
    }
    String table(String kind) { return SalesDefinitions.definitions().get(collection(kind)).tableName(); }

    void requireRecord(AuthSessionUser user, HrOperationalScope scope, String kind, long id, boolean lock) {
        var args = new ArrayList<Object>(List.of(user.companyId(), id));
        var sql = "SELECT e.id FROM " + table(kind) + " e WHERE e.company_id = ? AND e.id = ? AND e.deleted_at IS NULL"
            + scopeSql(kind, scope, args) + (lock ? " FOR UPDATE" : "");
        if (jdbc.queryForList(sql, Long.class, args.toArray()).isEmpty()) throw new NoSuchElementException("Commercial record not found.");
    }

    IdPage page(AuthSessionUser user, HrOperationalScope scope, String kind, Query query, int offset, int limit) {
        var args = new ArrayList<Object>(List.of(user.companyId()));
        var definition = SalesDefinitions.definitions().get(collection(kind));
        var name = switch (kind) { case "customer" -> "company_name"; case "opportunity" -> "opportunity_name"; default -> "client_name"; };
        var where = " FROM " + table(kind) + " e WHERE e.company_id = ? AND e.deleted_at IS NULL" + scopeSql(kind, scope, args);
        if (query.query() != null && !query.query().isBlank()) {
            where += " AND (LOCATE(LOWER(?), LOWER(e." + name + ")) > 0 OR LOCATE(LOWER(?), LOWER(e." + definition.codeColumnName() + ")) > 0)";
            args.add(query.query().trim()); args.add(query.query().trim());
        }
        if (query.status() != null) { where += " AND e.status = ?"; args.add(query.status()); }
        if (query.stage() != null) {
            if (!kind.equals("opportunity")) throw new IllegalArgumentException("Stage applies only to opportunities.");
            where += " AND e.stage = ?"; args.add(query.stage());
        }
        if (query.customerId() != null) {
            if (kind.equals("customer")) throw new IllegalArgumentException("Customer filter applies to opportunities and quotes.");
            where += " AND e.contact_id = ?"; args.add(query.customerId());
        }
        if (query.ownerUserCompanyId() != null) {
            where += " AND e." + (kind.equals("quote") ? "assigned_seller_user_company_id" : "owner_user_company_id") + " = ?";
            args.add(query.ownerUserCompanyId());
        }
        int total = jdbc.queryForObject("SELECT COUNT(*)" + where, Integer.class, args.toArray());
        if (offset > total) throw new IllegalArgumentException("Cursor is no longer valid.");
        args.add(limit); args.add(offset);
        return new IdPage(jdbc.queryForList("SELECT e.id" + where + " ORDER BY e.id LIMIT ? OFFSET ?", Long.class, args.toArray()), total);
    }

    List<PipelineBucket> pipeline(AuthSessionUser user, HrOperationalScope scope, Flow flow) {
        var initial = flow.stages().stream().filter(stage -> stage.type().equals("OPEN")).findFirst().orElseThrow().key();
        var args = new ArrayList<Object>(java.util.Arrays.asList(initial, flow.id(), user.companyId()));
        return jdbc.query("SELECT COALESCE(s.stage_key, CASE WHEN e.lifecycle_status = 'WON' THEN 'won'"
            + " WHEN e.lifecycle_status = 'LOST' THEN 'lost' ELSE ? END) pipeline_stage, e.lifecycle_status, e.currency, COUNT(*) n, SUM(e.estimated_value) amount"
            + " FROM sales_opportunities e LEFT JOIN sales_opportunity_flow_positions p ON p.company_id = e.company_id AND p.opportunity_id = e.id AND p.flow_id = ?"
            + " LEFT JOIN sales_opportunity_flow_stages s ON s.company_id = e.company_id AND s.id = p.stage_id AND s.is_active = 1"
            + " WHERE e.company_id = ? AND e.deleted_at IS NULL" + scopeSql("opportunity", scope, args)
            + " GROUP BY pipeline_stage, e.lifecycle_status, e.currency ORDER BY pipeline_stage, e.currency",
            (rs, n) -> new PipelineBucket(rs.getString("pipeline_stage"), rs.getString("lifecycle_status"), rs.getString("currency"),
                rs.getInt("n"), rs.getBigDecimal("amount")), args.toArray());
    }

    SalesReferenceReadService.Page<Assignee> assignees(AuthSessionUser user, HrOperationalScope scope, String query, Long id, int offset, int limit) {
        var args = new ArrayList<Object>(List.of(user.companyId()));
        var displayName = "COALESCE(NULLIF(TRIM(up.full_name), ''), NULLIF(TRIM(u.full_name), ''), 'Sin nombre')";
        var sql = " FROM user_companies uc"
            + " JOIN users u ON u.id = uc.user_id LEFT JOIN user_profiles up ON up.user_id = u.id"
            + " LEFT JOIN user_work_profiles wp ON wp.company_id = uc.company_id AND wp.user_company_id = uc.id"
            + " WHERE uc.company_id = ? AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')"
            + scope.assignmentPredicate("wp.unit_id", "wp.business_id", "uc.company_id");
        args.addAll(scope.assignmentParameters());
        if (id != null) { sql += " AND uc.id = ?"; args.add(id); }
        if (query != null && !query.isBlank()) {
            sql += " AND (" + displayName + ") COLLATE utf8mb4_0900_ai_ci LIKE ? ESCAPE '='";
            args.add("%" + query.trim().replace("=", "==").replace("%", "=%").replace("_", "=_") + "%");
        }
        int count = jdbc.queryForObject("SELECT COUNT(*)" + sql, Integer.class, args.toArray());
        if (offset > count) throw new IllegalArgumentException("Cursor is no longer valid.");
        args.add(limit); args.add(offset);
        var rows = jdbc.query("SELECT uc.id, " + displayName + " name, wp.unit_id, wp.business_id" + sql + " ORDER BY uc.id LIMIT ? OFFSET ?",
            (rs, n) -> new Assignee(rs.getLong("id"), rs.getString("name"), nullable(rs.getObject("unit_id")), nullable(rs.getObject("business_id"))), args.toArray());
        return new SalesReferenceReadService.Page<>(rows, count);
    }

    void lockItems(long companyId, long quoteId) {
        jdbc.queryForList("SELECT id FROM sales_quote_items WHERE company_id = ? AND quote_id = ? ORDER BY id FOR UPDATE", companyId, quoteId);
    }

    void lockReference(long companyId, String kind, long id) {
        if (kind.equals("product")) {
            jdbc.queryForList("SELECT id FROM sales_products WHERE company_id = ? AND id = ? AND deleted_at IS NULL FOR UPDATE", companyId, id);
        } else if (kind.equals("assignee")) {
            jdbc.queryForList("SELECT id FROM user_companies WHERE company_id = ? AND id = ? FOR UPDATE", companyId, id);
            jdbc.queryForList("SELECT id FROM user_work_profiles WHERE company_id = ? AND user_company_id = ? FOR UPDATE", companyId, id);
        } else throw new IllegalArgumentException("Unknown commercial reference.");
    }

    void lockFlows(long companyId) {
        jdbc.queryForList("SELECT id FROM sales_opportunity_flows WHERE company_id = ? ORDER BY id FOR UPDATE", companyId);
        jdbc.queryForList("SELECT id FROM sales_opportunity_flow_stages WHERE company_id = ? ORDER BY id FOR UPDATE", companyId);
    }

    boolean quoteHasSale(long companyId, long quoteId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM sales_records WHERE company_id = ? AND quote_id = ? AND deleted_at IS NULL",
            Integer.class, companyId, quoteId) > 0;
    }

    private String scopeSql(String kind, HrOperationalScope scope, List<Object> args) {
        if (!kind.equals("quote")) {
            args.addAll(scope.assignmentParameters());
            return scope.assignmentPredicate("e.unit_id", "e.business_id", "e.company_id");
        }
        if (scope.isCorporateOffice()) return "";
        args.addAll(scope.assignmentParameters()); args.addAll(scope.assignmentParameters());
        return " AND (EXISTS (SELECT 1 FROM sales_opportunities owner WHERE owner.company_id = e.company_id AND owner.id = e.opportunity_id AND owner.deleted_at IS NULL"
            + scope.assignmentPredicate("owner.unit_id", "owner.business_id", "owner.company_id") + ") OR (e.opportunity_id IS NULL AND EXISTS"
            + " (SELECT 1 FROM sales_contacts owner WHERE owner.company_id = e.company_id AND owner.id = e.contact_id AND owner.deleted_at IS NULL"
            + scope.assignmentPredicate("owner.unit_id", "owner.business_id", "owner.company_id") + ")))";
    }
    private static Long nullable(Object value) { return value instanceof Number n ? n.longValue() : null; }
    record IdPage(List<Long> ids, int total) { }
}
