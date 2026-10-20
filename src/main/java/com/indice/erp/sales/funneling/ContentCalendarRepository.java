package com.indice.erp.sales.funneling;

import static com.indice.erp.sales.funneling.ContentCalendarContracts.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ContentCalendarRepository {
    private final JdbcTemplate db;
    private final ObjectMapper mapper;
    public ContentCalendarRepository(JdbcTemplate db, ObjectMapper mapper) { this.db = db; this.mapper = mapper; }
    public record Stored(Calendar calendar, String mutationId, String digest) {}
    static String actorKey(AuthSessionUser actor) { return actor.companyId() + ":" + actor.userId(); }

    public Optional<Stored> find(AuthSessionUser actor, String funnel) {
        return db.query("SELECT * FROM sales_content_calendars WHERE company_id=? AND funnel_id=?", (row, index) ->
            new Stored(new Calendar(decode(row.getString("content_json")), row.getLong("version"),
                row.getTimestamp("updated_at").toInstant(), actorKey(actor)),
                row.getString("last_mutation_id"), row.getString("content_digest")), actor.companyId(), funnel).stream().findFirst();
    }
    public void save(AuthSessionUser actor, String funnel, Input input, String json, String digest) {
        db.update("""
            INSERT INTO sales_content_calendars(company_id,funnel_id,content_json,version,last_mutation_id,content_digest,updated_by)
            VALUES(?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE content_json=VALUES(content_json),version=VALUES(version),
            last_mutation_id=VALUES(last_mutation_id),content_digest=VALUES(content_digest),
            updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP(6)
            """, actor.companyId(), funnel, json, input.version() + 1, input.mutationId(), digest, actor.userId());
        db.update("""
            INSERT INTO sales_content_calendar_audit(company_id,funnel_id,actor_user_id,version,entry_count)
            VALUES(?,?,?,?,?)
            """, actor.companyId(), funnel, actor.userId(), input.version() + 1, input.content().entries().size());
    }
    String encode(Document content) {
        try { return mapper.writeValueAsString(content); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Unable to encode content calendar", error); }
    }
    private Document decode(String json) {
        try { return mapper.readValue(json, Document.class); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Invalid stored content calendar", error); }
    }
}
