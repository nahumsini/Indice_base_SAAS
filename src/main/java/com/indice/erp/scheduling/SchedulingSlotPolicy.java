package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import java.time.*;
import java.util.*;

public final class SchedulingSlotPolicy {
    private SchedulingSlotPolicy() { }
    public static List<Instant> candidates(ServiceItem service,StaffItem staff,LocalDate date,Instant now) {
        var zone=ZoneId.of(staff.timezone());
        var today=now.atZone(zone).toLocalDate();
        if(date.isBefore(today)||date.isAfter(today.plusDays(90)))
            throw new IllegalArgumentException("Choose a date within 90 days.");
        if(staff.unavailableDates().contains(date)||!staff.serviceIds().isEmpty()&&!staff.serviceIds().contains(service.id()))return List.of();
        var result=new ArrayList<Instant>();
        for(var day:staff.days()) {
            if(day.dayOfWeek()!=date.getDayOfWeek().getValue())continue;
            var windowEnd=date.atTime(day.endTime());
            for(var local=date.atTime(day.startTime());!local.plusMinutes(service.durationMinutes()+Math.max(service.bufferMinutes(),staff.bufferMinutes()))
                .isAfter(windowEnd);local=local.plusMinutes(15)) {
                // Reject ambiguous/nonexistent DST wall times rather than silently shifting them.
                var offsets=zone.getRules().getValidOffsets(local);
                if(offsets.size()!=1)continue;
                var start=local.toInstant(offsets.getFirst());
                var finish=start.plusSeconds((service.durationMinutes()+Math.max(service.bufferMinutes(),staff.bufferMinutes()))*60L).atZone(zone).toLocalDateTime();
                if(!finish.equals(local.plusMinutes(service.durationMinutes()+Math.max(service.bufferMinutes(),staff.bufferMinutes()))))continue;
                if(!service.days().isEmpty()&&service.days().stream().noneMatch(window->window.dayOfWeek()==date.getDayOfWeek().getValue()&&!start.atZone(zone).toLocalTime().isBefore(window.startTime())&&!finish.toLocalTime().isAfter(window.endTime())))continue;
                if(!start.isBefore(now.plusSeconds(service.noticeHours()*3600L)))result.add(start);
                if(result.size()>=96)break;
            }
        }
        return List.copyOf(result);
    }
    public static void transition(String from,String to,Instant start,Instant now,String reason) {
        if(from.equals(to))return;
        var allowed=switch(from){
            case "REQUESTED"->Set.of("CONFIRMED","CANCELLED");
            case "CONFIRMED"->Set.of("COMPLETED","NO_SHOW","CANCELLED");
            case "PAUSED"->Set.of("CANCELLED");
            default->Set.<String>of();
        };
        if(!allowed.contains(to))throw new IllegalArgumentException("Invalid reservation transition.");
        if(Set.of("COMPLETED","NO_SHOW").contains(to)&&start.isAfter(now))
            throw new IllegalArgumentException("Attendance cannot be recorded before the session.");
        if("CANCELLED".equals(to)&&(reason==null||reason.isBlank()))
            throw new IllegalArgumentException("Cancellation reason required.");
    }
}
