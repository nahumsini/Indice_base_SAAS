package com.indice.erp.learning;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LearningProgressRepository {
    private final JdbcTemplate jdbc;
    public LearningProgressRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Understanding> understandings(long company,long user) {
        return jdbc.query("SELECT chapter_id,chapter_version,understood_at FROM learning_chapter_progress WHERE company_id=? AND user_id=?",
            (r,n)->new Understanding(r.getString(1),r.getInt(2),r.getTimestamp(3).toInstant()),company,user);
    }
    public Map<String,Instant> applications(long company,long user) {
        var result=new HashMap<String,Instant>();
        jdbc.query("SELECT chapter_id,MAX(occurred_at) FROM learning_operation_events WHERE company_id=? AND user_id=? GROUP BY chapter_id",
            (org.springframework.jdbc.core.RowCallbackHandler)r->result.put(r.getString(1),r.getTimestamp(2).toInstant()),company,user);
        return result;
    }
    public String current(long company,long user) {
        return jdbc.query("SELECT current_chapter_id FROM learning_journey_state WHERE company_id=? AND user_id=?",
            (r,n)->r.getString(1),company,user).stream().findFirst().orElse(null);
    }
    public void select(long company,long user,String chapter) {
        jdbc.update("INSERT INTO learning_journey_state(company_id,user_id,current_chapter_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE current_chapter_id=VALUES(current_chapter_id),updated_at=CURRENT_TIMESTAMP(6)",company,user,chapter);
    }
    public void understand(long company,long user,String chapter,int version) {
        jdbc.update("INSERT INTO learning_chapter_progress(company_id,user_id,chapter_id,chapter_version) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE understood_at=understood_at",company,user,chapter,version);
    }
    public void apply(long company,long user,String chapter,String operation) {
        jdbc.update("INSERT INTO learning_operation_events(company_id,user_id,chapter_id,operation_name) VALUES(?,?,?,?)",company,user,chapter,operation);
    }
    public record Understanding(String chapterId,int version,Instant at) { }
}
