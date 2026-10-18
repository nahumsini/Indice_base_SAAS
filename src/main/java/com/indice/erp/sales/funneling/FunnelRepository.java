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

    public Optional<Plan> find(long company, String id) {
        return db.query("SELECT * FROM sales_funnels WHERE company_id=? AND id=?", this::read, company, id).stream().findFirst();
    }

    public PlanPage list(long company, String search, String status, int page, int size, String sort, String direction) {
        String where = " FROM sales_funnels WHERE company_id=? AND (?='ALL' OR status=?) AND (name LIKE ? ESCAPE '!' OR objective LIKE ? ESCAPE '!')";
        String term = "%" + search.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        // sort/direction are selected from the service allowlist, never raw request values.
        Long total = db.queryForObject("SELECT COUNT(*)" + where, Long.class, company, status, status, term, term);
        var items = db.query("SELECT *" + where + " ORDER BY " + sort + " " + direction + ",id LIMIT ? OFFSET ?",
            this::read, company, status, status, term, term, size, (page - 1) * size);
        return new PlanPage(items, total, page, size);
    }

    public void save(long company, long actor, String id, PlanInput input) {
        String stages = encode(input.stages());
        if (input.version() == 0) {
            db.update("""
                INSERT INTO sales_funnels(company_id,id,name,objective,audience,channel,notes,stages_json,status,version,created_by,updated_by)
                VALUES(?,?,?,?,?,?,?,?,?,1,?,?)
                """, company, id, input.name().trim(), input.objective().trim(), input.audience().trim(), input.channel(),
                input.notes().trim(), stages, input.status(), actor, actor);
        } else {
            db.update("""
                UPDATE sales_funnels SET name=?,objective=?,audience=?,channel=?,notes=?,stages_json=?,status=?,
                version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?
                """, input.name().trim(), input.objective().trim(), input.audience().trim(), input.channel(), input.notes().trim(),
                stages, input.status(), actor, company, id, input.version());
        }
        db.update("INSERT INTO sales_funnel_audit(company_id,funnel_id,actor_user_id,version,status) VALUES(?,?,?,?,?)",
            company, id, actor, input.version() + 1, input.status());
    }

    private Plan read(ResultSet row, int index) throws SQLException {
        List<Stage> stages;
        try { stages = mapper.readValue(row.getString("stages_json"), new TypeReference<List<Stage>>() { }); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Invalid stored funnel stages", error); }
        return new Plan(row.getString("id"), row.getString("name"), row.getString("objective"), row.getString("audience"),
            row.getString("channel"), row.getString("notes"), stages, row.getString("status"), row.getLong("version"),
            row.getTimestamp("updated_at").toInstant(), null, List.of());
    }

    private String encode(List<Stage> stages) {
        try { return mapper.writeValueAsString(stages); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Unable to store funnel stages", error); }
    }
}
