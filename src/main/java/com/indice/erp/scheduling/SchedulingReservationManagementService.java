package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Versioned private commands. Pausing releases occupancy; archives retain business evidence. */
@Service
public class SchedulingReservationManagementService {
    private final SchedulingRepository repository;
    private final SchedulingBookingService booking;
    private final SchedulingResourceAvailabilityService resources;
    private final Clock clock;
    public SchedulingReservationManagementService(SchedulingRepository repository,SchedulingBookingService booking,
        SchedulingResourceAvailabilityService resources,Clock clock){
        this.repository=repository;this.booking=booking;this.resources=resources;this.clock=clock;
    }
    private ReservationItem current(AuthSessionUser actor,long id,long version,String reason){
        repository.lockCompany(actor.companyId());var record=repository.reservation(actor.companyId(),id);
        var staff=repository.staff(actor.companyId()).stream().filter(t->t.id()==record.staffId()).findFirst().orElseThrow();
        SchedulingBookingService.requireOwner(actor,staff);
        if(record.archivedAt()!=null||record.version()!=version)throw new IllegalStateException("Reservation changed; reload.");
        if(reason==null||reason.isBlank()||reason.length()>500)throw new IllegalArgumentException("Reason required.");
        return record;
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ReservationItem reassign(AuthSessionUser actor,long id,ReassignRequest request){
        SchedulingAccessService.requireAdministrator(actor);
        var record=current(actor,id,request.version(),request.reason());long company=actor.companyId();
        if(record.eventId()!=null||!List.of("REQUESTED","CONFIRMED","PAUSED").contains(record.status())
            ||!record.startAt().isAfter(clock.instant()))throw new IllegalStateException("Only future individual sessions can be reassigned.");
        var target=booking.staff(company,request.staffId());
        if(target.id()==record.staffId())return record;
        List.of(repository.staffIdentityEmail(company,record.staffId()),repository.memberEmail(company,target.userId()))
            .stream().sorted().forEach(resources::lock);
        // Validate the snapshotted duration/buffer and target availability for every reassignment,
        // not just confirmed sessions. No time, attendee or event authority comes from the client.
        booking.validateConfirmation(company,record,target);
        SchedulingConfigurationService.checked(repository.jdbc().update("""
            UPDATE scheduling_reservations SET staff_id=?,version=version+1 WHERE company_id=? AND id=? AND version=?
            """,target.id(),company,id,record.version()));
        audit(actor,record,"RESERVATION_REASSIGNED",request.reason(),target.id());
        return repository.reservation(company,id);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ReservationItem manage(AuthSessionUser actor,long id,ManageRequest request){
        var record=current(actor,id,request.version(),request.reason());long company=actor.companyId();
        String status=record.status(),paused=record.pausedFromStatus();
        switch(request.action()){
            case "PAUSE" -> {
                if(!List.of("REQUESTED","CONFIRMED").contains(status)||!record.startAt().isAfter(clock.instant()))
                    throw new IllegalStateException("Only future active reservations can be paused.");
                paused=status;status="PAUSED";
            }
            case "RESUME" -> {
                if(!status.equals("PAUSED")||!List.of("REQUESTED","CONFIRMED").contains(paused==null?"":paused))
                    throw new IllegalStateException("Reservation is not paused.");
                var staff=booking.staff(company,record.staffId());
                // Both requests and confirmed sessions must still fit current availability on resume.
                if(record.eventId()!=null){
                    var event=repository.event(company,record.eventId());
                    if(!event.status().equals("ACTIVE"))throw new IllegalStateException("Event unavailable.");
                }
                booking.validateConfirmation(company,record,staff);
                status=paused;paused=null;
            }
            case "ARCHIVE" -> {
                if(List.of("REQUESTED","CONFIRMED","PAUSED").contains(status))status="CANCELLED";
                paused=null;
            }
            default -> throw new IllegalArgumentException("Unknown reservation action.");
        }
        SchedulingConfigurationService.checked(repository.jdbc().update("""
            UPDATE scheduling_reservations SET status=?,paused_from_status=?,reason=?,archived_at=?,version=version+1
            WHERE company_id=? AND id=? AND version=?
            """,status,paused,request.reason().trim(),request.action().equals("ARCHIVE")?java.sql.Timestamp.from(clock.instant()):null,
            company,id,record.version()));
        audit(actor,record,"RESERVATION_"+request.action(),request.reason(),record.staffId());
        return repository.reservation(company,id);
    }
    private void audit(AuthSessionUser actor,ReservationItem record,String action,String reason,long nextStaff){
        repository.jdbc().update("""
            INSERT INTO scheduling_audit(company_id,actor_user_id,entity_type,entity_id,action,reason,previous_staff_id,next_staff_id)
            VALUES(?,?,'RESERVATION',?,?,?,?,?)
            """,actor.companyId(),actor.userId(),record.id(),action,reason.trim(),record.staffId(),nextStaff);
    }
}
