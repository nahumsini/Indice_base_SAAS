package com.indice.erp.scheduling;

import com.indice.erp.consulting.ConsultingBusyWindowService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Internal shared-resource boundary. Email comes from a validated member or authorized consultant. */
@Service
public class SchedulingResourceAvailabilityService {
    private final JdbcTemplate db;
    private final ConsultingBusyWindowService consulting;
    public SchedulingResourceAvailabilityService(JdbcTemplate db,ConsultingBusyWindowService consulting){
        this.db=db;this.consulting=consulting;
    }
    public void lock(String email) {
        if(!TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Resource locking requires a transaction.");
        String hash=resourceHash(email);
        db.update("INSERT IGNORE INTO scheduling_resource_mutex(resource_hash) VALUES(?)",hash);
        db.queryForObject("SELECT resource_hash FROM scheduling_resource_mutex WHERE resource_hash=? FOR UPDATE",
            String.class,hash);
    }
    private static String resourceHash(String email) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                email.trim().toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.UTF_8)));
        } catch(NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("Resource hashing unavailable.",impossible);
        }
    }
    public boolean busy(String email,Instant from,Instant to,Long excludedReservation,Long excludedEvent,
        Long excludedConsulting) {
        // Locking reads observe current committed rows even when an Engine caller opened
        // a REPEATABLE_READ transaction before obtaining the consultant mutex.
        String currentRead=TransactionSynchronizationManager.isActualTransactionActive()?" FOR UPDATE":"";
        var reservations=db.query("""
            SELECT r.id FROM scheduling_reservations r
            JOIN scheduling_staff s ON s.company_id=r.company_id AND s.id=r.staff_id
            JOIN users u ON u.id=s.user_id
            WHERE LOWER(u.email)=? AND r.event_id IS NULL AND r.status='CONFIRMED'
              AND (? IS NULL OR r.id<>?) AND r.start_at<?
              AND DATE_ADD(r.start_at,INTERVAL (r.duration_minutes+r.buffer_minutes) MINUTE)>?
            """+currentRead,(r,n)->r.getLong(1),email.toLowerCase(java.util.Locale.ROOT),excludedReservation,excludedReservation,
            Timestamp.from(to),Timestamp.from(from));
        var events=db.query("""
            SELECT e.id FROM scheduling_events e
            JOIN scheduling_staff s ON s.company_id=e.company_id AND s.id=e.staff_id
            JOIN users u ON u.id=s.user_id
            WHERE LOWER(u.email)=? AND e.status='ACTIVE' AND (? IS NULL OR e.id<>?)
              AND e.start_at<? AND DATE_ADD(e.start_at,INTERVAL e.duration_minutes MINUTE)>?
            """+currentRead,(r,n)->r.getLong(1),email.toLowerCase(java.util.Locale.ROOT),excludedEvent,excludedEvent,
            Timestamp.from(to),Timestamp.from(from));
        return !reservations.isEmpty()||!events.isEmpty()
            ||consulting.busy(email,from,to,excludedConsulting);
    }
    public void requireFree(String email,Instant from,int minutes,Long reservation,Long event,Long consultingId){
        lock(email);
        if(busy(email,from,from.plusSeconds(minutes*60L),reservation,event,consultingId))
            throw new IllegalStateException("Resource is no longer available.");
    }
}
