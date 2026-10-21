package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetingOperationalService {
    private final MeetingRepository repository;
    private final MeetingService meetings;
    public MeetingOperationalService(MeetingRepository repository,MeetingService meetings){this.repository=repository;this.meetings=meetings;}

    @Transactional(readOnly=true)
    public Attendance attendance(AuthSessionUser actor,long id) {
        var row=repository.meeting(actor,id,false);
        var people=new ArrayList<>(repository.participants(actor.companyId(),id));
        if(people.stream().noneMatch(p->p.id()==row.ownerId()))people.add(new Member(row.ownerId(),row.ownerName()));
        var marked=new HashMap<Long,String>();
        repository.jdbc().query("SELECT user_id,attendance_status FROM meeting_attendance WHERE company_id=? AND meeting_id=?",
            r->{marked.put(r.getLong(1),r.getString(2));},actor.companyId(),id);
        return new Attendance(people.stream().map(p->new AttendancePerson(p.id(),p.name(),marked.getOrDefault(p.id(),"UNMARKED"))).toList(),row.version());
    }
    @Transactional
    public Attendance attendance(AuthSessionUser actor,long id,AttendanceRequest body) {
        meetings.lock(actor);var row=repository.meeting(actor,id,true);
        if(!MeetingAccessService.administrator(actor)&&row.ownerId()!=actor.userId()
            &&repository.planning(actor.companyId(),id).minutesOwner().id()!=actor.userId())throw new SecurityException();
        MeetingService.version(row.version(),body.expectedVersion());
        if(!row.status().equals("IN_PROGRESS"))throw new IllegalStateException();
        var allowed=new HashSet<Long>();attendance(actor,id).people().forEach(p->allowed.add(p.userId()));
        var ids=new HashSet<Long>();
        if(body.entries()==null||body.entries().size()>101)throw new IllegalArgumentException();
        for(var entry:body.entries())if(entry==null||!ids.add(entry.userId())||!allowed.contains(entry.userId())
            ||!Set.of("PRESENT","ABSENT","UNMARKED").contains(entry.status()))throw new IllegalArgumentException();
        // Partial, versioned changes preserve all other attendance marks and membership/access.
        for(var entry:body.entries()) {
            if(entry.status().equals("UNMARKED"))repository.jdbc().update("DELETE FROM meeting_attendance WHERE company_id=? AND meeting_id=? AND user_id=?",actor.companyId(),id,entry.userId());
            else repository.jdbc().update("INSERT INTO meeting_attendance(company_id,meeting_id,user_id,attendance_status,recorded_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE attendance_status=VALUES(attendance_status),recorded_by=VALUES(recorded_by),recorded_at=UTC_TIMESTAMP(6)",actor.companyId(),id,entry.userId(),entry.status(),actor.userId());
        }
        repository.jdbc().update("UPDATE meeting_records SET version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);
        meetings.audit(actor,id,null,"ATTENDANCE_UPDATED","");
        return attendance(actor,id);
    }
    @Transactional(readOnly=true)
    public Availability availability(AuthSessionUser actor,AvailabilityRequest request) {
        var body=request.meeting();meetings.validate(actor,body);
        long exclude=request.excludeMeetingId()==null?0:request.excludeMeetingId();
        if(exclude<0)throw new IllegalArgumentException();
        if(exclude>0)MeetingService.owner(actor,repository.meeting(actor,exclude,false).ownerId());
        long duration=Duration.between(body.startAt(),body.endAt()).getSeconds();
        var appointments=meetings.appointmentAvailability(actor,body);
        boolean available=free(actor,body,body.startAt(),body.endAt(),exclude,appointments);
        var options=new ArrayList<TimeOption>();var zone=ZoneId.of(body.timezone());
        // Bounded search: seven local dates, quarter-hour starts between 08:00 and 18:00.
        var date=body.startAt().atZone(zone).toLocalDate();
        for(int day=0;day<7&&options.size()<8;day++)for(int minute=8*60;minute<18*60&&options.size()<8;minute+=15) {
            var local=date.plusDays(day).atStartOfDay().plusMinutes(minute);
            var offsets=zone.getRules().getValidOffsets(local);if(offsets.isEmpty())continue;
            var from=local.toInstant(offsets.getFirst());var to=from.plusSeconds(duration);
            if(from.isBefore(body.startAt())||from.isBefore(Instant.now())||to.atZone(zone).toLocalDateTime().isAfter(date.plusDays(day).atTime(18,0)))continue;
            if(free(actor,body,from,to,exclude,appointments))options.add(new TimeOption(from,to));
        }
        return new Availability(available,options,body.timezone());
    }
    private boolean free(AuthSessionUser actor,MeetingRequest body,Instant from,Instant to,long exclude,java.util.function.BiPredicate<Instant,Instant> appointments) {
        if(!appointments.test(from,to))return false;
        var people=new TreeSet<>(body.participantIds());people.add(body.ownerId());
        String ids=String.join(",",people.stream().map(String::valueOf).toList());
        return repository.jdbc().queryForObject("SELECT COUNT(*) FROM meeting_records m WHERE m.company_id=? AND m.id<>? AND m.status IN ('PLANNED','IN_PROGRESS') AND m.start_at<? AND m.end_at>? AND (m.owner_id IN ("+ids+") OR EXISTS(SELECT 1 FROM meeting_participants p WHERE p.company_id=m.company_id AND p.meeting_id=m.id AND p.user_id IN ("+ids+")))",Integer.class,actor.companyId(),exclude,Timestamp.from(to),Timestamp.from(from))==0;
    }
}
