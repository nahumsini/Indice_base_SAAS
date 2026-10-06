package com.indice.erp.hr.assistant;
import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.payroll.HrPayrollService;
import com.indice.erp.hr.payroll.HrPayrollAssistantContracts;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAssistantPayrollService {
    public static final Set<String> READS=Set.of("list_hr_payroll_runs","get_hr_payroll_run");
    public static final Set<String> ACTIONS=Set.of("prepare_hr_payroll","adjust_hr_payroll_line","recalculate_hr_payroll","approve_hr_payroll","register_hr_payroll_paid","cancel_hr_payroll");
    private final HrPayrollService payroll;private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public HrAssistantPayrollService(HrPayrollService payroll,JdbcTemplate jdbc,ObjectMapper mapper){this.payroll=payroll;this.jdbc=jdbc;this.mapper=mapper.copy().disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);}
    public Page<HrPayrollAssistantContracts.Run> list(AuthSessionUser user,PageRequest request){
        var window=HrAssistantPages.window(user,"list_hr_payroll_runs",request);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Payroll visibility is resolved by its owner; filter by grouping label and status.");
        var items=payroll.assistantRuns(user).stream().filter(r->request==null||request.query()==null||r.groupingLabel().toLowerCase(Locale.ROOT).contains(request.query().toLowerCase(Locale.ROOT)))
            .filter(r->request==null||request.status()==null||r.status().equals(request.status())).toList();
        int from=(int)Math.min((long)(window.page()-1)*window.size(),items.size());return window.result(items.subList(from,Math.min(from+window.size(),items.size())),items.size());
    }
    public HrPayrollAssistantContracts.Run detail(AuthSessionUser user,long id){if(id<1)throw new IllegalArgumentException("Payroll ID required.");return payroll.assistantRun(user,id);}
    public Prepared prepare(AuthSessionUser user,String action,Change request,HrAssistantService versions){
        requireFields(request);
        var preparation=payroll.prepareAssistantPayroll(user,action,request.id(),request.payroll());
        var change=new Change(request.id(),null,null,null,null,null,null,null,null,null,null,preparation.change());
        var before=result(preparation.before());var after=result(preparation.after());
        var combined=new HrPayrollAssistantContracts.Result(java.util.stream.Stream.concat(preparation.before().runs().stream(),preparation.after().runs().stream()).toList());
        return new Prepared(action,change,versions.version(result(combined)),before,after);
    }
    public Result execute(AuthSessionUser user,Prepared confirmed,HrAssistantService versions){
        jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",user.companyId());
        if(confirmed.change().id()!=null)jdbc.queryForList("SELECT id FROM payroll_runs WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),confirmed.change().id());
        var people=new TreeSet<Long>();confirmed.after().payroll().runs().forEach(r->r.lines().forEach(l->people.add(l.userCompanyId())));
        for(var member:people)jdbc.queryForList("SELECT id FROM user_companies WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),member);
        var fresh=prepare(user,confirmed.action(),confirmed.change(),versions);
        if(!fresh.expectedVersion().equals(confirmed.expectedVersion())||!mapper.valueToTree(fresh.change()).equals(mapper.valueToTree(confirmed.change())))throw new HrAssistantService.Changed();
        var id=confirmed.change().id();var c=confirmed.change().payroll();
        var runIds=new ArrayList<Long>();
        switch(confirmed.action()){
            case "prepare_hr_payroll"->{
                var payload=new LinkedHashMap<String,Object>();payload.put("pay_period",c.payPeriod());payload.put("period_start_date",c.periodStartDate().toString());payload.put("period_end_date",c.periodEndDate().toString());payload.put("grouping_mode",c.groupingMode());
                var saved=payroll.createRuns(user,payload);
                for(var row:(List<Map<String,Object>>)saved.get("items"))runIds.add(((Number)row.get("id")).longValue());
            }
            case "adjust_hr_payroll_line"->{
                var payload=new LinkedHashMap<String,Object>();payload.put("payroll_treatment",c.payrollTreatment());payload.put("notes",c.notes());payload.put("manual_items",mapper.convertValue(c.manualItems(),new TypeReference<List<Map<String,Object>>>(){}));
                payroll.updateAssistantRunLine(user,id,c.lineId(),payload);runIds.add(id);
            }
            case "recalculate_hr_payroll"->{payroll.processRun(user,id);runIds.add(id);}
            case "approve_hr_payroll"->{payroll.approveRun(user,id);runIds.add(id);}
            case "register_hr_payroll_paid"->{payroll.markRunPaid(user,id);runIds.add(id);}
            case "cancel_hr_payroll"->{payroll.cancelRun(user,id);runIds.add(id);}
            default->throw new IllegalArgumentException("Unsupported payroll action.");
        }
        var saved=new HrPayrollAssistantContracts.Result(runIds.stream().map(run->payroll.assistantRun(user,run)).toList());
        // Owner calculations are checked again after mutation. A changed financial outcome rolls
        // back confirmation, run/line writes, incentives, payables and delegated audit together.
        if(!financialShape(mapper.valueToTree(saved)).equals(financialShape(mapper.valueToTree(fresh.after().payroll()))))throw new HrAssistantService.Changed();
        return result(saved);
    }
    public void requireResultAccess(AuthSessionUser user,HrPayrollAssistantContracts.Result result){if(result!=null)for(var run:result.runs())detail(user,run.id());}
    private Result result(HrPayrollAssistantContracts.Result payroll){return new Result(List.of(),null,null,null,null,false,null,null,payroll);}
    private static JsonNode financialShape(JsonNode node){
        if(node.isObject()){
            var object=(ObjectNode)node;object.remove(List.of("id","reused"));
            object.fields().forEachRemaining(e->{if(e.getValue().isTextual()&&e.getValue().textValue().isBlank())object.put(e.getKey(),"");else if(e.getValue().isNull()&&e.getKey().endsWith("Name")||e.getKey().equals("notes")&&e.getValue().isNull())object.put(e.getKey(),"");else financialShape(e.getValue());});
        }else if(node.isArray()){
            node.forEach(HrAssistantPayrollService::financialShape);
            // Stable item ordering is different between stored manual rows and engine output.
            var items=new ArrayList<JsonNode>();node.forEach(items::add);items.sort(Comparator.comparing(JsonNode::toString));
            ((com.fasterxml.jackson.databind.node.ArrayNode)node).removeAll().addAll(items);
        }
        return node;
    }
    private static void requireFields(Change c){if(c==null||c.employee()!=null||c.employees()!=null||c.asset()!=null||c.announcement()!=null||c.termination()!=null||c.assignment()!=null||c.record()!=null||c.permission()!=null||c.incentive()!=null||c.attendance()!=null)throw new IllegalArgumentException("Only payroll fields are accepted by this action.");}
}
