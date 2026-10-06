package com.indice.erp.hr.assistant;

import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.hr.assets.HrAssetService;
import com.indice.erp.hr.announcements.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** HR remains owner of validation, identity/access side effects and operational scope. */
@Service
public class HrAssistantService {
    private static final Set<String> FOUNDATION_ACTIONS = Set.of("create_employee", "update_employee", "import_employees", "inactivate_employee", "create_hr_asset", "create_announcement");
    public static final Set<String> ACTIONS = java.util.stream.Stream.of(FOUNDATION_ACTIONS,HrAssistantLifecycleService.ACTIONS,HrAssistantPermissionsService.ACTIONS,HrAssistantIncentivesService.ACTIONS,HrAssistantAttendanceService.ACTIONS,HrAssistantPayrollService.ACTIONS).flatMap(Set::stream).collect(java.util.stream.Collectors.toUnmodifiableSet());
    private final HrUserService people;
    private final HrAssetService assets;
    private final HrAnnouncementSecurityService announcementSecurity;
    private final HrAnnouncementQueryService announcementQueries;
    private final HrAnnouncementCommandService announcementCommands;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final com.indice.erp.hr.HrOperationalScopeService scopes;
    private final AnnAudienceSvc announcementAudience;
    private final com.indice.erp.hr.payroll.HrPayrollService payroll;
    private final HrAssistantLifecycleService lifecycle;
    private final HrAssistantPermissionsService permissions;
    private final HrAssistantIncentivesService incentives;
    private final HrAssistantAttendanceService attendance;
    private final HrAssistantPayrollService payrollAssistant;

    public HrAssistantService(HrUserService people, HrAssetService assets, HrAnnouncementSecurityService announcementSecurity,
            HrAnnouncementQueryService announcementQueries, HrAnnouncementCommandService announcementCommands, JdbcTemplate jdbc, ObjectMapper mapper,
            com.indice.erp.hr.HrOperationalScopeService scopes, AnnAudienceSvc announcementAudience, com.indice.erp.hr.payroll.HrPayrollService payroll, HrAssistantLifecycleService lifecycle, HrAssistantPermissionsService permissions,HrAssistantIncentivesService incentives,HrAssistantAttendanceService attendance,HrAssistantPayrollService payrollAssistant) {
        this.people = people; this.assets = assets; this.announcementSecurity = announcementSecurity;
        this.announcementQueries = announcementQueries; this.announcementCommands = announcementCommands; this.jdbc = jdbc; this.mapper = mapper;
        this.scopes = scopes;
        this.announcementAudience = announcementAudience;
        this.payroll = payroll;
        this.lifecycle = lifecycle;
        this.permissions = permissions;
        this.incentives = incentives;
        this.attendance = attendance;
        this.payrollAssistant=payrollAssistant;
    }

    public Page<AnnouncementAudienceView> announcementAudience(AuthSessionUser user, PageRequest request) {
        var window = HrAssistantPages.window(user, "list_announcement_audience", request);
        if (request != null && (request.status() != null || request.unitId() != null || request.businessId() != null))
            throw new IllegalArgumentException("Announcement audience scope is derived from the authenticated operator; use query to find a recipient.");
        var options = audienceOptions(user).stream().filter(row -> request == null || request.query() == null
            || (row.name() + " " + row.unitName()).toLowerCase(Locale.ROOT).contains(request.query().toLowerCase(Locale.ROOT))).toList();
        int from=(int)Math.min((long)(window.page()-1)*window.size(),options.size()),to=Math.min(from+window.size(),options.size());
        return window.result(options.subList(from,to), options.size());
    }
    private List<AnnouncementAudienceView> audienceOptions(AuthSessionUser user) {
        var options=announcementAudience.options(announcementSecurity.delegatedActor(user));
        var result=new ArrayList<AnnouncementAudienceView>();
        for(var kind:List.of("units","employees","departments")) for(var row:rows(options.get(kind)))
            result.add(new AnnouncementAudienceView(kind.equals("units")?"UNIT":kind.equals("employees")?"EMPLOYEE":"DEPARTMENT",
                number(row.get("id")),text(row.get("name")),number(row.get("unit_id")),text(row.get("unit_name")),requireNonnegativeId(number(row.get("active_user_count")))));
        return List.copyOf(result);
    }

    public Page<OrganizationView> organization(AuthSessionUser user, PageRequest request) {
        var scope = scopes.resolve(user);
        var args = request == null ? new PageRequest(null, null, null, null, 1, 25) : request;
        var window = HrAssistantPages.window(user, "list_hr_organization", args);
        int page = window.page(), size = window.size();
        if (args.status() != null) throw new IllegalArgumentException("Organization references include active destinations only.");
        var rows = jdbc.queryForList("SELECT b.id,b.name,b.unit_id,u.name AS unit_name FROM businesses b JOIN units u ON u.id=b.unit_id AND u.company_id=b.company_id WHERE b.company_id=? AND LOWER(b.status) IN ('active','activo') AND LOWER(u.status) IN ('active','activo') ORDER BY u.name,b.name,b.id", user.companyId());
        var result = new ArrayList<OrganizationView>(); var units = new HashSet<Long>();
        for (var row : rows) {
            long business = number(row.get("id")), unit = number(row.get("unit_id"));
            if (!scope.isCorporateOffice() && (!Objects.equals(scope.unitId(), unit)
                    || scope.type() == com.indice.erp.hr.HrOperationalScope.Type.BUSINESS_OFFICE && !Objects.equals(scope.businessId(), business))) continue;
            if (args.unitId() != null && args.unitId() != unit || args.businessId() != null && args.businessId() != business) continue;
            if (units.add(unit)) result.add(new OrganizationView("UNIT",unit,text(row.get("unit_name")),unit,text(row.get("unit_name"))));
            result.add(new OrganizationView("BUSINESS",business,text(row.get("name")),unit,text(row.get("unit_name"))));
        }
        var filtered = result.stream().filter(row -> args.query() == null || (row.name()+" "+row.unitName()).toLowerCase(Locale.ROOT).contains(args.query().toLowerCase(Locale.ROOT))).toList();
        int from=(int)Math.min((long)(page-1)*size,filtered.size()),to=Math.min(from+size,filtered.size());
        return window.result(filtered.subList(from,to),filtered.size());
    }

    public EmployeeView employee(AuthSessionUser user, long id) { return employeeView(people.getUserDetails(user, id)); }
    public AssetView asset(AuthSessionUser user, long id) { return assetView(map(assets.assetDetails(user, id).get("asset"))); }
    public Page<AssetView> assets(AuthSessionUser user, PageRequest request) {
        var args = request == null ? new PageRequest(null, null, null, null, 1, 25) : request;
        var window = HrAssistantPages.window(user, "list_hr_assets", args);
        var filters = new LinkedHashMap<String, Object>();
        filters.put("page", window.page()); filters.put("size", window.size());
        if (args.query() != null) filters.put("search", args.query());
        if (args.status() != null) filters.put("status", args.status());
        if (args.unitId() != null) filters.put("unit_id", args.unitId());
        if (args.businessId() != null) throw new IllegalArgumentException("HR assets use a unit scope; filter by unit.");
        var result = assets.listAssets(user, filters);
        var rows = rows(result.get("rows")).stream().map(HrAssistantService::assetView).toList();
        long total = ((Number)result.get("total_count")).longValue();
        return window.result(rows,total);
    }
    public Page<AnnouncementView> announcements(AuthSessionUser user, PageRequest request) {
        var all = rows(announcementQueries.listReadOnly(announcementSecurity.delegatedActor(user)).get("items"));
        var args = request == null ? new PageRequest(null, null, null, null, 1, 25) : request;
        if (args.unitId() != null || args.businessId() != null) throw new IllegalArgumentException("Announcement visibility is derived from the authenticated audience.");
        var window = HrAssistantPages.window(user, "list_announcements", args);
        int page = window.page(), size = window.size();
        var filtered = all.stream().filter(row -> args.query() == null || text(row.get("title")).toLowerCase(Locale.ROOT).contains(args.query().toLowerCase(Locale.ROOT)))
            .filter(row -> args.status() == null || args.status().equals(row.get("status"))).toList();
        long start = Math.min((long)(page - 1) * size, filtered.size());
        var items = filtered.subList((int)start, (int)Math.min(start + size, filtered.size())).stream().map(HrAssistantService::announcementView).toList();
        return window.result(items,filtered.size());
    }
    public AnnouncementView announcement(AuthSessionUser user, long id) {
        return rows(announcementQueries.listReadOnly(announcementSecurity.delegatedActor(user)).get("items")).stream()
            .filter(row -> Objects.equals(number(row.get("id")), id)).findFirst().map(HrAssistantService::announcementView)
            .orElseThrow(() -> new NoSuchElementException("Announcement not found in the authorized scope."));
    }

    public Page<AnnouncementReceipt> announcementReceipts(AuthSessionUser user,long id,PageRequest request) {
        var window=HrAssistantPages.window(user,"get_announcement_receipts:"+id,request);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Receipt visibility follows current announcement management scope.");
        var rows=announcementQueries.assistantReadReceipts(announcementSecurity.delegatedActor(user),id).stream().map(r->new AnnouncementReceipt(r.userCompanyId(),r.employeeName(),r.status(),r.deliveredAt(),r.readAt()))
            .filter(r->request==null||request.query()==null||r.employeeName().toLowerCase(Locale.ROOT).contains(request.query().toLowerCase(Locale.ROOT)))
            .filter(r->request==null||request.status()==null||r.status().equals(request.status())).toList();
        int start=(int)Math.min((long)(window.page()-1)*window.size(),rows.size());return window.result(rows.subList(start,Math.min(start+window.size(),rows.size())),rows.size());
    }
    public Page<AssetHistoryEntry> assetHistory(AuthSessionUser user,long id,PageRequest request) {
        var window=HrAssistantPages.window(user,"get_hr_asset_history:"+id,request);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Use the asset's current authorized scope.");
        var result=assets.assetHistory(user,id);var all=new ArrayList<AssetHistoryEntry>();
        for(var row:rows(result.get("assignment_history")))all.add(new AssetHistoryEntry(requireId(number(row.get("id"))),"assignment","",text(row.get("assignment_status")),number(row.get("responsible_user_company_id")),text(row.get("responsible_name")),number(row.get("unit_id")),text(row.get("unit_name")),text(row.get("started_at")),text(row.get("ended_at")),"",text(row.get("notes")),text(row.get("created_by_name")),text(row.get("ended_by_name"))));
        for(var row:rows(result.get("status_history")))all.add(new AssetHistoryEntry(requireId(number(row.get("id"))),"status",text(row.get("from_status")),text(row.get("to_status")),null,"",null,"",text(row.get("changed_at")),"",text(row.get("change_reason")),text(row.get("notes")),text(row.get("changed_by_name")),""));
        var rows=all.stream().sorted(Comparator.comparing(AssetHistoryEntry::startedAt).reversed().thenComparing(AssetHistoryEntry::id,Comparator.reverseOrder()))
            .filter(r->request==null||request.query()==null||(r.responsibleName()+" "+r.notes()+" "+r.reason()).toLowerCase(Locale.ROOT).contains(request.query().toLowerCase(Locale.ROOT)))
            .filter(r->request==null||request.status()==null||r.toStatus().equals(request.status())).toList();
        int start=(int)Math.min((long)(window.page()-1)*window.size(),rows.size());return window.result(rows.subList(start,Math.min(start+window.size(),rows.size())),rows.size());
    }

    public Prepared prepare(AuthSessionUser user, String action, Change request) {
        if (!ACTIONS.contains(action) || request == null) throw new IllegalArgumentException("HR action details required.");
        if(HrAssistantPayrollService.ACTIONS.contains(action))return payrollAssistant.prepare(user,action,request,this);
        if(HrAssistantAttendanceService.ACTIONS.contains(action))return attendance.prepare(user,action,request,this);
        if(HrAssistantLifecycleService.ACTIONS.contains(action))return lifecycle.prepare(user,action,request,this);
        if(HrAssistantPermissionsService.ACTIONS.contains(action))return permissions.prepare(user,action,request,this);
        if(HrAssistantIncentivesService.ACTIONS.contains(action))return incentives.prepare(user,action,request,this);
        requireFields(action, request);
        var empty = new Result(List.of(), null, null);
        Result before = empty, after;
        Change change = request;
        switch (action) {
            case "create_employee", "update_employee" -> {
                Map<String, Object> payload = new LinkedHashMap<>();
                if ("update_employee".equals(action)) {
                    before = new Result(List.of(employee(user, requireId(request.id()))), null, null);
                    payload.putAll(map(people.getUserDetails(user, request.id()).get("user")));
                }
                payload.putAll(employeePayload(request.employee()));
                validateEmployeeInput(payload);
                var employment=people.validateAssistantUser(user,request.id(),payload);
                String country=text(payload.get("registration_country"));
                if(country.isBlank() && "update_employee".equals(action)) {
                    var person=before.employees().getFirst();
                    boolean compensationChanged = !Objects.equals(employment.salary(),person.salary())
                        || !Objects.equals(employment.hourlyRate(),person.hourlyRate())
                        || !Objects.equals(employment.salaryType(),person.salaryType())
                        || !Objects.equals(employment.payPeriod(),person.payPeriod());
                    if(compensationChanged) people.validateAssistantRegistrationCountry(country);
                    country=null;
                } else country=people.validateAssistantRegistrationCountry(country);
                var normalized = employeeChange(employment, country);
                payload.putAll(employeePayload(normalized));
                change = new Change(request.id(), normalized, null, null, null);
                after = new Result(List.of(employeeDraftView(user, payload, request.id())), null, null);
            }
            case "import_employees" -> {
                if (request.employees() == null || request.employees().isEmpty() || request.employees().size() > 100)
                    throw new IllegalArgumentException("Import accepts 1 to 100 employees per confirmed batch.");
                var emails = new HashSet<String>();
                var views = new ArrayList<EmployeeView>();
                var normalized = new ArrayList<EmployeeChange>();
                for (var person : request.employees()) {
                    var payload = employeePayload(person); validateEmployeeInput(payload);
                    var prepared = employeeChange(people.validateAssistantUser(user, null, payload),
                        people.validateAssistantRegistrationCountry(text(payload.get("registration_country"))));
                    payload.putAll(employeePayload(prepared)); normalized.add(prepared);
                    if (!emails.add(text(payload.get("email")).trim().toLowerCase(Locale.ROOT))) throw new IllegalArgumentException("Duplicate email in employee import.");
                    views.add(employeeDraftView(user, payload, null));
                }
                people.validateAssistantImportCapacity(user, views.size());
                change = new Change(null, null, List.copyOf(normalized), null, null);
                after = new Result(List.copyOf(views), null, null);
            }
            case "inactivate_employee" -> {
                var person = employee(user, requireId(request.id()));
                if (request.id().equals(user.userCompanyId())) throw new IllegalArgumentException("Use the account administration flow to inactivate your own access.");
                before = new Result(List.of(person), null, null);
                after = new Result(List.of(new EmployeeView(person.userCompanyId(), person.employeeCode(), person.name(), person.email(), person.phone(),
                    person.position(), person.department(), person.unitId(), person.unitName(), person.businessId(), person.businessName(),
                    "terminated".equals(person.status()) ? "terminated" : "inactive", person.registrationCountry(), person.salaryCurrency(), person.salary(), person.payPeriod(), person.salaryType(), person.hourlyRate(),
                    person.hireDate(), person.contractType(), person.contractStartDate(), person.contractEndDate(), person.documents())), null, null);
            }
            case "create_hr_asset" -> {
                var asset = request.asset();
                if (asset.valueAmount() != null && asset.valueCurrency() == null) throw new IllegalArgumentException("Asset value requires an explicit currency.");
                var normalized = new AssetChange(asset.assetCode(), asset.assetType(), asset.name(), asset.model(), asset.serialNumber(), asset.responsibleUserCompanyId(), asset.unitId(),
                    asset.status() == null ? asset.responsibleUserCompanyId() == null ? "available" : "assigned" : asset.status(),
                    asset.assignedAt() == null && asset.responsibleUserCompanyId() != null ? LocalDateTime.now() : asset.assignedAt(), asset.valueAmount(),
                    asset.valueCurrency() == null ? "USD" : asset.valueCurrency(), asset.notes());
                var draft = assets.validateAssistantCreate(user, assetPayload(normalized));
                normalized = new AssetChange(draft.assetCode(),draft.assetType(),draft.name(),draft.model(),draft.serialNumber(),
                    draft.responsibleUserCompanyId(),draft.unitId(),draft.status(),draft.assignedAt(),draft.valueAmount(),draft.valueCurrency(),draft.notes());
                change = new Change(null, null, null, normalized, null);
                after = new Result(List.of(), new AssetView(0, normalized.assetCode(), normalized.name(), normalized.assetType(), normalized.model(), normalized.serialNumber(),
                    normalized.unitId(), referenceName(user.companyId(),"units",normalized.unitId()), normalized.responsibleUserCompanyId(), employeeName(user.companyId(),normalized.responsibleUserCompanyId()), normalized.status(), normalized.valueAmount(), normalized.valueCurrency(), normalized.notes(), 0), null);
            }
            case "create_announcement" -> {
                var requested = request.announcement();
                var normalized = new AnnouncementChange(requested.title(), requested.type() == null ? "general" : requested.type(), requested.content(), requested.audienceType() == null ? "all" : requested.audienceType(),
                    requested.status() == null ? "draft" : requested.status(), requested.scheduledFor(), requested.unitIds(), requested.userCompanyIds(), requested.departmentNames());
                var actor = announcementSecurity.delegatedActor(user);
                var draft=announcementCommands.validateAssistantCreate(actor, announcementPayload(normalized));
                normalized = new AnnouncementChange(draft.title(),draft.type(),draft.content(),draft.audienceType(),draft.status(),draft.scheduledFor(),normalized.unitIds(),normalized.userCompanyIds(),normalized.departmentNames());
                change = new Change(null, null, null, null, normalized);
                after = new Result(List.of(), null, new AnnouncementView(0, normalized.title(), normalized.type(), normalized.content(), normalized.audienceType(),
                    audienceSummary(user,normalized), normalized.status(), normalized.scheduledFor() == null ? null : normalized.scheduledFor().toString(), 0, 0, false, 0));
            }
            default -> throw new IllegalArgumentException("Unsupported HR action.");
        }
        return new Prepared(action, change, before.equals(empty) ? null : version(before), before, after);
    }

    @Transactional
    public Result execute(AuthSessionUser user, Prepared prepared) {
        var action = prepared.action(); var change = prepared.change();
        if(HrAssistantPayrollService.ACTIONS.contains(action))return payrollAssistant.execute(user,prepared,this);
        if(HrAssistantAttendanceService.ACTIONS.contains(action))return attendance.execute(user,prepared,this);
        if (change.id() != null) {
            String table=action.contains("incentive")?"hr_incentives":action.contains("permission")?"user_permission_requests":action.contains("asset")?"user_assets":action.contains("announcement")?"hr_announcements":action.endsWith("hr_record")?"user_records":"user_companies";
            var ids = jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? FOR UPDATE", Long.class, user.companyId(), change.id());
            if (ids.isEmpty()) throw new NoSuchElementException("HR object not found.");
            var current = HrAssistantIncentivesService.ACTIONS.contains(action)?incentives.current(user,change.id()):HrAssistantPermissionsService.ACTIONS.contains(action)?permissions.current(user,action,change.id()):HrAssistantLifecycleService.ACTIONS.contains(action)?lifecycle.current(user,action,change.id(),this):new Result(List.of(employee(user, change.id())), null, null);
            if (!Objects.equals(prepared.expectedVersion(), version(current))) throw new Changed();
        }
        prepare(user, action, change); // Recheck live scope, recipients, references and capacity under the write transaction.
        if(HrAssistantLifecycleService.ACTIONS.contains(action))return lifecycle.execute(user,prepared,this);
        if(HrAssistantPermissionsService.ACTIONS.contains(action))return permissions.execute(user,prepared);
        if(HrAssistantIncentivesService.ACTIONS.contains(action))return incentives.execute(user,prepared);
        return switch (action) {
            case "create_employee" -> new Result(List.of(employeeView(people.createUser(user, employeePayload(change.employee())))), null, null);
            case "update_employee" -> {
                var payload = new LinkedHashMap<>(map(people.getUserDetails(user, change.id()).get("user")));
                payload.putAll(employeePayload(change.employee()));
                yield new Result(List.of(employeeView(people.updateAssistantUser(user, change.id(), payload))), null, null);
            }
            case "import_employees" -> {
                var created = people.createUsersBulk(user, Map.of("items", change.employees().stream().map(HrAssistantService::employeePayload).toList()));
                yield new Result(rows(created.get("items")).stream().map(row -> employeeView(Map.of("user", row))).toList(), null, null);
            }
            case "inactivate_employee" -> { people.deleteUser(user, change.id()); yield new Result(List.of(employee(user, change.id())), null, null); }
            case "create_hr_asset" -> new Result(List.of(), assetView(map(assets.createAsset(user, assetPayload(change.asset())).get("asset"))), null);
            case "create_announcement" -> new Result(List.of(), null, announcementView(announcementCommands.create(announcementSecurity.delegatedActor(user), announcementPayload(change.announcement()))));
            default -> throw new IllegalArgumentException("Unsupported HR action.");
        };
    }
    public void requireResultAccess(AuthSessionUser user, Result result) {
        payrollAssistant.requireResultAccess(user,result.payroll());
        if (result.attendance() != null) attendance.requireResultAccess(user,result.attendance());
        for (var person : result.employees()) employee(user, person.userCompanyId());
        if (result.asset() != null) asset(user, result.asset().id());
        if (result.announcement() != null) announcement(user, result.announcement().id());
        if (result.record() != null) lifecycle.current(user,"update_hr_record",result.record().id(),this);
        if (result.incentive() != null) incentives.detail(user,result.incentive().id());
        if (result.permission() != null) permissions.requireResultAccess(user,result);
    }

    private static void requireFields(String action, Change request) {
        boolean employee = Set.of("create_employee", "update_employee").contains(action), bulk = "import_employees".equals(action), asset = "create_hr_asset".equals(action), announcement = "create_announcement".equals(action);
        if (request.attendance()!=null||request.payroll()!=null||request.incentive()!=null||request.permission()!=null||request.termination()!=null||request.assignment()!=null||request.record()!=null||(request.employee() != null) != employee || (request.employees() != null) != bulk || (request.asset() != null) != asset || (request.announcement() != null) != announcement
                || (request.id() != null) != Set.of("update_employee", "inactivate_employee").contains(action)) throw new IllegalArgumentException("Fields do not belong to the selected HR action.");
    }
    boolean equivalent(Object first,Object second) { return mapper.valueToTree(first).equals(mapper.valueToTree(second)); }
    String version(Result result) {
        try { return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(result))); }
        catch (Exception exception) { throw new IllegalStateException("HR version could not be calculated.", exception); }
    }
    private static void validateEmployeeInput(Map<String,Object> payload) {
        if (!text(payload.get("email")).matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Valid employee email required.");
        for (var field : List.of("first_name", "last_name", "position", "department"))
            if (text(payload.get(field)).isBlank() || text(payload.get(field)).length() > 120) throw new IllegalArgumentException("Required employee fields must contain 1 to 120 characters.");
    }
    static Map<String,Object> employeePayload(EmployeeChange person) {
        if(person==null) throw new IllegalArgumentException("Every imported row must contain employee details.");
        var result = new LinkedHashMap<String,Object>();
        put(result,"first_name",person.firstName()); put(result,"last_name",person.lastName()); put(result,"email",person.email()); put(result,"phone",person.phone()); put(result,"position",person.position()); put(result,"department",person.department());
        put(result,"unit_id",person.unitId()); put(result,"business_id",person.businessId()); put(result,"hire_date",person.hireDate()); put(result,"salary",person.salary()); put(result,"pay_period",person.payPeriod()); put(result,"salary_type",person.salaryType()); put(result,"hourly_rate",person.hourlyRate()); put(result,"contract_type",person.contractType()); put(result,"contract_start_date",person.contractStartDate()); put(result,"contract_end_date",person.contractEndDate());put(result,"registration_country",person.registrationCountry());
        return result;
    }
    private static EmployeeChange employeeChange(HrUserService.HrUserDraft draft, String country) {
        return new EmployeeChange(draft.firstName(),draft.lastName(),draft.email(),draft.phone(),draft.position(),draft.department(),draft.unitId(),draft.businessId(),draft.hireDate(),draft.salary(),draft.payPeriod(),draft.salaryType(),draft.hourlyRate(),draft.contractType(),draft.contractStartDate(),draft.contractEndDate(),country);
    }
    private EmployeeView employeeDraftView(AuthSessionUser user, Map<String,Object> row, Long id) {
        var copy = new LinkedHashMap<>(row); copy.put("user_company_id", id == null ? 0 : id); copy.putIfAbsent("status", "active");
        copy.put("unit_name",referenceName(user.companyId(),"units",number(row.get("unit_id"))));
        copy.put("business_name",referenceName(user.companyId(),"businesses",number(row.get("business_id"))));
        return employeeView(Map.of("user", copy));
    }
    String referenceName(long company,String kind,Long id) {
        if(id==null)return "";
        if(!Set.of("units","businesses").contains(kind))throw new IllegalArgumentException("Unsupported HR reference.");
        var names=jdbc.queryForList("SELECT name FROM "+kind+" WHERE company_id=? AND id=?",String.class,company,id);
        return names.isEmpty()?"":names.getFirst();
    }
    String employeeName(long company,Long membership) {
        if(membership==null)return "";
        var names=jdbc.queryForList("SELECT full_name FROM hr_users WHERE company_id=? AND id=?",String.class,company,membership);
        return names.isEmpty()?"":text(names.getFirst());
    }
    String audienceSummary(AuthSessionUser user,AnnouncementChange requested) {
        if("all".equals(requested.audienceType()))return "Todo el personal autorizado de la empresa";
        var options=audienceOptions(user);
        if("departments".equals(requested.audienceType()))return String.join(", ",requested.departmentNames());
        var selected="units".equals(requested.audienceType())?requested.unitIds():requested.userCompanyIds();
        String kind="units".equals(requested.audienceType())?"UNIT":"EMPLOYEE";
        return options.stream().filter(row->kind.equals(row.referenceType())&&selected.contains(row.id()))
            .map(row->row.name()+(row.unitName().isBlank()?"":" ("+row.unitName()+")")).collect(java.util.stream.Collectors.joining(", "));
    }
    private EmployeeView employeeView(Map<String,Object> body) {
        var row = map(body.get("user"));
        var documents = rows(body.get("documents")).stream().map(doc -> new DocumentView(requireId(number(doc.get("id"))),text(doc.get("document_type")),text(doc.get("original_filename")),text(doc.get("mime_type")),number(doc.get("size_bytes")))).toList();
        return new EmployeeView(requireNonnegativeId(number(row.get("user_company_id"))), text(row.get("user_code")), (text(row.get("first_name")) + " " + text(row.get("last_name"))).trim(),text(row.get("email")),text(row.get("phone")),text(row.get("position")),text(row.get("department")),number(row.get("unit_id")),text(row.get("unit_name")),number(row.get("business_id")),text(row.get("business_name")),text(row.get("status")),text(row.get("registration_country")),payroll.employeeCompensationCurrency(text(row.get("registration_country"))),decimal(row.get("salary")),text(row.get("pay_period")),text(row.get("salary_type")),decimal(row.get("hourly_rate")),date(row.get("hire_date")),text(row.get("contract_type")),date(row.get("contract_start_date")),date(row.get("contract_end_date")),documents);
    }
    private static Map<String,Object> assetPayload(AssetChange asset) {
        var result = new LinkedHashMap<String,Object>(); put(result,"asset_code",asset.assetCode()); put(result,"asset_type",asset.assetType()); put(result,"name",asset.name()); put(result,"model",asset.model()); put(result,"serial_number",asset.serialNumber()); put(result,"responsible_user_company_id",asset.responsibleUserCompanyId()); put(result,"unit_id",asset.unitId()); put(result,"status",asset.status()); put(result,"assigned_at",asset.assignedAt()); put(result,"value_amount",asset.valueAmount()); put(result,"value_currency",asset.valueCurrency()); put(result,"notes",asset.notes()); return result;
    }
    private static AssetView assetView(Map<String,Object> row) {
        return new AssetView(requireNonnegativeId(number(row.get("id"))),text(row.get("asset_code")),text(row.get("name")),text(row.get("asset_type")),text(row.get("model")),text(row.get("serial_number")),number(row.get("unit_id")),text(row.get("unit_name")),number(row.get("responsible_user_company_id")),text(row.get("responsible_name")),text(row.get("status")),decimal(row.get("value_amount")),text(row.get("value_currency")),text(row.get("notes")),requireNonnegativeId(number(row.get("photo_count"))));
    }
    static Map<String,Object> announcementPayload(AnnouncementChange announcement) {
        var result = new LinkedHashMap<String,Object>(); put(result,"title",announcement.title()); put(result,"type",announcement.type()); put(result,"content",announcement.content()); put(result,"audience_type",announcement.audienceType()); put(result,"status",announcement.status()); put(result,"scheduled_for",announcement.scheduledFor()); put(result,"unit_ids",announcement.unitIds()); put(result,"user_company_ids",announcement.userCompanyIds()); put(result,"department_names",announcement.departmentNames()); return result;
    }
    private static AnnouncementView announcementView(Map<String,Object> row) {
        return new AnnouncementView(requireNonnegativeId(number(row.get("id"))),text(row.get("title")),text(row.get("type")),text(row.get("content")),text(row.get("audience_type")),text(row.get("audience_summary")),text(row.get("status")),nullableText(row.get("scheduled_for")),requireNonnegativeId(number(row.get("delivery_count"))),requireNonnegativeId(number(row.get("read_count"))),Boolean.TRUE.equals(row.get("is_read")),requireNonnegativeId(number(row.get("attachment_count"))));
    }
    private static void put(Map<String,Object> result,String key,Object value) { HrAssistantPayload.put(result,key,value); }
    private static long requireId(Long id) { if(id==null||id<=0) throw new IllegalArgumentException("Positive HR identifier required."); return id; }
    private static long requireNonnegativeId(Long id) { return id==null?0:id; }
    private static String text(Object value) { return value==null?"":value.toString(); }
    private static String nullableText(Object value) { return value==null?null:value.toString(); }
    private static Long number(Object value) { return value instanceof Number n?n.longValue():null; }
    private static BigDecimal decimal(Object value) { return value==null?null:new BigDecimal(value.toString()); }
    private static LocalDate date(Object value) { return value==null||value.toString().isBlank()?null:LocalDate.parse(value.toString()); }
    private static Map<String,Object> map(Object value) { var result=new LinkedHashMap<String,Object>(); if(value instanceof Map<?,?> source) source.forEach((key,item)->result.put(String.valueOf(key),item)); return result; }
    private static List<Map<String,Object>> rows(Object value) { return value instanceof List<?> list?list.stream().map(HrAssistantService::map).toList():List.of(); }
    public static final class Changed extends RuntimeException { public Changed() { super("HR record changed after preview. Prepare it again."); } }
}
