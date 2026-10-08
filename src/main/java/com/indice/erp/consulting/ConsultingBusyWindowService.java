package com.indice.erp.consulting;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Internal owner contract: reveals only resource occupancy, never appointment/tenant data. */
@Service
public class ConsultingBusyWindowService {
    private final JdbcTemplate db;
    public ConsultingBusyWindowService(JdbcTemplate db){this.db=db;}
    public boolean busy(String verifiedEmail,Instant from,Instant to,Long excludedAppointment) {
        var records=db.query("""
            SELECT id FROM consulting_appointments
            WHERE LOWER(consultant_email)=? AND status='CONFIRMED'
             AND (? IS NULL OR id<>?) AND COALESCE(confirmed_start_at,preferred_start_at)<?
             AND DATE_ADD(COALESCE(confirmed_start_at,preferred_start_at),INTERVAL duration_minutes MINUTE)>?
            """+(TransactionSynchronizationManager.isActualTransactionActive()?" FOR UPDATE":""),
            (r,n)->r.getLong(1),verifiedEmail.toLowerCase(java.util.Locale.ROOT),excludedAppointment,
            excludedAppointment,Timestamp.from(to),Timestamp.from(from));
        return !records.isEmpty();
    }
}
