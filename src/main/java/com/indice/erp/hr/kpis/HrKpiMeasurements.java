package com.indice.erp.hr.kpis;
import static com.indice.erp.hr.kpis.HrKpiContracts.*;
import java.util.List;
/** Version 1 mirrors the approved RH KPI measurements used by the active UI. */
public final class HrKpiMeasurements {
    private HrKpiMeasurements(){ }
    public record AttendanceSignal(String status,boolean hasRule,boolean restRule){ }
    public record RecordSignal(String status,String severity){ }
    public record AssetSignal(String status,Long responsibleUserCompanyId){ }
    public static Attendance attendance(List<AttendanceSignal> signals){
        int scheduled=0,onTime=0,late=0,absence=0,pending=0,rest=0,leave=0,unconfigured=0;
        for(var s:signals){
            if(s.status().equals("rest")||s.restRule()){rest++;continue;}
            if(s.status().equals("leave")){leave++;continue;}
            if(!s.hasRule()||s.status().equals("not_scheduled")){unconfigured++;continue;}
            scheduled++;switch(s.status()){case "on_time"->onTime++;case "late"->late++;case "absence"->absence++;case "pending"->pending++;default->{ }}
        }
        int present=onTime+late,sample=present+absence;
        return new Attendance(scheduled,onTime,late,absence,pending,rest,leave,unconfigured,present,sample,percent(present,sample),percent(onTime,present));
    }
    public static Records records(List<RecordSignal> signals){
        int open=0,critical=0,pending=0,reviewed=0,resolved=0;
        for(var s:signals){if(!s.status().equals("resolved")){open++;if(s.severity().equals("high"))critical++;}switch(s.status()){case "pending"->pending++;case "reviewed"->reviewed++;case "resolved"->resolved++;default->{ }}}
        return new Records(signals.size(),open,critical,pending,reviewed,resolved);
    }
    public static Assets assets(List<AssetSignal> signals,java.util.Set<Long> visiblePeople){
        int assigned=0,available=0,maintenance=0,inactive=0;var people=new java.util.HashSet<Long>();
        for(var s:signals){switch(s.status()){case "assigned","custody"->{assigned++;if(s.responsibleUserCompanyId()!=null&&visiblePeople.contains(s.responsibleUserCompanyId()))people.add(s.responsibleUserCompanyId());}case "available"->available++;case "maintenance"->maintenance++;case "inactive"->inactive++;default->{ }}}
        return new Assets(signals.size(),assigned,people.size(),available,maintenance,inactive);
    }
    private static Integer percent(int numerator,int denominator){return denominator==0?null:Math.max(0,Math.min(100,(int)Math.round(100.0*numerator/denominator)));}
}
