package com.indice.erp.sales.funneling;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.sales.funneling.FunnelContracts.*;

@Repository
public class FunnelRepository {
    private final JdbcTemplate db;
    private final ObjectMapper mapper;
    public FunnelRepository(JdbcTemplate db, ObjectMapper mapper) { this.db = db; this.mapper = mapper; }

    public void lockCompany(long company) {
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE", Long.class, company);
    }

    private static final String SELECT = "SELECT f.*,b.funnel_id AS brief_id,b.idea,b.offer,b.location,b.goal,b.channels_json,b.materials_json,b.destination,b.destination_detail,b.timing,b.budget_note,b.ai_response,b.deferred_recommendations_json";
    private static final String FROM = " FROM sales_funnels f LEFT JOIN sales_funnel_briefs b ON b.company_id=f.company_id AND b.funnel_id=f.id";

    public Optional<Plan> find(long company, String id) {
        return db.query(SELECT + FROM + " WHERE f.company_id=? AND f.id=?", this::read, company, id).stream().findFirst();
    }

    public PlanPage list(long company, String search, String status, int page, int size, String sort, String direction) {
        String where = FROM + " WHERE f.company_id=? AND (?='ALL' OR f.status=?) AND (f.name LIKE ? ESCAPE '!' OR f.objective LIKE ? ESCAPE '!' OR b.idea LIKE ? ESCAPE '!')";
        String term = "%" + search.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        // sort/direction are selected from the service allowlist, never raw request values.
        Long total = db.queryForObject("SELECT COUNT(*)" + where, Long.class, company, status, status, term, term, term);
        var items = db.query(SELECT + where + " ORDER BY f." + sort + " " + direction + ",f.id LIMIT ? OFFSET ?",
            this::read, company, status, status, term, term, term, size, (page - 1) * size);
        return new PlanPage(items, total, page, size);
    }

    public void save(long company, long actor, String id, PlanInput input) {
        String stages = encode(input.stages());
        String guide = input.contentGuide() == null ? null : encode(input.contentGuide());
        if (input.version() == 0) {
            db.update("""
                INSERT INTO sales_funnels(company_id,id,name,objective,audience,channel,notes,stages_json,content_guide_json,status,version,created_by,updated_by)
                VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)
                """, company, id, input.name().trim(), input.objective().trim(), input.audience().trim(), input.channel(),
                input.notes().trim(), stages, guide, input.status(), actor, actor);
        } else {
            db.update("""
                UPDATE sales_funnels SET name=?,objective=?,audience=?,channel=?,notes=?,stages_json=?,content_guide_json=COALESCE(?,content_guide_json),status=?,
                version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?
                """, input.name().trim(), input.objective().trim(), input.audience().trim(), input.channel(), input.notes().trim(),
                stages, guide, input.status(), actor, company, id, input.version());
        }
        if (input.workshop() != null) saveWorkshop(company, id, input.workshop());
        db.update("INSERT INTO sales_funnel_audit(company_id,funnel_id,actor_user_id,version,status) VALUES(?,?,?,?,?)",
            company, id, actor, input.version() + 1, input.status());
    }

    private Plan read(ResultSet row, int index) throws SQLException {
        List<Stage> stages;
        try { stages = mapper.readValue(row.getString("stages_json"), new TypeReference<List<Stage>>() { }); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Invalid stored funnel stages", error); }
        return new Plan(row.getString("id"), row.getString("name"), row.getString("objective"), row.getString("audience"),
            row.getString("channel"), row.getString("notes"), stages, row.getString("status"), row.getLong("version"),
            row.getTimestamp("updated_at").toInstant(), null, List.of(), row.getString("brief_id") == null ? null : readWorkshop(row), readGuide(row.getString("content_guide_json")));
    }

    private ContentGuide readGuide(String value) {
        if (value == null) return null;
        try { return mapper.readValue(value, ContentGuide.class); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Invalid stored content guide", error); }
    }

    private Workshop readWorkshop(ResultSet row) throws SQLException {
        return new Workshop(row.getString("idea"), row.getString("offer"), row.getString("location"), row.getString("goal"),
            strings(row.getString("channels_json")), strings(row.getString("materials_json")), row.getString("destination"),
            row.getString("destination_detail"), row.getString("timing"), row.getString("budget_note"), row.getString("ai_response"),
            strings(row.getString("deferred_recommendations_json")));
    }
    private List<String> strings(String value) {
        try { return mapper.readValue(value, new TypeReference<List<String>>() { }); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Invalid stored campaign brief", error); }
    }
    private void saveWorkshop(long company, String id, Workshop brief) {
        db.update("""
            INSERT INTO sales_funnel_briefs(company_id,funnel_id,idea,offer,location,goal,channels_json,materials_json,
                destination,destination_detail,timing,budget_note,ai_response,deferred_recommendations_json)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE idea=VALUES(idea),offer=VALUES(offer),location=VALUES(location),goal=VALUES(goal),
                channels_json=VALUES(channels_json),materials_json=VALUES(materials_json),destination=VALUES(destination),
                destination_detail=VALUES(destination_detail),timing=VALUES(timing),budget_note=VALUES(budget_note),
                ai_response=VALUES(ai_response),deferred_recommendations_json=VALUES(deferred_recommendations_json)
            """, company,id,brief.idea().trim(),brief.offer().trim(),brief.location().trim(),brief.goal(),encode(brief.channels()),
            encode(brief.materials()),brief.destination(),brief.destinationDetail().trim(),brief.timing().trim(),brief.budgetNote().trim(),
            brief.aiResponse(),encode(brief.deferredRecommendations()));
    }
    private String encode(Object stages) {
        try { return mapper.writeValueAsString(stages); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Unable to store funnel stages", error); }
    }
}
