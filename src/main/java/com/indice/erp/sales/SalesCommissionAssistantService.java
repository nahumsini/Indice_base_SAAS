package com.indice.erp.sales;

import static com.indice.erp.sales.SalesCommissionAssistantContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.hr.incentives.HrIncentiveService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sales owns cuts; HR owns one-time payroll applications. No action records a payment. */
@Service
public class SalesCommissionAssistantService {
    public static final Set<String> READS=Set.of("list_sales_commission_cuts","get_sales_commission_cut","list_sales_commission_schedules","get_sales_commission_schedule");
    public static final Set<String> ACTIONS=Set.of("create_sales_commission_cut","create_sales_commission_schedule","update_sales_commission_schedule","set_sales_commission_schedule_status");
    private final SalesCommissionCutService cuts;private final BusinessExchangeRateService rates;private final KpiCurrencyAggregationService money;
    private final HrIncentiveService hr;private final HrOperationalScopeService scope;private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public SalesCommissionAssistantService(SalesCommissionCutService cuts,BusinessExchangeRateService rates,KpiCurrencyAggregationService money,HrIncentiveService hr,HrOperationalScopeService scope,JdbcTemplate jdbc,ObjectMapper mapper){this.cuts=cuts;this.rates=rates;this.money=money;this.hr=hr;this.scope=scope;this.jdbc=jdbc;this.mapper=mapper;}
    @Transactional(readOnly=true)
    public ReadResult read(AuthSessionUser user,String tool,Query q){
        requireCorporate(user);if(!READS.contains(tool))throw new IllegalArgumentException("Unknown commission read.");q=q==null?new Query(null,null,null,null):q;
        boolean schedule=tool.contains("schedule"),get=tool.startsWith("get_");if(get)positive(q.id());else if(q.id()!=null)throw new IllegalArgumentException("Use the commission detail tool for an ID.");
        final Query query=q;var all=schedule?new Records(List.of(),schedules(user)):new Records(cutList(user),List.of());
        var filtered=schedule?new Records(List.of(),all.schedules().stream().filter(v->(!get||v.id()==query.id())&&(query.status()==null||query.status().equals(v.status()))).toList()):new Records(all.cuts().stream().filter(v->(!get||v.id()==query.id())&&(query.status()==null||query.status().equals(v.status()))).toList(),List.of());
        int count=schedule?filtered.schedules().size():filtered.cuts().size();if(get&&count!=1)throw new NoSuchElementException("Commission object unavailable.");int limit=q.limit()==null?25:q.limit();if(limit<1||limit>50)throw new IllegalArgumentException("Invalid commission page size.");
        String binding=hash(List.of(user.companyId(),user.userCompanyId(),tool,q.status()==null?"":q.status(),filtered));int start=offset(q.cursor(),binding);if(start>count)throw new IllegalArgumentException("Commission cursor invalid.");int end=Math.min(count,start+limit);var page=schedule?new Records(List.of(),filtered.schedules().subList(start,end)):new Records(filtered.cuts().subList(start,end),List.of());
        return new ReadResult(page,count,end<count,end<count?cursor(end,binding):null,"CORPORATE_OFFICE");
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change change){return plan(user,action,change,false);}
    @Transactional
    public Result execute(AuthSessionUser user,Prepared saved){
        var current=plan(user,saved.action(),saved.change(),true);if(!canonical(current).equals(canonical(saved)))throw new IllegalStateException("Commission candidates, FX evidence or employees changed. Review again.");
        if(saved.action().equals("create_sales_commission_cut")){
            var cut=current.change().cut();var output=cuts.createReviewed(user,Map.of("periodStart",cut.periodStart().toString(),"periodEnd",cut.periodEnd().toString(),"preferredCurrency",cut.preferredCurrency()),current.rates());
            return new Result(saved.action(),new Records(List.of(mapper.convertValue(output,Cut.class)),List.of()));
        }
        var next=current.after().schedules().getFirst();var payload=new LinkedHashMap<String,Object>();if(current.change().id()!=null)payload.put("id",current.change().id());payload.put("name",next.name());payload.put("cadence",next.cadence());payload.put("preferredCurrency",next.preferredCurrency());payload.put("status",next.status());
        return new Result(saved.action(),new Records(List.of(),List.of(mapper.convertValue(cuts.saveSchedule(user,payload),Schedule.class))));
    }
    public void requireResultAccess(AuthSessionUser user,Result r){requireCorporate(user);r.records().cuts().forEach(v->findCut(user,v.id()));r.records().schedules().forEach(v->findSchedule(user,v.id()));}
    private Prepared plan(AuthSessionUser user,String action,Change c,boolean lock){
        requireCorporate(user);if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Invalid commission action.");boolean cut=action.equals("create_sales_commission_cut"),create=action.startsWith("create_"),status=action.startsWith("set_");
        if(create&&c.id()!=null)throw new IllegalArgumentException("New commission objects have no ID.");if(!create)positive(c.id());Set<String> allowed=cut?Set.of("cut"):status?Set.of("id","status","reason"):Set.of("id","schedule");mapper.valueToTree(c).fieldNames().forEachRemaining(k->{if(!allowed.contains(k))throw new IllegalArgumentException("Unexpected commission action field: "+k);});
        if(lock)jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,user.companyId());var versions=new TreeMap<String,String>();
        if(cut){
            var in=requiredInput(c.cut(),"Cut period required.");currency(in.preferredCurrency());if(in.periodStart()==null||in.periodEnd()==null||in.periodEnd().isBefore(in.periodStart())||in.periodEnd().isAfter(LocalDate.now())||in.periodStart().plusYears(2).isBefore(in.periodEnd()))throw new IllegalArgumentException("Review a closed commission period of at most two years.");
            var candidates=cuts.eligible(user.companyId(),in.periodStart(),in.periodEnd());if(candidates.isEmpty())throw new IllegalArgumentException("No eligible commissions in this period.");
            if(lock)for(var row:candidates)jdbc.queryForList("SELECT id FROM sales_records WHERE company_id=? AND id=? FOR UPDATE",Long.class,user.companyId(),row.saleId());
            candidates=cuts.eligible(user.companyId(),in.periodStart(),in.periodEnd());versions.put("candidates",hash(candidates));
            var fx=rates.cachedDailyRates().orElseThrow(()->new IllegalStateException("Refresh the current daily FX evidence before reviewing a cut."));if(fx.metadata()==null||fx.metadata().sourceDate()==null)throw new IllegalStateException("Dated FX evidence required.");
            var aggregate=money.aggregate(candidates.stream().map(v->new KpiMoneyAmount(v.amount(),v.currency())).toList(),in.preferredCurrency(),fx.ratesPerUsd(),"snapshot",LocalDate.parse(fx.metadata().sourceDate()),fx.metadata().sourceName());
            var groups=new TreeMap<String,List<SalesCommissionCutService.CommissionRow>>();candidates.forEach(v->groups.computeIfAbsent(v.userCompanyId()+"|"+v.currency(),k->new ArrayList<>()).add(v));var effects=new ArrayList<IncentiveEffect>();
            for(var group:groups.values()){
                var first=group.getFirst();scope.requireUserInScope(user,first.userCompanyId());if(lock){jdbc.queryForList("SELECT id FROM user_companies WHERE company_id=? AND id=? FOR UPDATE",Long.class,user.companyId(),first.userCompanyId());jdbc.queryForList("SELECT user_company_id FROM user_work_profiles WHERE company_id=? AND user_company_id=? FOR UPDATE",Long.class,user.companyId(),first.userCompanyId());}
                var amount=group.stream().map(SalesCommissionCutService.CommissionRow::amount).reduce(BigDecimal.ZERO,BigDecimal::add);var payload=new LinkedHashMap<String,Object>();payload.put("name","Commission cut preview");payload.put("amount",amount);payload.put("currency_code",first.currency());payload.put("incentive_type","manual");payload.put("effective_start_date",in.periodEnd().toString());payload.put("status","active");payload.put("scope_type","employees");payload.put("target_user_company_ids",List.of(first.userCompanyId()));payload.put("application_mode","next_payroll");payload.put("source_reference_type","sales_commission_cut");payload.put("source_reference_id","preview");
                var draft=hr.validateAssistantCreate(user,payload);effects.add(new IncentiveEffect(first.userCompanyId(),first.currency(),amount,group.stream().map(SalesCommissionCutService.CommissionRow::saleId).toList(),hr.assistantApplications(draft)));
            }
            return new Prepared(action,c,Records.empty(),Records.empty(),List.copyOf(effects),aggregate,fx,Map.copyOf(versions));
        }
        Schedule old=create?null:findSchedule(user,c.id());if(old!=null){if(lock)jdbc.queryForList("SELECT id FROM sales_commission_cut_schedules WHERE company_id=? AND id=? FOR UPDATE",Long.class,user.companyId(),old.id());versions.put("schedule",hash(old));}
        var in=status?new ScheduleInput(old.name(),old.cadence(),old.preferredCurrency(),c.status()):requiredInput(c.schedule(),"Schedule required.");
        if(in.name()==null||in.name().isBlank()||in.name().length()>120||!Set.of("weekly","semimonthly","monthly").contains(Objects.toString(in.cadence(),""))||!Set.of("active","paused").contains(in.status()))throw new IllegalArgumentException("Explicit schedule name, cadence and lifecycle required.");currency(in.preferredCurrency());if(status&&(c.reason()==null||c.reason().trim().length()<5||c.reason().length()>500))throw new IllegalArgumentException("A schedule state reason is required.");
        var population=schedules(user);if(population.stream().anyMatch(v->!Objects.equals(c.id(),v.id())&&v.name().equalsIgnoreCase(in.name().trim())))throw new IllegalArgumentException("Duplicate commission schedule name.");versions.put("schedules",hash(population));
        var next=new Schedule(old==null?0:old.id(),in.name().trim(),in.cadence(),old==null?"America/Monterrey":old.timezone(),in.preferredCurrency(),in.status(),nextRun(in.cadence()).toString(),old==null?null:old.lastRunAt());
        return new Prepared(action,c,new Records(List.of(),old==null?List.of():List.of(old)),new Records(List.of(),List.of(next)),List.of(),null,null,Map.copyOf(versions));
    }
    private static LocalDate nextRun(String cadence){var from=LocalDate.now();if(cadence.equals("weekly")){int days=(1-from.getDayOfWeek().getValue()+7)%7;return from.plusDays(days==0?7:days);}if(cadence.equals("semimonthly"))return from.getDayOfMonth()<16?from.withDayOfMonth(16):from.plusMonths(1).withDayOfMonth(1);return from.plusMonths(1).withDayOfMonth(1);}
    private List<Cut> cutList(AuthSessionUser u){return cuts.list(u.companyId()).stream().map(v->mapper.convertValue(v,Cut.class)).toList();}
    private List<Schedule> schedules(AuthSessionUser u){return cuts.schedules(u.companyId()).stream().map(v->mapper.convertValue(v,Schedule.class)).toList();}
    private Cut findCut(AuthSessionUser u,long id){return cutList(u).stream().filter(v->v.id()==id).findFirst().orElseThrow(NoSuchElementException::new);}
    private Schedule findSchedule(AuthSessionUser u,long id){return schedules(u).stream().filter(v->v.id()==id).findFirst().orElseThrow(NoSuchElementException::new);}
    private void requireCorporate(AuthSessionUser u){if(!scope.resolve(u).isCorporateOffice())throw new SecurityException("Company-wide commission cuts and schedules require corporate authority.");}
    private static void positive(Long v){if(v==null||v<1)throw new IllegalArgumentException("Positive commission ID required.");}
    private static void currency(String v){if(v==null||!Set.of("MXN","CAD","USD","COP","BRL","EUR").contains(v))throw new IllegalArgumentException("Supported preferred currency required.");}
    private com.fasterxml.jackson.databind.JsonNode canonical(Object v){try{return mapper.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(mapper.writeValueAsString(v));}catch(Exception e){throw new IllegalStateException("Invalid commission snapshot.",e);}}
    private String hash(Object v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(v)));}catch(Exception e){throw new IllegalStateException("Invalid commission snapshot.",e);}}
    private static String cursor(int n,String b){return Base64.getUrlEncoder().withoutPadding().encodeToString((n+":"+b).getBytes(StandardCharsets.UTF_8));}
    private static int offset(String c,String b){if(c==null)return 0;try{var parts=new String(Base64.getUrlDecoder().decode(c),StandardCharsets.UTF_8).split(":",2);int n=Integer.parseInt(parts[0]);if(n>=0&&parts[1].equals(b))return n;}catch(RuntimeException ignored){}throw new IllegalArgumentException("Commission cursor scope or results changed.");}
    private static <T>T requiredInput(T value,String message){if(value==null)throw new IllegalArgumentException(message);return value;}
}
