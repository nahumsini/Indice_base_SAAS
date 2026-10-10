package com.indice.erp.maintenance;

import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.maintenance.MaintenanceDtos.*;

public final class MaintenancePolicy {
    private MaintenancePolicy() {}
    public static final Set<String> PRIORITIES=Set.of("LOW","NORMAL","HIGH","CRITICAL");
    public static final Set<String> TERMINAL=Set.of("CLOSED","CANCELLED");
    public static final Set<String> STATUSES=Set.of("OPEN","ASSIGNED","IN_PROGRESS","WAITING_PARTS","WAITING_VENDOR","PENDING_VALIDATION","CLOSED","CANCELLED");
    public static void require(boolean valid,String code){if(!valid)throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,code);}
    public static void version(long actual,Long expected){if(expected==null||actual!=expected)throw new ResponseStatusException(HttpStatus.CONFLICT,"maintenance_version_conflict");}
    public static void currency(String currency){try{Currency.getInstance(currency);}catch(Exception invalid){require(false,"maintenance_currency_invalid");}}
    public static BigDecimal money(BigDecimal amount){require(amount!=null&&amount.signum()>=0&&amount.precision()<=19,"maintenance_amount_invalid");return amount.setScale(4,RoundingMode.HALF_UP);}
    public static void priority(String priority){require(PRIORITIES.contains(priority),"maintenance_priority_invalid");}
    public static void date(Instant value){require(value!=null&&!value.isBefore(Instant.parse("2000-01-01T00:00:00Z"))&&value.isBefore(Instant.parse("2100-01-01T00:00:00Z")),"maintenance_date_invalid");}
    public static LocalDate cycle(LocalDate anchor,String frequency,int interval,int cycle){
        require(interval>0&&interval<=365&&cycle>=0,"maintenance_recurrence_invalid");
        long count=Math.multiplyExact((long)interval,cycle);
        return switch(frequency){case "DAILY"->anchor.plusDays(count);case "WEEKLY"->anchor.plusWeeks(count);case "MONTHLY"->anchor.plusMonths(count);default->throw new IllegalArgumentException("maintenance_recurrence_invalid");};
    }
    public static void transition(Order order,String target,boolean manager,String reason,int evidence){
        require(STATUSES.contains(target),"maintenance_status_invalid");
        boolean allowed=switch(order.status()){
            case "OPEN"->target.equals("CANCELLED");
            case "ASSIGNED"->Set.of("IN_PROGRESS","CANCELLED").contains(target);
            case "IN_PROGRESS"->Set.of("WAITING_PARTS","WAITING_VENDOR","PENDING_VALIDATION","CANCELLED").contains(target);
            case "WAITING_PARTS","WAITING_VENDOR"->Set.of("IN_PROGRESS","CANCELLED").contains(target);
            case "PENDING_VALIDATION"->Set.of("IN_PROGRESS","CLOSED","CANCELLED").contains(target);
            case "CLOSED","CANCELLED"->target.equals("OPEN");default->false;
        };
        require(allowed,"maintenance_transition_invalid");
        if(Set.of("CLOSED","CANCELLED","OPEN").contains(target))require(manager,"maintenance_manager_required");
        if(Set.of("CANCELLED","OPEN","WAITING_PARTS","WAITING_VENDOR").contains(target)||order.status().equals("PENDING_VALIDATION")&&target.equals("IN_PROGRESS"))require(reason!=null&&!reason.isBlank(),"maintenance_reason_required");
        if(Set.of("PENDING_VALIDATION","CLOSED").contains(target)){
            require(!order.diagnosis().isBlank()&&!order.resolution().isBlank(),"maintenance_resolution_required");
            require(order.checklist().stream().noneMatch(s->s.required()&&!s.done()),"maintenance_checklist_incomplete");
            require(!order.evidenceRequired()||evidence>0,"maintenance_evidence_required");
        }
    }
}
