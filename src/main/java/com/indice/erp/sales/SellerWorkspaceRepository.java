package com.indice.erp.sales;

import static com.indice.erp.sales.SellerWorkspaceDtos.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class SellerWorkspaceRepository {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    SellerWorkspaceRepository(JdbcTemplate db, ObjectMapper json) { this.db = db; this.json = json; }

    String actor(long company, long user) {
        return db.query("""
            SELECT u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id
            WHERE uc.company_id=? AND uc.user_id=? AND uc.status='active'
            """, (rs, n) -> rs.getString(1), company, user).stream().findFirst()
            .orElseThrow(() -> new NoSuchElementException("Active company member not found."));
    }
    void lockOpportunity(long company, long flow, long opportunity) {
        if (db.query("""
            SELECT id FROM sales_opportunities WHERE company_id=? AND assigned_flow_id=?
              AND id=? AND deleted_at IS NULL FOR UPDATE
            """, (rs, n) -> rs.getLong(1), company, flow, opportunity).isEmpty())
            throw new NoSuchElementException("Opportunity not found in this flow.");
    }
    void requireOpportunity(long company, long flow, long opportunity) {
        if (db.query("""
            SELECT id FROM sales_opportunities WHERE company_id=? AND assigned_flow_id=?
              AND id=? AND deleted_at IS NULL
            """, (rs, n) -> rs.getLong(1), company, flow, opportunity).isEmpty())
            throw new NoSuchElementException("Opportunity not found in this flow.");
    }
    List<ScriptResponse> scripts(long company, long flow) {
        return db.query(SCRIPT_SELECT + " WHERE s.company_id=? AND s.flow_id=? ORDER BY s.archived,s.id DESC LIMIT 200",
                this::script, company, flow);
    }
    ScriptResponse script(long company, long flow, long id, boolean lock) {
        return db.query(SCRIPT_SELECT + " WHERE s.company_id=? AND s.flow_id=? AND s.id=?" + (lock ? " FOR UPDATE" : ""),
                this::script, company, flow, id).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Script not found."));
    }
    long createScript(long company, long flow) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("INSERT INTO sales_call_scripts(company_id,flow_id,version) VALUES(?,?,0)", Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, company); statement.setLong(2, flow); return statement;
        }, key);
        return key.getKey().longValue();
    }
    void saveScript(long company, long id, int version, long actor, String status, ScriptContent content) {
        db.update("""
            INSERT INTO sales_call_script_versions(company_id,script_id,version,actor_user_id,publication_status,content_json)
            VALUES(?,?,?,?,?,?)
            """, company, id, version, actor, status, encode(content));
        db.update("""
            UPDATE sales_call_scripts SET version=?, published_version=CASE WHEN ?='PUBLISHED' THEN ? ELSE published_version END,
              archived=(?='ARCHIVED'), updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?
            """, version, status, version, status, company, id);
    }
    ScriptContent publishedVersion(long company, long flow, long id, int version) {
        return db.query("""
            SELECT v.content_json FROM sales_call_script_versions v JOIN sales_call_scripts s
              ON s.company_id=v.company_id AND s.id=v.script_id
            WHERE v.company_id=? AND s.flow_id=? AND v.script_id=? AND v.version=? AND v.publication_status='PUBLISHED'
            """, (rs, n) -> decode(rs.getString(1)), company, flow, id, version).stream().findFirst()
            .orElseThrow(() -> new NoSuchElementException("Published script version not found."));
    }
    record Receipt(long opportunityId, String hash, InteractionResponse interaction) {}
    Receipt receipt(long company, long actor, String key) {
        return db.query("SELECT * FROM sales_call_interactions WHERE company_id=? AND actor_user_id=? AND request_key=?",
                (rs, n) -> new Receipt(rs.getLong("opportunity_id"), rs.getString("request_hash"), interaction(rs, n)), company, actor, key)
                .stream().findFirst().orElse(null);
    }
    InteractionResponse insertInteraction(long company, long flow, long opportunity, long actor, String actorName,
            InteractionRequest request, String hash, String scriptName) {
        db.update("""
            INSERT INTO sales_call_interactions(company_id,flow_id,opportunity_id,actor_user_id,actor_name,request_key,request_hash,
                outcome,notes,script_id,script_version,script_name,followup_mode,next_action,next_action_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, company, flow, opportunity, actor, actorName, request.requestKey(), hash, request.outcome(), request.notes(),
                request.scriptId(), request.scriptVersion(), scriptName, request.followupMode(), request.nextAction(), request.nextActionAt());
        return receipt(company, actor, request.requestKey()).interaction();
    }
    HistoryResponse history(long company, long opportunity, Long before) {
        var rows = db.query("SELECT * FROM sales_call_interactions WHERE company_id=? AND opportunity_id=? AND id<? ORDER BY id DESC LIMIT 51",
                this::interaction, company, opportunity, before == null ? Long.MAX_VALUE : before);
        boolean more = rows.size() > 50;
        var page = more ? rows.subList(0, 50) : rows;
        return new HistoryResponse(page, more ? page.getLast().id() : null);
    }
    DaySummary summary(long company, long flow, long actor, String date, String zone, LocalDateTime start, LocalDateTime end) {
        return db.queryForObject("""
            SELECT COUNT(*) attempts, COALESCE(SUM(outcome IN ('answered','information_requested','callback')),0) conversations,
              COALESCE(SUM(followup_mode='schedule'),0) followups FROM sales_call_interactions
            WHERE company_id=? AND flow_id=? AND actor_user_id=? AND created_at>=? AND created_at<?
            """, (rs, n) -> new DaySummary(date, zone, rs.getInt(1), rs.getInt(2), rs.getInt(3)), company, flow, actor, start, end);
    }
    private InteractionResponse interaction(ResultSet rs, int n) throws SQLException {
        return new InteractionResponse(rs.getLong("id"), rs.getString("outcome"), rs.getString("notes"), rs.getString("actor_name"),
                rs.getTimestamp("created_at").toLocalDateTime().toString() + "Z", rs.getString("script_name"),
                rs.getObject("script_version", Integer.class), rs.getString("followup_mode"), rs.getString("next_action"), rs.getString("next_action_at"));
    }
    private ScriptResponse script(ResultSet rs, int n) throws SQLException {
        return new ScriptResponse(rs.getLong("id"), rs.getInt("version"), rs.getObject("published_version", Integer.class),
                rs.getBoolean("archived"), decode(rs.getString("content_json")), decode(rs.getString("published_json")));
    }
    private String encode(ScriptContent content) {
        try { return json.writeValueAsString(content); }
        catch (JsonProcessingException ex) { throw new IllegalArgumentException("Invalid script content."); }
    }
    private ScriptContent decode(String content) {
        if (content == null) return null;
        try { return json.readValue(content, ScriptContent.class); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Cannot read script content."); }
    }
    private static final String SCRIPT_SELECT = """
        SELECT s.*, v.content_json, p.content_json published_json FROM sales_call_scripts s
        JOIN sales_call_script_versions v ON v.company_id=s.company_id AND v.script_id=s.id AND v.version=s.version
        LEFT JOIN sales_call_script_versions p ON p.company_id=s.company_id AND p.script_id=s.id AND p.version=s.published_version
        """;
}
