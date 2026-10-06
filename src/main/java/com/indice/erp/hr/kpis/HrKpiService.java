package com.indice.erp.hr.kpis;
import static com.indice.erp.hr.kpis.HrKpiContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.assistant.*;
import com.indice.erp.hr.assistant.HrAssistantContracts.PageRequest;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.*;
import org.springframework.stereotype.Service;

/** Complete authorized sources and the approved UI definitions, without private source rows. */
@Service
public class HrKpiService {
    private final HrUserService people;private final HrAttendanceService attendance;private final HrAssistantService assets;
    private final HrAssistantRecordsService records;private final HrAssistantPermissionsService permissions;
    public HrKpiService(HrUserService people,HrAttendanceService attendance,HrAssistantService assets,HrAssistantRecordsService records,HrAssistantPermissionsService permissions){this.people=people;this.attendance=attendance;this.assets=assets;this.records=records;this.permissions=permissions;}
    public Result measure(AuthSessionUser user,Request request,Availability access){
        validate(request);var sources=new ArrayList<Source>();
        for(var entry:List.of(new Source("people",access.people(),access.people()?"available":"current_source_permission_required"),new Source("attendance",access.attendance()&&access.people(),""),new Source("assets",access.assets()&&access.people(),""),new Source("records",access.records()&&access.people(),""),new Source("permissions",access.permissions()&&access.people(),"")))sources.add(new Source(entry.name(),entry.available(),entry.available()?"available":access.people()?"current_source_permission_required":"employee_cohort_unavailable"));
        if(!access.people())return new Result(1,request.date(),request.from(),request.to(),request.date().minusDays(1),null,null,null,null,null,null,List.copyOf(sources));
        var employees=maps(people.listUsers(user).get("rows")).stream().filter(row->employeeMatches(row,request)).toList();
        var employeeIds=new HashSet<Long>();employees.forEach(row->employeeIds.add(number(row,"id")));
        int active=0,inactive=0,terminated=0;
        for(var row:employees)switch(text(row,"status")){case "active","activo"->active++;case "inactive","inactivo"->inactive++;case "terminated"->terminated++;default->{ }}
        var workforce=new Workforce(employees.size(),active,inactive,terminated);
        var measured=access.attendance()?attendance(user,request.date(),request,employeeIds):null;
        var previous=access.attendance()?attendance(user,request.date().minusDays(1),request,employeeIds):null;
        Assets measuredAssets=null;
        if(access.assets()){
            var items=complete(page->assets.assets(user,new PageRequest(null,null,null,null,page,100)),HrAssistantContracts.AssetView::id);
            var signals=items.stream().filter(a->contains(request.query(),a.assetCode(),a.assetType(),a.name(),a.model(),a.serialNumber(),a.responsibleName(),a.unitName()))
                .filter(a->a.responsibleUserCompanyId()!=null?employeeIds.contains(a.responsibleUserCompanyId()):request.businessId()==null&&request.department()==null&&(request.unitId()==null||request.unitId().equals(a.unitId())))
                .map(a->new HrKpiMeasurements.AssetSignal(a.status(),a.responsibleUserCompanyId())).toList();
            measuredAssets=HrKpiMeasurements.assets(signals,employeeIds);
        }
        Records measuredRecords=null;
        if(access.records()){
            var items=complete(page->records.list(user,new PageRequest(request.query(),null,null,null,page,100)),HrAssistantContracts.RecordView::id);
            var signals=items.stream().filter(r->employeeIds.contains(r.userCompanyId())&&inPeriod(r.eventDate(),request))
                .map(r->new HrKpiMeasurements.RecordSignal(r.status(),r.severity())).toList();measuredRecords=HrKpiMeasurements.records(signals);
        }
        Permissions measuredPermissions=null;
        if(access.permissions()){
            var items=complete(page->permissions.list(user,"list_hr_permissions",new PageRequest(request.query(),null,null,null,page,100)),HrAssistantContracts.PermissionView::id);
            var selected=items.stream().filter(p->employeeIds.contains(p.userCompanyId())&&overlaps(p.startDate(),p.endDate(),request)).toList();
            measuredPermissions=new Permissions(selected.size(),(int)selected.stream().filter(p->p.status().equals("pending")).count(),(int)selected.stream().filter(p->p.status().equals("approved")).count(),(int)selected.stream().filter(p->p.status().equals("rejected")).count());
        }
        return new Result(1,request.date(),request.from(),request.to(),request.date().minusDays(1),workforce,measured,previous,measuredAssets,measuredRecords,measuredPermissions,List.copyOf(sources));
    }
    private Attendance attendance(AuthSessionUser user,LocalDate date,Request r,Set<Long> ids){
        var signals=attendance.assistantKpiSignals(user,date).stream()
            .filter(a->ids.contains(a.userCompanyId())&&contains(r.query(),a.name(),a.code(),a.position(),a.department(),a.unitName(),a.businessName()))
            .filter(a->r.unitId()==null||r.unitId().equals(a.unitId())).filter(a->r.businessId()==null||r.businessId().equals(a.businessId()))
            .filter(a->r.department()==null||r.department().equals(a.department())).filter(a->r.attendanceStatus()==null||r.attendanceStatus().equals(a.status()))
            .map(a->new HrKpiMeasurements.AttendanceSignal(a.status(),a.hasRule(),a.restRule())).toList();
        return HrKpiMeasurements.attendance(signals);
    }
    private static boolean employeeMatches(Map<String,Object> row,Request r){return (r.unitId()==null||r.unitId().equals(number(row,"unit_id")))&&(r.businessId()==null||r.businessId().equals(number(row,"business_id")))&&(r.department()==null||r.department().equals(text(row,"department")))&&contains(r.query(),text(row,"full_name"),text(row,"user_code"),text(row,"email"),text(row,"position_title"),text(row,"position"),text(row,"department"),text(row,"unit_name"),text(row,"business_name"));}
    private static <T> List<T> complete(IntFunction<HrAssistantContracts.Page<T>> fetch,Function<T,Long> key){
        var all=new LinkedHashMap<Long,T>();long total=-1;
        for(int page=1;;page++){
            var result=fetch.apply(page);if(total<0)total=result.totalCount();else if(total!=result.totalCount())throw new IllegalStateException("HR KPI cohort changed during loading. Repeat the query.");
            int before=all.size();result.items().forEach(item->all.put(key.apply(item),item));
            if(!result.hasMore()){if(all.size()!=total)throw new IllegalStateException("HR KPI source is incomplete.");return List.copyOf(all.values());}
            if(before==all.size()||result.nextPage()==null||result.nextPage()!=page+1)throw new IllegalStateException("HR KPI source repeated or omitted a page.");
        }
    }
    private static boolean contains(String query,String... values){return query==null||String.join(" ",Arrays.stream(values).map(v->v==null?"":v).toList()).toLowerCase(Locale.ROOT).contains(query.trim().toLowerCase(Locale.ROOT));}
    private static boolean inPeriod(String date,Request r){if(date==null||date.length()<10)return false;var day=LocalDate.parse(date.substring(0,10));return !day.isBefore(r.from())&&!day.isAfter(r.to());}
    private static boolean overlaps(String start,String end,Request r){if(start==null||end==null||start.length()<10||end.length()<10)return false;return !LocalDate.parse(end.substring(0,10)).isBefore(r.from())&&!LocalDate.parse(start.substring(0,10)).isAfter(r.to());}
    private static void validate(Request r){
        if(r==null||r.date()==null||r.from()==null||r.to()==null||r.to().isBefore(r.from())||ChronoUnit.DAYS.between(r.from(),r.to())>365)throw new IllegalArgumentException("Explicit operational date and period up to 366 days required.");
        if(r.date().equals(LocalDate.MIN)||r.unitId()!=null&&r.unitId()<1||r.businessId()!=null&&r.businessId()<1||r.department()!=null&&r.department().length()>120||r.query()!=null&&r.query().length()>120)throw new IllegalArgumentException("Invalid KPI filters.");
        if(r.attendanceStatus()!=null&&!Set.of("on_time","late","absence","pending","rest","leave","not_scheduled").contains(r.attendanceStatus()))throw new IllegalArgumentException("Unsupported attendance status.");
    }
    @SuppressWarnings("unchecked") private static List<Map<String,Object>> maps(Object value){return (List<Map<String,Object>>)value;}
    private static String text(Map<String,Object> row,String key){return row.get(key)==null?"":row.get(key).toString();}
    private static Long number(Map<String,Object> row,String key){return row.get(key) instanceof Number n?n.longValue():null;}
}
