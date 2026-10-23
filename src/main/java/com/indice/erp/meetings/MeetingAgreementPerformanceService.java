package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import java.time.*;
import java.math.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Meeting-owned deadline evidence. Task status never substitutes confirmed fulfilment. */
@Service
public class MeetingAgreementPerformanceService {
    private final MeetingRepository repository;
    private final Clock clock;
    public MeetingAgreementPerformanceService(MeetingRepository repository,Clock clock){this.repository=repository;this.clock=clock;}
    static String outcome(String status,LocalDate original,String basis,Instant fulfilled,ZoneId zone,LocalDate today){
        if("CANCELLED".equals(status))return "CANCELLED";
        if(!"CREATED".equals(basis)||original==null||("DONE".equals(status)&&fulfilled==null))return "UNRATED";
        if("DONE".equals(status))return fulfilled.atZone(zone).toLocalDate().isAfter(original)?"LATE":"ON_TIME";
        return original.isBefore(today)?"OVERDUE":"UPCOMING";
    }
    @Transactional(readOnly=true)
    public AgreementEvidence evidence(AuthSessionUser actor,long id){
        var agreement=repository.agreement(actor,id,false);
        // An authorized former participant can still inspect their own agreement's evidence.
        var zone=ZoneId.of(repository.jdbc().queryForObject("SELECT timezone FROM meeting_records WHERE company_id=? AND id=?",String.class,actor.companyId(),agreement.meetingId()));
        var saved=repository.jdbc().query("SELECT original_due_date,deadline_basis,fulfilled_at FROM meeting_agreements WHERE company_id=? AND id=?",
            (r,n)->new Object[]{r.getDate(1)==null?null:r.getDate(1).toLocalDate(),r.getString(2),r.getTimestamp(3)==null?null:r.getTimestamp(3).toInstant()},actor.companyId(),id).getFirst();
        var original=(LocalDate)saved[0];var basis=(String)saved[1];var fulfilled=(Instant)saved[2];
        var revisions=repository.jdbc().query("SELECT actor.full_name,previous.full_name,new_assignee.full_name,r.previous_due_date,r.due_date,r.reason,r.occurred_at FROM meeting_agreement_revisions r JOIN users actor ON actor.id=r.actor_id JOIN users previous ON previous.id=r.previous_assignee_id JOIN users new_assignee ON new_assignee.id=r.assignee_id WHERE r.company_id=? AND r.agreement_id=? ORDER BY r.id DESC LIMIT 100",
            (r,n)->new AgreementRevision(r.getString(1),r.getString(2),r.getString(3),r.getDate(4).toLocalDate(),r.getDate(5).toLocalDate(),r.getString(6),r.getTimestamp(7).toInstant()),actor.companyId(),id);
        return new AgreementEvidence(original,basis,fulfilled,
            outcome(agreement.status(),original,basis,fulfilled,zone,LocalDate.now(clock.withZone(zone))),revisions);
    }
    @Transactional(readOnly=true)
    public AgreementPerformance performance(AuthSessionUser actor,long meetingId){
        var meeting=repository.meeting(actor,meetingId,false);var zone=ZoneId.of(meeting.timezone());
        var now=clock.instant();var today=now.atZone(zone).toLocalDate();long[] counts=new long[8];
        repository.jdbc().query("SELECT a.status,a.original_due_date,a.deadline_basis,a.fulfilled_at FROM meeting_agreements a WHERE a.company_id=? AND a.meeting_id=?",r->{
            counts[0]++;var original=r.getDate(2)==null?null:r.getDate(2).toLocalDate();var stamp=r.getTimestamp(4);
            var result=outcome(r.getString(1),original,r.getString(3),stamp==null?null:stamp.toInstant(),zone,today);
            if(result.equals("CANCELLED")){counts[6]++;return;}
            if(result.equals("UNRATED")){counts[7]++;return;}
            if(!original.isBefore(today)){counts[5]++;return;}
            counts[1]++;
            counts[switch(result){case "ON_TIME"->2;case "LATE"->3;default->4;}]++;
        },actor.companyId(),meetingId);
        Integer percent=counts[1]==0?null:BigDecimal.valueOf(counts[2]).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(counts[1]),0,RoundingMode.HALF_UP).intValueExact();
        return new AgreementPerformance(counts[0],counts[1],counts[2],counts[3],counts[4],counts[5],counts[6],counts[7],percent,now,zone.getId());
    }
}
