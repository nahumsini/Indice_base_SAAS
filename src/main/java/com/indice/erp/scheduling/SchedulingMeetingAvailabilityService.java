package com.indice.erp.scheduling;

import java.time.*;
import java.util.*;
import java.util.function.BiPredicate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Scheduling-owned boolean projection; never exposes appointments or clients. */
@Service
public class SchedulingMeetingAvailabilityService {
    private final JdbcTemplate db;
    public SchedulingMeetingAvailabilityService(JdbcTemplate db){this.db=db;}
    public BiPredicate<Instant,Instant> checker(long company,Collection<Long> users) {
        // Each request gets an immutable snapshot, not a cross-tenant or cross-request cache.
        var staff=new ArrayList<Staff>();
        for(long user:users) staff.addAll(db.query("SELECT id,timezone,buffer_minutes FROM scheduling_staff WHERE company_id=? AND user_id=? AND active=1",
            (r,n)->{
                long id=r.getLong(1);
                var days=db.query("SELECT day_of_week,start_time,end_time FROM scheduling_availability WHERE company_id=? AND staff_id=?",
                    (d,i)->new Hours(d.getInt(1),d.getTime(2).toLocalTime(),d.getTime(3).toLocalTime()),company,id);
                var unavailable=db.query("SELECT unavailable_date FROM scheduling_unavailable_dates WHERE company_id=? AND staff_id=?",
                    (d,i)->d.getDate(1).toLocalDate(),company,id);
                return new Staff(ZoneId.of(r.getString(2)),r.getInt(3),days,Set.copyOf(unavailable));
            },company,user));
        return (from,to)->staff.stream().allMatch(s->{
            var start=from.atZone(s.zone());var end=to.plusSeconds(s.buffer()*60L).atZone(s.zone());
            return start.toLocalDate().equals(end.toLocalDate())&&!s.unavailable().contains(start.toLocalDate())
                &&s.hours().stream().anyMatch(h->h.day()==start.getDayOfWeek().getValue()
                    &&!start.toLocalTime().isBefore(h.from())&&!end.toLocalTime().isAfter(h.to()));
        });
    }
    private record Hours(int day,LocalTime from,LocalTime to) { }
    private record Staff(ZoneId zone,int buffer,List<Hours> hours,Set<LocalDate> unavailable) { }
}
