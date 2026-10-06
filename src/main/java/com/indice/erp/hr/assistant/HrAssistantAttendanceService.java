package com.indice.erp.hr.assistant;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.attendance.models.LocationRow;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import static com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.*;
import com.indice.erp.hr.assistant.HrAssistantAttendanceContracts.Calendar;

/** Administrative attendance commands use the same owner validation and event projection as the ERP. */
@Service
public class HrAssistantAttendanceService {
    public static final Set<String> ACTIONS = Set.of("create_hr_schedule", "update_hr_schedule", "assign_hr_schedule",
            "create_hr_location", "update_hr_location", "set_hr_allowed_locations", "assign_hr_work_site",
            "clear_hr_work_assignments", "correct_hr_attendance", "record_hr_attendance_event", "assign_hr_rest_days");
    public static final Set<String> READS = Set.of("list_hr_schedules", "get_hr_schedule", "list_hr_locations",
            "get_hr_location", "get_hr_attendance_calendar", "list_hr_schedule_candidates", "get_my_attendance_calendar", "get_my_attendance_events", "get_hr_attendance_events");
    private final HrAttendanceService owner;
    private final JdbcTemplate jdbc;
    public HrAssistantAttendanceService(HrAttendanceService owner, JdbcTemplate jdbc) { this.owner = owner; this.jdbc = jdbc; }
    private static Result empty() { return new Result(List.of(), List.of(), List.of(), List.of(), List.of()); }
    private static HrAssistantContracts.Result result(Result data) {
        return new HrAssistantContracts.Result(List.of(), null, null, null, null, false, null, data);
    }

    public HrAssistantContracts.Prepared prepare(AuthSessionUser user, String action, HrAssistantContracts.Change request, HrAssistantService versions) {
        requireFields(action, request);
        var change = request.attendance();
        var before = snapshot(user, action, request);
        Result after;
        switch (action) {
            case "create_hr_schedule", "update_hr_schedule" -> {
                var d = owner.validateAssistantSchedule(user, request.id(), schedulePayload(change.schedule()));
                var days = d.days().stream().map(day -> new DayRule(day.dayOfWeek(), text(day.startTime()), text(day.endTime()), day.mealMinutes(), day.restMinutes(), day.lateAfterMinutes(), day.isRestDay())).toList();
                var normalized = new ScheduleChange(d.name(), d.status(), d.scheduleMode(), d.enforceLocation(), d.locationId(), days);
                change = new Change(normalized, null, null, null, null, null);
                after = new Result(List.of(new ScheduleView(request.id() == null ? 0 : request.id(), d.name(), d.status(), d.scheduleMode(), d.enforceLocation(), d.locationId(), locationName(user, d.locationId()),
                        before.schedules().isEmpty() ? 0 : before.schedules().getFirst().assignedCount(), days)), List.of(), List.of(), List.of(), List.of());
            }
            case "create_hr_location", "update_hr_location" -> {
                var d = owner.validateAssistantLocation(user, request.id(), locationPayload(change.location()));
                var normalized = new LocationChange(d.name(), d.latitude(), d.longitude(), d.radiusMeters(), d.contractStartDate(), d.contractEndDate(), text(d.requiredStartTime()), text(d.requiredEndTime()),
                        d.requiredHoursPerDay(), d.requiredDaysPerWeek(), d.unitId(), d.businessId(), d.status());
                change = new Change(null, normalized, null, null, null, null);
                after = new Result(List.of(), List.of(new LocationView(request.id() == null ? 0 : request.id(), d.name(), d.unitId(), "", d.businessId(), "", text(d.contractStartDate()), text(d.contractEndDate()),
                        d.latitude(), d.longitude(), d.radiusMeters(), d.requiredHoursPerDay(), text(d.requiredStartTime()), text(d.requiredEndTime()), d.requiredDaysPerWeek(), d.status(),
                        before.locations().isEmpty() ? 0 : before.locations().getFirst().assignedCount())), List.of(), List.of(), List.of());
            }
            case "assign_hr_schedule", "assign_hr_work_site" -> {
                var input = change.assignment();
                var p = assignmentPayload(input);
                String templateName = "", locationName = "";
                if (action.equals("assign_hr_schedule")) {
                    var d = owner.validateAssistantScheduleAssignment(user, p); templateName = d.template().templateName();
                } else {
                    var d = owner.validateAssistantWorkSiteAssignment(user, p); locationName = d.location().name();
                    if (d.template() != null) templateName = d.template().templateName();
                }
                var assignments = new ArrayList<AssignmentView>();
                for (var member : before.members()) assignments.add(new AssignmentView(member.userCompanyId(), member.employeeName(), input.templateId(), templateName, input.locationId(), locationName, text(input.startDate()), text(input.endDate()), "active"));
                after = new Result(List.of(), List.of(), List.of(), before.members(), List.copyOf(assignments));
            }
            case "set_hr_allowed_locations" -> {
                var input = change.allowedLocations();
                var locations = owner.validateAssistantAllowedLocations(user, input.userCompanyId(), Map.of("location_ids", input.locationIds()));
                var member = before.members().getFirst();
                var next = new MemberState(member.userCompanyId(), member.employeeName(), member.status(), locations.stream().map(LocationRow::id).toList(), member.assignments());
                after = new Result(List.of(), locations.stream().map(HrAssistantAttendanceService::location).toList(), List.of(), List.of(next), List.of());
            }
            case "clear_hr_work_assignments" -> {
                var input = change.assignment();
                owner.validateAssistantClearAssignments(user, Map.of("user_company_id", input.userCompanyIds().getFirst(), "date", input.startDate().toString()));
                after = new Result(List.of(), List.of(), List.of(), before.members(), List.of());
            }
            case "correct_hr_attendance" -> {
                var input = change.correction();
                var payload = new LinkedHashMap<String,Object>(); put(payload, "status", input.status()); put(payload, "notes", input.notes());
                var days = new ArrayList<DayView>();
                String status = null;
                for (var day : before.days()) {
                    status = owner.validateAssistantCorrection(user, input.userCompanyId(), day.date(), payload);
                    days.add(new DayView(day.userCompanyId(), day.employeeName(), day.date(), day.systemStatus(), text(status), status == null ? day.systemStatus() : status,
                            true, "", day.firstCheckInAt(), day.lastCheckOutAt(), day.minutesLate(), text(input.notes()), day.schedule(), day.workSite()));
                }
                change = new Change(null, null, null, new CorrectionChange(input.userCompanyId(), input.dates(), status, input.notes()), null, null);
                after = new Result(List.of(), List.of(), List.copyOf(days), List.of(), List.of());
            }
            case "assign_hr_rest_days" -> {
                owner.validateAssistantRestPlan(user,restPayload(change.restPlan()));
                var restNotes=text(change.restPlan().notes());
                var days=before.days().stream().map(d->new DayView(d.userCompanyId(),d.employeeName(),d.date(),d.systemStatus(),"rest","rest",true,"",d.firstCheckInAt(),d.lastCheckOutAt(),d.minutesLate(),restNotes,d.schedule(),d.workSite())).toList();
                after=new Result(List.of(),List.of(),days,List.of(),List.of());
            }
            case "record_hr_attendance_event" -> {
                var input = change.manualEvent();
                var d = owner.validateAssistantManualEvent(user, input.userCompanyId(), input.date(), manualPayload(input));
                change = new Change(null, null, null, null, null, new ManualEventChange(input.userCompanyId(), input.date(), d.kind(), d.timestamp(), input.notes()));
                after = before; // The owner rebuilds the projection after the explicitly shown event is registered.
            }
            default -> throw new IllegalArgumentException("Unsupported administrative attendance action.");
        }
        var normalized = new HrAssistantContracts.Change(request.id(), null, null, null, null, null, null, null, null, null, change);
        return new HrAssistantContracts.Prepared(action, normalized, versions.version(result(before)), result(before), result(after));
    }

    public HrAssistantContracts.Result execute(AuthSessionUser user, HrAssistantContracts.Prepared prepared, HrAssistantService versions) {
        lock(user, prepared.change());
        var current = prepare(user, prepared.action(), prepared.change(), versions);
        if (!Objects.equals(current.expectedVersion(), prepared.expectedVersion()) || !versions.equivalent(current.change(),prepared.change())) throw new HrAssistantService.Changed();
        var request = prepared.change(); var change = request.attendance();
        switch (prepared.action()) {
            case "create_hr_schedule", "update_hr_schedule" -> {
                var saved = map(owner.saveScheduleTemplate(user, request.id(), schedulePayload(change.schedule())).get("template"));
                return result(new Result(List.of(schedule(saved)), List.of(), List.of(), List.of(), List.of()));
            }
            case "create_hr_location", "update_hr_location" -> {
                var saved = map(owner.saveLocation(user, request.id(), locationPayload(change.location())).get("location"));
                return result(new Result(List.of(), List.of(location(saved)), List.of(), List.of(), List.of()));
            }
            case "assign_hr_schedule" -> owner.bulkAssignScheduleTemplate(user, assignmentPayload(change.assignment()));
            case "assign_hr_work_site" -> owner.bulkAssignActiveWorkSite(user, assignmentPayload(change.assignment()));
            case "set_hr_allowed_locations" -> owner.replaceHrUserAllowedLocations(user, change.allowedLocations().userCompanyId(), Map.of("location_ids", change.allowedLocations().locationIds()));
            case "clear_hr_work_assignments" -> owner.clearHrUserWorkAssignments(user, Map.of("user_company_id", change.assignment().userCompanyIds().getFirst(), "date", change.assignment().startDate().toString()));
            case "correct_hr_attendance" -> {
                var c = change.correction(); var payload = new LinkedHashMap<String,Object>(); put(payload, "status", c.status()); put(payload, "notes", c.notes());
                for (var date : c.dates()) owner.updateDailyRecord(user, c.userCompanyId(), date, payload);
            }
            case "assign_hr_rest_days" -> owner.bulkAssignRestDays(user,restPayload(change.restPlan()));
            case "record_hr_attendance_event" -> owner.recordManualAttendanceEvent(user, change.manualEvent().userCompanyId(), change.manualEvent().date(), manualPayload(change.manualEvent()));
            default -> throw new IllegalArgumentException("Unsupported administrative attendance action.");
        }
        return result(snapshot(user, prepared.action(), request));
    }

    public HrAssistantContracts.Page<ScheduleView> schedules(AuthSessionUser user, HrAssistantContracts.PageRequest page) {
        return paginate(user, "list_hr_schedules", page, rows(owner.listScheduleTemplates(user).get("items")).stream().map(HrAssistantAttendanceService::schedule).toList(), ScheduleView::name, ScheduleView::status);
    }
    public ScheduleView schedule(AuthSessionUser user, long id) {
        return rows(owner.listScheduleTemplates(user).get("items")).stream().map(HrAssistantAttendanceService::schedule).filter(s -> s.id() == id).findFirst().orElseThrow(() -> new NoSuchElementException("Schedule not found in the authorized scope."));
    }
    public HrAssistantContracts.Page<Candidate> candidates(AuthSessionUser user, LocalDate startDate, LocalDate endDate,
            Boolean availableOnly, HrAssistantContracts.PageRequest page) {
        if(startDate==null||endDate!=null&&endDate.isBefore(startDate))throw new IllegalArgumentException("An explicit valid assignment date range required.");
        if(page!=null&&(page.status()!=null||page.limit()!=null&&(page.limit()<5||page.limit()>50)))throw new IllegalArgumentException("Candidates accept query, unit, business and a limit between 5 and 50; use availableOnly for availability.");
        var window=HrAssistantPages.window(user,"list_hr_schedule_candidates:"+startDate+":"+endDate+":"+Boolean.TRUE.equals(availableOnly),page);
        var data=owner.scheduleCandidates(user,startDate,endDate,window.page(),window.size(),page==null?null:page.query(),page==null?null:page.unitId(),page==null?null:page.businessId(),Boolean.TRUE.equals(availableOnly));
        if(integer(data.get("page"))!=window.page())throw new IllegalArgumentException("Candidate continuation is no longer available; start a new query.");
        var items=rows(data.get("items")).stream().map(c->new Candidate(number(c.get("user_company_id")),text(c.get("user_name")),text(c.get("position_title")),text(c.get("department")),text(c.get("user_status")),number(c.get("unit_id")),text(c.get("unit_name")),number(c.get("business_id")),text(c.get("business_name")),Boolean.TRUE.equals(c.get("can_assign_schedule")),text(c.get("schedule_busy_reason")))).toList();
        return window.result(items,number(data.get("total_count")));
    }
    public HrAssistantContracts.Page<LocationView> locations(AuthSessionUser user, HrAssistantContracts.PageRequest page) {
        return paginate(user, "list_hr_locations", page, rows(owner.listControlLocations(user).get("items")).stream().map(HrAssistantAttendanceService::location).toList(), LocationView::name, LocationView::status);
    }
    public LocationView location(AuthSessionUser user, long id) {
        return rows(owner.listControlLocations(user).get("items")).stream().map(HrAssistantAttendanceService::location).filter(l -> l.id() == id).findFirst().orElseThrow(() -> new NoSuchElementException("Location not found in the authorized scope."));
    }
    private String locationName(AuthSessionUser user, Long id) { return id == null ? "" : location(user, id).name(); }
    public Calendar calendar(AuthSessionUser user, long id, YearMonth month) {
        if (month == null) throw new IllegalArgumentException("An explicit month is required.");
        var data = owner.assistantCalendar(user, id, month);
        String name = text(map(data.get("user")).get("full_name"));
        var items = rows(data.get("items")).stream().map(day -> day(user, id, name, day)).toList();
        return new Calendar(id, name, month.toString(), items);
    }
    public Calendar selfCalendar(AuthSessionUser user,YearMonth month) {
        var data=owner.assistantSelfCalendar(user,month);var name=text(map(data.get("user")).get("full_name"));
        return new Calendar(user.userCompanyId(),name,month.toString(),rows(data.get("items")).stream().map(d->day(user,user.userCompanyId(),name,d)).toList());
    }
    public HrAssistantContracts.Page<Event> events(AuthSessionUser user,Long member,LocalDate date,HrAssistantContracts.PageRequest request) {
        if(date==null||member!=null&&member<1)throw new IllegalArgumentException("An explicit valid date and target required.");
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Event scope follows the current owner target.");
        var window=HrAssistantPages.window(user,(member==null?"get_my_attendance_events":"get_hr_attendance_events:"+member)+":"+date,request);
        var all=owner.assistantEvents(user,member,date).stream().filter(e->request==null||request.query()==null||(e.type()+" "+e.kind()+" "+e.notes()).toLowerCase(Locale.ROOT).contains(request.query().toLowerCase(Locale.ROOT))).filter(e->request==null||request.status()==null||e.resultStatus().equals(request.status())).toList();
        int start=(int)Math.min((long)(window.page()-1)*window.size(),all.size());return window.result(all.subList(start,Math.min(start+window.size(),all.size())),all.size());
    }
    public void requireResultAccess(AuthSessionUser user, Result data) {
        for (var schedule : data.schedules()) schedule(user, schedule.id());
        for (var location : data.locations()) location(user, location.id());
        for (var day : data.days()) calendar(user, day.userCompanyId(), YearMonth.from(day.date()));
        for (var member : data.members()) member(user, member.userCompanyId());
    }
    private Result snapshot(AuthSessionUser user, String action, HrAssistantContracts.Change request) {
        var change = request.attendance();
        if (action.endsWith("hr_schedule") && !action.startsWith("assign")) return request.id() == null ? empty() : new Result(List.of(schedule(user, request.id())), List.of(), List.of(), List.of(), List.of());
        if (action.endsWith("hr_location")) return request.id() == null ? empty() : new Result(List.of(), List.of(location(user, request.id())), List.of(), List.of(), List.of());
        if (change.assignment() != null) return new Result(change.assignment().templateId()==null?List.of():List.of(schedule(user,change.assignment().templateId())),
                change.assignment().locationId()==null?List.of():List.of(location(user,change.assignment().locationId())), List.of(), change.assignment().userCompanyIds().stream().map(id -> member(user, id)).toList(), List.of());
        if (change.allowedLocations() != null) return new Result(List.of(), change.allowedLocations().locationIds().stream().map(id -> location(user,id)).toList(), List.of(), List.of(member(user, change.allowedLocations().userCompanyId())), List.of());
        if(change.restPlan()!=null) {
            var days=new ArrayList<DayView>();
            for(var assignment:change.restPlan().assignments()){var months=new HashMap<YearMonth,Calendar>();for(var date:assignment.dates()){var month=months.computeIfAbsent(YearMonth.from(date),m->calendar(user,assignment.userCompanyId(),m));days.add(month.items().stream().filter(d->d.date().equals(date)).findFirst().orElseThrow());}}
            return new Result(List.of(),List.of(),List.copyOf(days),List.of(),List.of());
        }
        long member = change.correction() != null ? change.correction().userCompanyId() : change.manualEvent().userCompanyId();
        var dates = change.correction() != null ? change.correction().dates() : List.of(change.manualEvent().date());
        var months = new HashMap<YearMonth, Calendar>();
        var days = new ArrayList<DayView>();
        for (var date : dates) {
            var month = months.computeIfAbsent(YearMonth.from(date), m -> calendar(user, member, m));
            days.add(month.items().stream().filter(day -> day.date().equals(date)).findFirst().orElseThrow());
        }
        return new Result(List.of(), List.of(), List.copyOf(days), List.of(), List.of());
    }
    private MemberState member(AuthSessionUser user, long id) {
        var calendar = calendar(user, id, YearMonth.now()); // Owner validates tenant, employee existence and current organization.
        var status = jdbc.queryForObject("SELECT status FROM hr_users WHERE company_id=? AND id=?", String.class, user.companyId(), id);
        var locations = jdbc.queryForList("SELECT location_id FROM user_allowed_locations WHERE company_id=? AND user_company_id=? AND status='active' ORDER BY location_id", Long.class, user.companyId(), id);
        var assignments = new ArrayList<AssignmentView>();
        for (var row : jdbc.queryForList("SELECT a.template_id,t.name AS template_name,a.effective_start_date,a.effective_end_date,a.status FROM user_schedule_assignments a JOIN attendance_schedule_templates t ON t.company_id=a.company_id AND t.id=a.template_id WHERE a.company_id=? AND a.user_company_id=? AND a.status='active' ORDER BY a.id", user.companyId(), id))
            assignments.add(new AssignmentView(id, calendar.employeeName(), number(row.get("template_id")), text(row.get("template_name")), null, "", text(row.get("effective_start_date")), text(row.get("effective_end_date")), text(row.get("status"))));
        for (var row : jdbc.queryForList("SELECT a.location_id,l.name AS location_name,a.effective_start_date,a.effective_end_date,a.status FROM user_work_site_assignments a JOIN attendance_locations l ON l.company_id=a.company_id AND l.id=a.location_id WHERE a.company_id=? AND a.user_company_id=? AND a.status='active' ORDER BY a.id", user.companyId(), id))
            assignments.add(new AssignmentView(id, calendar.employeeName(), null, "", number(row.get("location_id")), text(row.get("location_name")), text(row.get("effective_start_date")), text(row.get("effective_end_date")), text(row.get("status"))));
        return new MemberState(id, calendar.employeeName(), text(status), locations, List.copyOf(assignments));
    }
    private void lock(AuthSessionUser user, HrAssistantContracts.Change request) {
        var c = request.attendance();
        if (request.id() != null) {
            String table = c.schedule() != null ? "attendance_schedule_templates" : "attendance_locations";
            if (jdbc.queryForList("SELECT id FROM " + table + " WHERE company_id=? AND id=? FOR UPDATE", Long.class, user.companyId(), request.id()).isEmpty()) throw new NoSuchElementException("Attendance object not found.");
        }
        var ids = c.restPlan()!=null?c.restPlan().assignments().stream().map(RestAssignment::userCompanyId).toList():c.assignment() != null ? c.assignment().userCompanyIds() : c.correction() != null ? List.of(c.correction().userCompanyId()) : c.allowedLocations() != null ? List.of(c.allowedLocations().userCompanyId()) : c.manualEvent() != null ? List.of(c.manualEvent().userCompanyId()) : List.<Long>of();
        for (var id : ids.stream().sorted().toList()) if (jdbc.queryForList("SELECT id FROM user_companies WHERE company_id=? AND id=? FOR UPDATE", Long.class, user.companyId(), id).isEmpty()) throw new NoSuchElementException("Employee not found.");
        if (c.assignment() != null && c.assignment().locationId() != null) jdbc.queryForList("SELECT id FROM attendance_locations WHERE company_id=? AND id=? FOR UPDATE", Long.class, user.companyId(), c.assignment().locationId());
    }
    private static void requireFields(String action, HrAssistantContracts.Change request) {
        if (request == null || request.attendance() == null || !ACTIONS.contains(action) || request.employee()!=null || request.employees()!=null || request.asset()!=null || request.announcement()!=null || request.termination()!=null || request.assignment()!=null || request.record()!=null || request.permission()!=null || request.incentive()!=null||request.payroll()!=null) throw new IllegalArgumentException("Administrative attendance details required.");
        var c = request.attendance();
        boolean schedule = Set.of("create_hr_schedule","update_hr_schedule").contains(action), location = Set.of("create_hr_location","update_hr_location").contains(action), assignment = Set.of("assign_hr_schedule","assign_hr_work_site","clear_hr_work_assignments").contains(action);
        if ((c.schedule()!=null)!=schedule || (c.location()!=null)!=location || (c.assignment()!=null)!=assignment || (c.correction()!=null)!=action.equals("correct_hr_attendance") || (c.allowedLocations()!=null)!=action.equals("set_hr_allowed_locations") || (c.manualEvent()!=null)!=action.equals("record_hr_attendance_event") || (c.restPlan()!=null)!=action.equals("assign_hr_rest_days") || (request.id()!=null)!=action.startsWith("update_") || request.id()!=null&&request.id()<1) throw new IllegalArgumentException("Fields do not belong to this attendance action.");
        if(c.restPlan()!=null) {
            var plan=c.restPlan();if(plan.assignments()==null||plan.assignments().isEmpty()||plan.assignments().size()>100||plan.notes()!=null&&plan.notes().length()>2000)throw new IllegalArgumentException("Rest plan accepts 1 to 100 collaborators and notes up to 2000 characters.");
            var seen=new HashSet<Long>();int total=0;for(var a:plan.assignments()){if(a.userCompanyId()<1||!seen.add(a.userCompanyId())||a.dates()==null||a.dates().isEmpty()||a.dates().size()>62||a.dates().stream().anyMatch(Objects::isNull)||new HashSet<>(a.dates()).size()!=a.dates().size())throw new IllegalArgumentException("Rest dates must be complete and unique for each collaborator.");total+=a.dates().size();}
            if(total>250)throw new IllegalArgumentException("Confirm at most 250 collaborator-days per rest plan.");
        }
        if (schedule && (c.schedule().name()==null || c.schedule().name().length()>160 || c.schedule().days()==null || c.schedule().days().isEmpty() || c.schedule().days().size()>7)) throw new IllegalArgumentException("A name and 1 to 7 day rules are required.");
        if (location && (c.location().name()==null || c.location().name().length()>160 || c.location().latitude()==null || c.location().longitude()==null || c.location().latitude().abs().compareTo(java.math.BigDecimal.valueOf(90))>0 || c.location().longitude().abs().compareTo(java.math.BigDecimal.valueOf(180))>0)) throw new IllegalArgumentException("A name and valid coordinates are required.");
        if (assignment) {
            var a = c.assignment(); validateIds(a.userCompanyIds(), 100, false);
            if (a.startDate()==null || a.endDate()!=null&&a.endDate().isBefore(a.startDate())) throw new IllegalArgumentException("A valid explicit assignment date range is required.");
            if (action.equals("assign_hr_schedule") && (a.templateId()==null||a.templateId()<1||a.locationId()!=null) || action.equals("assign_hr_work_site") && (a.locationId()==null||a.locationId()<1||a.userCompanyIds().size()!=1) || action.equals("clear_hr_work_assignments") && (a.locationId()!=null||a.templateId()!=null||a.endDate()!=null||a.userCompanyIds().size()!=1)) throw new IllegalArgumentException("Invalid schedule or work site assignment fields.");
        }
        if (c.correction()!=null) {
            var x = c.correction(); if(x.userCompanyId()<1||x.dates()==null||x.dates().isEmpty()||x.dates().size()>62||x.dates().stream().anyMatch(Objects::isNull)||new HashSet<>(x.dates()).size()!=x.dates().size()||x.notes()!=null&&x.notes().length()>2000) throw new IllegalArgumentException("Positive employee and 1 to 62 distinct dates required.");
        }
        if (c.allowedLocations()!=null) { if(c.allowedLocations().userCompanyId()<1) throw new IllegalArgumentException("Positive employee required."); validateIds(c.allowedLocations().locationIds(),100,true); }
        if (c.manualEvent()!=null && (c.manualEvent().userCompanyId()<1||c.manualEvent().date()==null||c.manualEvent().timestamp()==null||c.manualEvent().notes()!=null&&c.manualEvent().notes().length()>2000)) throw new IllegalArgumentException("Employee, date and explicit event timestamp required.");
    }
    private static void validateIds(List<Long> ids, int max, boolean emptyAllowed) {
        if(ids==null||!emptyAllowed&&ids.isEmpty()||ids.size()>max||ids.stream().anyMatch(id->id==null||id<1)||new HashSet<>(ids).size()!=ids.size()) throw new IllegalArgumentException("Distinct positive references within the allowed batch size required.");
    }
    private static Map<String,Object> schedulePayload(ScheduleChange c) {
        var p = new LinkedHashMap<String,Object>(); put(p,"name",c.name()); put(p,"status",c.status()); put(p,"schedule_mode",c.mode()); put(p,"enforce_location",c.enforceLocation()); put(p,"location_id",c.locationId());
        p.put("days", c.days().stream().map(d->{ var row=new LinkedHashMap<String,Object>(); put(row,"day_of_week",d.dayOfWeek()); put(row,"start_time",d.startTime()); put(row,"end_time",d.endTime()); put(row,"meal_minutes",d.mealMinutes()); put(row,"rest_minutes",d.restMinutes()); put(row,"late_after_minutes",d.lateAfterMinutes()); put(row,"is_rest_day",d.restDay()); return row; }).toList()); return p;
    }
    private static Map<String,Object> locationPayload(LocationChange c) {
        var p = new LinkedHashMap<String,Object>(); put(p,"name",c.name()); put(p,"latitude",c.latitude()); put(p,"longitude",c.longitude()); put(p,"radius_meters",c.radiusMeters()); put(p,"contract_start_date",c.contractStartDate()); put(p,"contract_end_date",c.contractEndDate()); put(p,"required_start_time",c.requiredStartTime()); put(p,"required_end_time",c.requiredEndTime()); put(p,"required_hours_per_day",c.requiredHoursPerDay()); put(p,"required_days_per_week",c.requiredDaysPerWeek()); put(p,"unit_id",c.unitId()); put(p,"business_id",c.businessId()); put(p,"status",c.status()); return p;
    }
    private static Map<String,Object> assignmentPayload(AssignmentChange c) {
        var p = new LinkedHashMap<String,Object>(); put(p,"template_id",c.templateId()); put(p,"location_id",c.locationId()); put(p,"user_company_ids",c.userCompanyIds()); put(p,"effective_start_date",c.startDate()); put(p,"effective_end_date",c.endDate()); return p;
    }
    private static Map<String,Object> restPayload(RestPlan plan){var p=new LinkedHashMap<String,Object>();p.put("notes",plan.notes());p.put("assignments",plan.assignments().stream().map(a->Map.of("user_company_id",a.userCompanyId(),"dates",a.dates().stream().map(LocalDate::toString).toList())).toList());return p;}
    private static Map<String,Object> manualPayload(ManualEventChange c) { var p=new LinkedHashMap<String,Object>(); put(p,"event_kind",c.kind()); put(p,"event_timestamp",c.timestamp()); put(p,"notes",c.notes()); return p; }
    private static DayView day(AuthSessionUser user,long id,String name,Map<String,Object> d) {
        var rule=map(d.get("schedule_rule")); ScheduleView schedule=null;
        if(!rule.isEmpty()) schedule=new ScheduleView(number(rule.get("template_id")),"","",text(rule.get("schedule_mode")),Boolean.TRUE.equals(rule.get("enforce_location")),number(rule.get("location_id")),text(rule.get("location_name")),0,List.of(new DayRule(LocalDate.parse(text(d.get("date"))).getDayOfWeek().getValue(),text(rule.get("start_time")),text(rule.get("end_time")),integer(rule.get("meal_minutes")),integer(rule.get("rest_minutes")),integer(rule.get("late_after_minutes")),Boolean.TRUE.equals(rule.get("is_rest_day")))));
        var site=map(d.get("active_work_site"));
        return new DayView(id,name,LocalDate.parse(text(d.get("date"))),text(d.get("system_status")),text(d.get("corrected_status")),text(d.get("effective_status")),Boolean.TRUE.equals(d.get("attendance_editable")),text(d.get("edit_lock_reason")),text(d.get("first_check_in_at")),text(d.get("last_check_out_at")),integer(d.get("minutes_late")),text(d.get("notes")),schedule,site.isEmpty()?null:location(map(site.get("location"))));
    }
    private static ScheduleView schedule(Map<String,Object> s) { return new ScheduleView(number(s.get("id")),text(s.get("name")),text(s.get("status")),text(s.get("schedule_mode")),Boolean.TRUE.equals(s.get("enforce_location")),number(s.get("location_id")),text(s.get("location_name")),integer(s.get("users_assigned_count")),rows(s.get("days")).stream().map(d->new DayRule(integer(d.get("day_of_week")),text(d.get("start_time")),text(d.get("end_time")),integer(d.get("meal_minutes")),integer(d.get("rest_minutes")),integer(d.get("late_after_minutes")),Boolean.TRUE.equals(d.get("is_rest_day")))).toList()); }
    private static LocationView location(LocationRow l) { return location(com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap(l)); }
    private static LocationView location(Map<String,Object> l) { return new LocationView(number(l.get("id")),text(l.get("name")),number(l.get("unit_id")),text(l.get("unit_name")),number(l.get("business_id")),text(l.get("business_name")),text(l.get("contract_start_date")),text(l.get("contract_end_date")),decimal(l.get("latitude")),decimal(l.get("longitude")),integer(l.get("radius_meters")),decimal(l.get("required_hours_per_day")),text(l.get("required_start_time")),text(l.get("required_end_time")),integer(l.get("required_days_per_week")),text(l.get("status")),integer(l.get("assigned_user_count"))); }
    private static <T> HrAssistantContracts.Page<T> paginate(AuthSessionUser user,String tool,HrAssistantContracts.PageRequest p,List<T> rows,java.util.function.Function<T,String> name,java.util.function.Function<T,String> status) {
        if(p!=null&&(p.unitId()!=null||p.businessId()!=null)) throw new IllegalArgumentException("Attendance configuration follows the current owner organization scope; use query and status filters.");
        var window=HrAssistantPages.window(user,tool,p);
        var filtered=rows.stream().filter(r->p==null||p.query()==null||name.apply(r).toLowerCase(Locale.ROOT).contains(p.query().toLowerCase(Locale.ROOT))).filter(r->p==null||p.status()==null||status.apply(r).equals(p.status())).toList();
        int start=(int)Math.min((long)(window.page()-1)*window.size(),filtered.size()); return window.result(filtered.subList(start,Math.min(start+window.size(),filtered.size())),filtered.size());
    }
    private static void put(Map<String,Object> p,String key,Object value) { HrAssistantPayload.put(p,key,value); }
    private static String text(Object value) { return value==null?"":value.toString(); }
    private static Long number(Object value) { return value instanceof Number n?n.longValue():null; }
    private static int integer(Object value) { return value instanceof Number n?n.intValue():0; }
    private static java.math.BigDecimal decimal(Object value) { return value instanceof java.math.BigDecimal d?d:value instanceof Number n?new java.math.BigDecimal(n.toString()):null; }
    private static Map<String,Object> map(Object value) { var result=new LinkedHashMap<String,Object>(); if(value instanceof Map<?,?> m)m.forEach((key,v)->{if(key instanceof String s)result.put(s,v);}); return result; }
    private static List<Map<String,Object>> rows(Object value) { return value instanceof List<?> list?list.stream().map(HrAssistantAttendanceService::map).toList():List.of(); }
}
