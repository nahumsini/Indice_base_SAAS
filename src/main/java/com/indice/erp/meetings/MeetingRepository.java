package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class MeetingRepository {
    private final JdbcTemplate db;
    public MeetingRepository(JdbcTemplate db){this.db=db;}
    private static final String SELECT="SELECT m.*,u.full_name owner_name,(SELECT COUNT(*) FROM meeting_participants p WHERE p.company_id=m.company_id AND p.meeting_id=m.id) participant_count FROM meeting_records m JOIN users u ON u.id=m.owner_id ";
    static String visibility(AuthSessionUser actor){return MeetingAccessService.administrator(actor)?"":" AND (m.owner_id="+actor.userId()+" OR EXISTS(SELECT 1 FROM meeting_participants p WHERE p.company_id=m.company_id AND p.meeting_id=m.id AND p.user_id="+actor.userId()+"))";}
    private static String agreementVisibility(AuthSessionUser actor){return MeetingAccessService.administrator(actor)?"":" AND (a.assignee_id="+actor.userId()+" OR m.owner_id="+actor.userId()+" OR EXISTS(SELECT 1 FROM meeting_participants p WHERE p.company_id=m.company_id AND p.meeting_id=m.id AND p.user_id="+actor.userId()+"))";}
    private static final RowMapper<MeetingItem> MEETING=(r,n)->new MeetingItem(r.getLong("id"),r.getString("title"),r.getString("meeting_type"),r.getString("status"),r.getTimestamp("start_at").toInstant(),r.getTimestamp("end_at").toInstant(),r.getString("timezone"),r.getLong("owner_id"),r.getString("owner_name"),r.getInt("participant_count"),!r.getString("minutes").isBlank(),r.getLong("version"));
    private static final RowMapper<AgreementItem> AGREEMENT=(r,n)->new AgreementItem(r.getLong("id"),r.getLong("meeting_id"),r.getString("meeting_title"),r.getString("title"),r.getLong("assignee_id"),r.getString("assignee_name"),r.getDate("due_date").toLocalDate(),r.getString("status"),r.getString("resolution"),r.getLong("version"),r.getLong("owner_id"));
    private static final String AGREEMENT_SELECT="SELECT a.*,m.title meeting_title,m.owner_id,u.full_name assignee_name FROM meeting_agreements a JOIN meeting_records m ON m.company_id=a.company_id AND m.id=a.meeting_id JOIN users u ON u.id=a.assignee_id ";
    @Transactional(readOnly=true) public Page<MeetingItem> meetings(AuthSessionUser actor,Instant from,Instant to,String search,String status,int page,int size){
        return meetings(actor,from,to,search,status,"",0,"start","asc",page,size);
    }
    @Transactional(readOnly=true) public Page<MeetingItem> meetings(AuthSessionUser actor,Instant from,Instant to,String search,String status,String attention,long ownerId,String sort,String direction,int page,int size){
        String extra=switch(attention){case "awaitingClosure"->" AND m.status IN ('PLANNED','IN_PROGRESS') AND m.end_at<UTC_TIMESTAMP(6)";case "missingMinutes"->" AND m.status<>'CANCELLED' AND m.end_at<UTC_TIMESTAMP(6) AND TRIM(m.minutes)=''";case ""->"";default->throw new IllegalArgumentException();};
        String order=switch(sort){case "start"->"m.start_at";case "title"->"m.title";case "owner"->"u.full_name";case "status"->"m.status";case "participants"->"participant_count";default->throw new IllegalArgumentException();};
        if(!Set.of("asc","desc").contains(direction))throw new IllegalArgumentException();
        String where=" WHERE m.company_id=? AND m.start_at>=? AND m.start_at<?"+visibility(actor)+" AND (?='' OR m.status=?) AND (?='' OR LOCATE(LOWER(?),LOWER(m.title))>0) AND (?=0 OR m.owner_id=?)"+extra;
        Object[] args={actor.companyId(),Timestamp.from(from),Timestamp.from(to),status,status,search,search,ownerId,ownerId};
        long total=db.queryForObject("SELECT COUNT(*) FROM meeting_records m"+where,Long.class,args);
        var values=new ArrayList<>(Arrays.asList(args));values.add(size);values.add((page-1)*size);
        return new Page<>(db.query(SELECT+where+" ORDER BY "+order+" "+direction+",m.id LIMIT ? OFFSET ?",MEETING,values.toArray()),total,page,size);
    }
    public MeetingItem meeting(AuthSessionUser actor,long id,boolean lock){
        return db.query(SELECT+" WHERE m.company_id=? AND m.id=?"+visibility(actor)+(lock?" FOR UPDATE":""),MEETING,actor.companyId(),id).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    public List<Member> participants(long company,long id){
        return db.query("SELECT u.id,u.full_name FROM meeting_participants p JOIN users u ON u.id=p.user_id WHERE p.company_id=? AND p.meeting_id=? ORDER BY u.full_name,u.id",(r,n)->new Member(r.getLong(1),r.getString(2)),company,id);
    }
    @Transactional(readOnly=true) public MeetingDetail detail(AuthSessionUser actor,long id){
        var item=meeting(actor,id,false);
        var texts=db.queryForMap("SELECT agenda,location,minutes,decisions FROM meeting_records WHERE company_id=? AND id=?",actor.companyId(),id);
        var history=db.query("SELECT a.action,u.full_name,a.reason,a.occurred_at FROM meeting_audit a JOIN users u ON u.id=a.actor_id WHERE a.company_id=? AND a.meeting_id=? AND a.agreement_id IS NULL ORDER BY a.id DESC LIMIT 100",(r,n)->new AuditItem(r.getString(1),r.getString(2),r.getString(3),r.getTimestamp(4).toInstant()),actor.companyId(),id);
        return new MeetingDetail(item,(String)texts.get("agenda"),(String)texts.get("location"),(String)texts.get("minutes"),(String)texts.get("decisions"),participants(actor.companyId(),id),history,planning(actor.companyId(),id));
    }
    public PlanningMetadata planning(long company,long id){
        return db.query("SELECT m.objective,m.expected_result,COALESCE(m.minutes_owner_id,m.owner_id) minutes_owner,u.full_name,m.reminder_minutes,m.series_id,m.occurrence_number,COALESCE(s.reminders_paused,0) paused,COALESCE(s.version,0) series_version FROM meeting_records m JOIN users u ON u.id=COALESCE(m.minutes_owner_id,m.owner_id) LEFT JOIN meeting_series s ON s.company_id=m.company_id AND s.id=m.series_id WHERE m.company_id=? AND m.id=?",
            (r,n)->new PlanningMetadata(r.getString(1),r.getString(2),new Member(r.getLong(3),r.getString(4)),r.getInt(5),(Long)r.getObject(6),(Integer)r.getObject(7),r.getBoolean(8),r.getLong(9)),company,id).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
    @Transactional(readOnly=true) public Directory members(long company){
        var items=db.query("SELECT u.id,u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.status='active' ORDER BY u.full_name,u.id LIMIT 500",(r,n)->new Member(r.getLong(1),r.getString(2)),company);
        return new Directory(items,db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND status='active'",Long.class,company));
    }
    public boolean activeMember(long company,long user){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM user_companies WHERE company_id=? AND user_id=? AND status='active')",Boolean.class,company,user));}
    @Transactional(readOnly=true) public List<MeetingChoice> choices(AuthSessionUser actor){
        var rows=db.query(SELECT+" WHERE m.company_id=?"+(MeetingAccessService.administrator(actor)?"":" AND m.owner_id="+actor.userId())+" AND m.status<>'CANCELLED' ORDER BY m.start_at DESC,m.id DESC LIMIT 100",MEETING,actor.companyId());
        return rows.stream().filter(m->MeetingAccessService.administrator(actor)||m.ownerId()==actor.userId()).map(m->{var people=new ArrayList<>(participants(actor.companyId(),m.id()));if(people.stream().noneMatch(p->p.id()==m.ownerId()))people.add(new Member(m.ownerId(),m.ownerName()));return new MeetingChoice(m.id(),m.title(),people);}).toList();
    }
    @Transactional(readOnly=true) public Directory assignees(AuthSessionUser actor){
        String scope=" FROM meeting_agreements a JOIN meeting_records m ON m.company_id=a.company_id AND m.id=a.meeting_id JOIN users u ON u.id=a.assignee_id WHERE a.company_id=?"+agreementVisibility(actor);
        var items=db.query("SELECT DISTINCT u.id,u.full_name"+scope+" ORDER BY u.full_name,u.id LIMIT 500",(r,n)->new Member(r.getLong(1),r.getString(2)),actor.companyId());
        return new Directory(items,db.queryForObject("SELECT COUNT(DISTINCT u.id)"+scope,Long.class,actor.companyId()));
    }
    @Transactional(readOnly=true) public Page<AgreementItem> agreements(AuthSessionUser actor,LocalDate from,LocalDate to,String search,String status,int page,int size){
        return agreements(actor,from,to,search,status,"",0,"due","asc",LocalDate.now(ZoneOffset.UTC),page,size);
    }
    @Transactional(readOnly=true) public Page<AgreementItem> agreements(AuthSessionUser actor,LocalDate from,LocalDate to,String search,String status,String attention,long assigneeId,String sort,String direction,LocalDate today,int page,int size){
        if(!Set.of("","overdueAgreements").contains(attention)||!Set.of("asc","desc").contains(direction))throw new IllegalArgumentException();
        String order=switch(sort){case "due"->"a.due_date";case "title"->"a.title";case "meeting"->"m.title";case "assignee"->"u.full_name";case "status"->"a.status";default->throw new IllegalArgumentException();};
        String where=" WHERE a.company_id=? AND a.due_date>=? AND a.due_date<?"+agreementVisibility(actor)+" AND (?='' OR a.status=?) AND (?='' OR LOCATE(LOWER(?),LOWER(a.title))>0) AND (?=0 OR a.assignee_id=?) AND (?='' OR (a.status='OPEN' AND a.due_date<?))";
        Object[] args={actor.companyId(),java.sql.Date.valueOf(from),java.sql.Date.valueOf(to),status,status,search,search,assigneeId,assigneeId,attention,java.sql.Date.valueOf(today)};
        long total=db.queryForObject("SELECT COUNT(*) FROM meeting_agreements a JOIN meeting_records m ON m.company_id=a.company_id AND m.id=a.meeting_id"+where,Long.class,args);
        var values=new ArrayList<>(Arrays.asList(args));values.add(size);values.add((page-1)*size);
        return new Page<>(db.query(AGREEMENT_SELECT+where+" ORDER BY "+order+" "+direction+",a.id LIMIT ? OFFSET ?",AGREEMENT,values.toArray()),total,page,size);
    }
    public AgreementItem agreement(AuthSessionUser actor,long id,boolean lock){return db.query(AGREEMENT_SELECT+" WHERE a.company_id=? AND a.id=?"+agreementVisibility(actor)+(lock?" FOR UPDATE":""),AGREEMENT,actor.companyId(),id).stream().findFirst().orElseThrow(NoSuchElementException::new);}
    @Transactional(readOnly=true) public Metrics metrics(AuthSessionUser actor,Instant from,Instant to,ZoneId zone){
        String scope=" FROM meeting_records m WHERE m.company_id=? AND m.start_at>=? AND m.start_at<?"+visibility(actor);
        Object[] args={actor.companyId(),Timestamp.from(from),Timestamp.from(to)};
        long[] values=new long[6];String[] states={"PLANNED","IN_PROGRESS","COMPLETED","CANCELLED"};
        for(int i=0;i<4;i++)values[i]=db.queryForObject("SELECT COUNT(*)"+scope+" AND m.status='"+states[i]+"'",Long.class,args);
        Instant now=Instant.now();var timed=new ArrayList<>(Arrays.asList(args));timed.add(Timestamp.from(now));
        values[4]=db.queryForObject("SELECT COUNT(*)"+scope+" AND m.status IN ('PLANNED','IN_PROGRESS') AND m.end_at<?",Long.class,timed.toArray());
        values[5]=db.queryForObject("SELECT COUNT(*)"+scope+" AND m.status<>'CANCELLED' AND m.end_at<? AND TRIM(m.minutes)=''",Long.class,timed.toArray());
        String agreements=" FROM meeting_agreements a JOIN meeting_records m ON m.company_id=a.company_id AND m.id=a.meeting_id WHERE a.company_id=? AND a.due_date>=? AND a.due_date<? AND a.status='OPEN'"+agreementVisibility(actor);
        Object[] dueArgs={actor.companyId(),java.sql.Date.valueOf(from.atZone(zone).toLocalDate()),java.sql.Date.valueOf(to.atZone(zone).toLocalDate())};
        long open=db.queryForObject("SELECT COUNT(*)"+agreements,Long.class,dueArgs);var late=new ArrayList<>(Arrays.asList(dueArgs));late.add(java.sql.Date.valueOf(now.atZone(zone).toLocalDate()));
        return new Metrics(values[0],values[1],values[2],values[3],values[4],values[5],open,db.queryForObject("SELECT COUNT(*)"+agreements+" AND a.due_date<?",Long.class,late.toArray()),now,zone.getId());
    }
    public long insert(String sql,Object...args){var key=new GeneratedKeyHolder();db.update(c->{var s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return Objects.requireNonNull(key.getKey()).longValue();}
    public JdbcTemplate jdbc(){return db;}
}
