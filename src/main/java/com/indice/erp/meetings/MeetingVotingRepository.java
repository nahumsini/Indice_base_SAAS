package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingVotingDtos.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MeetingVotingRepository {
    private final JdbcTemplate db;
    public MeetingVotingRepository(JdbcTemplate db){this.db=db;}
    public JdbcTemplate jdbc(){return db;}
    public long insert(String sql,Object... args) {
        var key=new GeneratedKeyHolder();
        db.update(c->{var s=c.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);
            for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public record Row(long id,long meetingId,String subject,String description,String status,String outcome,
        String approvalRule,String quorumRule,int total,int approval,int quorum,long version,
        Instant createdAt,Instant closedAt,String reason) {
        @Override public String toString(){return "BallotRow[protected]";}
    }
    public Row row(long company,long meeting,long id,boolean lock) {
        return db.query("SELECT * FROM meeting_ballots WHERE company_id=? AND meeting_id=? AND id=?"+(lock?" FOR UPDATE":""),
            (r,n)->new Row(r.getLong("id"),r.getLong("meeting_id"),r.getString("subject"),r.getString("description"),
                r.getString("status"),r.getString("outcome"),r.getString("approval_rule"),r.getString("quorum_rule"),
                r.getInt("total_weight"),r.getInt("approval_weight"),r.getInt("quorum_weight"),r.getLong("version"),
                r.getTimestamp("created_at").toInstant(),r.getTimestamp("closed_at")==null?null:r.getTimestamp("closed_at").toInstant(),r.getString("close_reason")),
            company,meeting,id).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    public Tally tally(long company,long id) {
        return db.query("""
            SELECT COALESCE(SUM(CASE WHEN v.choice='YES' THEN r.weight ELSE 0 END),0),
              COALESCE(SUM(CASE WHEN v.choice='NO' THEN r.weight ELSE 0 END),0),
              COALESCE(SUM(CASE WHEN v.choice='ABSTAIN' THEN r.weight ELSE 0 END),0),
              COALESCE(SUM(CASE WHEN v.choice IS NOT NULL THEN r.weight ELSE 0 END),0),
              COUNT(CASE WHEN v.choice IS NOT NULL AND r.weight>0 THEN 1 END),COUNT(CASE WHEN r.weight>0 THEN 1 END)
            FROM meeting_ballot_voters v JOIN meeting_ballot_roles r
              ON r.company_id=v.company_id AND r.ballot_id=v.ballot_id AND r.role_key=v.role_key
            WHERE v.company_id=? AND v.ballot_id=?
            """,(r,n)->new Tally(r.getInt(1),r.getInt(2),r.getInt(3),r.getInt(4),r.getInt(5),r.getInt(6)),company,id).getFirst();
    }
    public List<Role> roles(long company,long id) {
        return db.query("SELECT role_key,name,weight FROM meeting_ballot_roles WHERE company_id=? AND ballot_id=? ORDER BY role_key",
            (r,n)->new Role(r.getString(1),r.getString(2),r.getInt(3)),company,id);
    }
    public List<Voter> voters(long company,long id) {
        return db.query("""
            SELECT v.*,r.name role_name,r.weight FROM meeting_ballot_voters v JOIN meeting_ballot_roles r
              ON r.company_id=v.company_id AND r.ballot_id=v.ballot_id AND r.role_key=v.role_key
            WHERE v.company_id=? AND v.ballot_id=? ORDER BY v.name_snapshot,v.user_id
            """,(r,n)->new Voter(r.getLong("user_id"),r.getString("name_snapshot"),r.getString("role_key"),r.getString("role_name"),
                r.getInt("weight"),r.getString("choice"),r.getLong("vote_version"),r.getTimestamp("voted_at")==null?null:r.getTimestamp("voted_at").toInstant(),false),company,id);
    }
    public List<Audit> history(long company,long id) {
        return db.query("SELECT u.full_name,a.action,a.choice,a.reason,a.occurred_at FROM meeting_ballot_audit a JOIN users u ON u.id=a.actor_id WHERE a.company_id=? AND a.ballot_id=? ORDER BY a.id DESC LIMIT 100",
            (r,n)->new Audit(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getTimestamp(5).toInstant()),company,id);
    }
    public void audit(long company,long id,long actor,String action,String choice,String reason) {
        db.update("INSERT INTO meeting_ballot_audit(company_id,ballot_id,actor_id,action,choice,reason) VALUES(?,?,?,?,?,?)",company,id,actor,action,choice,reason);
    }
    public boolean hasOpen(long company,long meeting) {
        return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM meeting_ballots WHERE company_id=? AND meeting_id=? AND status='OPEN')",Boolean.class,company,meeting));
    }
    public void cancelOpen(long company,long meeting,long actor,String reason) {
        var ids=db.queryForList("SELECT id FROM meeting_ballots WHERE company_id=? AND meeting_id=? AND status='OPEN' ORDER BY id FOR UPDATE",Long.class,company,meeting);
        for(long id:ids) {
            db.update("UPDATE meeting_ballots SET status='CANCELLED',outcome='CANCELLED',closed_by=?,closed_at=UTC_TIMESTAMP(6),close_reason=?,version=version+1 WHERE company_id=? AND id=?",actor,reason,company,id);
            audit(company,id,actor,"CANCELLED",null,reason);
        }
    }
    public List<Result> results(long company,long meeting) {
        return db.queryForList("SELECT id FROM meeting_ballots WHERE company_id=? AND meeting_id=? AND status<>'OPEN' ORDER BY id",Long.class,company,meeting)
            .stream().map(id->{var row=row(company,meeting,id,false);return new Result(id,row.subject(),row.outcome(),row.approvalRule(),row.total(),row.approval(),row.quorum(),tally(company,id),row.closedAt(),row.reason());}).toList();
    }
}
