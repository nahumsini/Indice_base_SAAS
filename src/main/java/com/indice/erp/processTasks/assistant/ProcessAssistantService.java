package com.indice.erp.processTasks.assistant;

import static com.indice.erp.processTasks.assistant.ProcessAssistantContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.projects.ProjectsService;
import com.indice.erp.processTasks.processes.ProcessesService;
import com.indice.erp.processTasks.processes.ProcessRunsService;
import com.indice.erp.processTasks.processes.ProcessRunContracts.*;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Delegates lifecycle and task generation to the existing project/process owners. */
@Service
public class ProcessAssistantService {
    public static final Set<String> READS=Set.of("list_projects","get_project","list_processes","get_process",
        "list_process_collaborators","list_process_runs","get_process_run","get_process_version");
    public static final Set<String> ACTIONS=Set.of("create_project","update_project","complete_project","cancel_project","archive_project",
        "create_process","update_process","pause_process","archive_process","generate_process_tasks","create_process_run");
    private final ProjectsService projects;
    private final ProcessesService processes;
    private final ProcessRunsService runs;
    private final ProcessTaskAssignmentScopeService scope;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public ProcessAssistantService(ProjectsService projects,ProcessesService processes,ProcessRunsService runs,
        ProcessTaskAssignmentScopeService scope,JdbcTemplate jdbc,ObjectMapper mapper){
        this.projects=projects;this.processes=processes;this.runs=runs;this.scope=scope;this.jdbc=jdbc;
        this.mapper=mapper.copy().disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
    public Page<ProjectView> projects(AuthSessionUser user,PageRequest request){
        var window=ProcessAssistantPages.window(user,"projects",request);
        var items=rows(projects.listProjects(user.companyId())).stream().map(this::projectView)
            .filter(item->projectVisible(user,item.configuration())).filter(item->matches(request,item.configuration().name(),item.configuration().status(),item.configuration().unitId(),item.configuration().businessId())).toList();
        return window.slice(items);
    }
    public ProjectView project(AuthSessionUser user,long id){
        var result=projectView(projects.getProject(user.companyId(),positive(id)));
        requireProjectScope(user,result.configuration());return result;
    }
    public Page<ProcessView> processes(AuthSessionUser user,PageRequest request){
        // Definitions are a shared company pool. Optional filters select, never redefine ownership.
        var window=ProcessAssistantPages.window(user,"processes",request);
        var items=rows(processes.listProcesses(user.companyId(),user.userId())).stream().map(this::processView)
            .filter(item->matches(request,item.configuration().title(),item.configuration().isActive()?"active":"paused",item.configuration().unitId(),item.configuration().businessId())).toList();
        return window.slice(items);
    }
    public ProcessView process(AuthSessionUser user,long id){return processView(processes.getProcess(user.companyId(),positive(id)));}
    public Page<Collaborator> collaborators(AuthSessionUser user,PageRequest request){
        if(request!=null&&request.status()!=null&&!request.status().equals("active"))throw new IllegalArgumentException("Only active collaborator candidates are available.");
        var window=ProcessAssistantPages.window(user,"collaborators",request);
        var items=processes.listCollaborators(user.companyId()).items().stream()
            .map(c->new Collaborator(c.userCompanyId(),c.name(),c.unitId(),c.unitName(),c.businessId(),c.businessName()))
            .filter(c->matches(request,c.name(),"active",c.unitId(),c.businessId())).toList();
        return window.slice(items);
    }
    public Page<ProcessRunView> runs(AuthSessionUser user,long processId,PageRequest request){
        process(user,processId);
        if(request!=null&&(request.unitId()!=null||request.businessId()!=null))throw new IllegalArgumentException("Run filters use their process, reference and status.");
        var window=ProcessAssistantPages.window(user,"runs:"+processId,request);
        // No LIMIT 200 truncation from the legacy UI response.
        var ids=jdbc.query("SELECT id FROM process_runs WHERE company_id=? AND process_id=? ORDER BY created_at DESC,id DESC",(rs,n)->rs.getLong(1),user.companyId(),processId);
        var items=ids.stream().map(id->runs.getRun(user.companyId(),id))
            .filter(r->matches(request,r.reference(),r.status(),null,null)).toList();
        return window.slice(items);
    }
    public ProcessRunView run(AuthSessionUser user,long id){return runs.getRun(user.companyId(),positive(id));}
    public VersionView version(AuthSessionUser user,long id,int version){
        if(version<1)throw new IllegalArgumentException("Positive published version required.");
        process(user,id);
        var versions=jdbc.queryForList("SELECT * FROM process_versions WHERE company_id=? AND process_id=? AND version_number=?",user.companyId(),id,version);
        if(versions.isEmpty())throw new NoSuchElementException("Published version not found.");
        var v=versions.getFirst();long versionId=((Number)v.get("id")).longValue();
        var templates=jdbc.queryForList("SELECT * FROM process_task_templates WHERE company_id=? AND process_version_id=? ORDER BY position_number,id",user.companyId(),versionId);
        var result=new ArrayList<Template>();
        for(var t:templates){
            var assignees=jdbc.query("SELECT user_company_id FROM process_task_template_assignees WHERE company_id=? AND template_id=? ORDER BY position_number,id",(rs,n)->rs.getLong(1),user.companyId(),t.get("id"));
            result.add(new Template(str(t,"title"),str(t,"description"),str(t,"notes"),str(t,"priority"),number(t,"unit_id"),number(t,"business_id"),integer(t,"stage_number"),integer(t,"scheduled_offset_days"),integer(t,"deadline_offset_days"),bool(t,"evidence_required"),assignees));
        }
        return new VersionView(id,version,str(v,"title"),str(v,"description"),str(v,"distribution_mode"),str(v,"activation_mode"),str(v,"organization_mode"),bool(v,"include_weekends"),number(v,"coordinator_user_company_id"),str(v,"frequency"),recurrence(v.get("recurrence_json")),date(v.get("start_date")),date(v.get("end_date")),List.copyOf(result));
    }
    public Prepared prepare(AuthSessionUser user,String action,Change input){
        if(!ACTIONS.contains(action)||input==null)throw new IllegalArgumentException("A supported workflow change required.");
        boolean projectAction=action.endsWith("_project");
        boolean create=action.startsWith("create_")&&!action.equals("create_process_run");
        if(create?input.id()!=null:input.id()==null||input.id()<1)throw new IllegalArgumentException("Object identity does not match this action.");
        if(projectAction?(input.process()!=null||input.run()!=null):(input.project()!=null))throw new IllegalArgumentException("Unrelated workflow fields.");
        if(!Set.of("create_project","update_project").contains(action)&&input.project()!=null)throw new IllegalArgumentException("Project payload is not used by this action.");
        if(!Set.of("create_process","update_process").contains(action)&&input.process()!=null)throw new IllegalArgumentException("Process payload is not used by this action.");
        if(!action.equals("create_process_run")&&input.run()!=null)throw new IllegalArgumentException("Run payload is not used by this action.");
        Result before=Result.empty(),after=Result.empty(); Change normalized=input;
        if(projectAction){
            ProjectView old=create?null:project(user,input.id());
            before=new Result(old,null,null,null,List.of(),false);
            if(Set.of("create_project","update_project").contains(action)){
                if(input.project()==null)throw new IllegalArgumentException("Project configuration required.");
                validateProjectText(input.project());
                var draft=projects.validateAssistantProject(user.companyId(),payload(input.project()));
                var c=new ProjectChange(draft.name(),draft.description(),draft.status(),draft.priority(),draft.ownerUserCompanyId(),draft.ownerName(),draft.unitId(),draft.businessId(),draft.startDate(),draft.dueDate());
                requireProjectScope(user,c);requireReferences(user,c.unitId(),c.businessId());
                if(c.ownerUserCompanyId()!=null)scope.requireCanAssign(user.companyId(),user.userId(),c.unitId(),c.businessId(),c.ownerUserCompanyId());
                normalized=new Change(input.id(),c,null,null);
                after=new Result(new ProjectView(old==null?0:old.id(),old==null?null:old.folio(),c,null,null,old==null?0:old.taskCount(),old==null?0:old.openTaskCount(),old==null?0:old.completedTaskCount(),old==null?0:old.overdueTaskCount(),old==null?0:old.auditedTaskCount(),old==null?0:old.completionPercent(),null),null,null,null,List.of(),false);
            }else{
                var c=old.configuration();var status=action.equals("complete_project")?"completed":action.equals("cancel_project")?"cancelled":c.status();
                var next=new ProjectChange(c.name(),c.description(),status,c.priority(),c.ownerUserCompanyId(),c.ownerName(),c.unitId(),c.businessId(),c.startDate(),c.dueDate());
                after=new Result(new ProjectView(old.id(),old.folio(),next,old.unitName(),old.businessName(),old.taskCount(),old.openTaskCount(),old.completedTaskCount(),old.overdueTaskCount(),old.auditedTaskCount(),old.completionPercent(),null),null,null,null,List.of(),action.equals("archive_project"));
            }
        }else{
            ProcessView old=create?null:process(user,input.id());
            before=new Result(null,old,null,null,List.of(),false);
            if(Set.of("create_process","update_process").contains(action)){
                if(input.process()==null)throw new IllegalArgumentException("Complete process configuration required.");
                validateProcess(input.process());
                var draft=processes.prepareAssistantDefinition(user.companyId(),create?user.userId():null,create?user.userName():null,input.id(),payload(input.process()));
                var config=normalizedProcess(draft,input.process().recurrence());
                normalized=new Change(input.id(),null,config,null);
                var planned=plans(user,processes.assistantOccurrenceDates(user.companyId(),input.id(),draft),config);
                after=new Result(null,new ProcessView(old==null?0:old.id(),old==null?null:old.folio(),old==null?1:old.currentVersion()+1,config,draft.relationCommand().unitName(),draft.relationCommand().businessName(),null,draft.relationCommand().responsibleName(),old==null?0:old.taskCount(),null),null,null,planned,false);
            }else if(action.equals("create_process_run")){
                if(input.run()==null||input.run().startDate()==null)throw new IllegalArgumentException("Reference and explicit run start date required.");
                text(input.run().reference(),200,true);text(input.run().notes(),2000,false);
                var preview=runs.previewOccasionalRun(user.companyId(),new OccasionalPreviewRequest(old.id(),input.run().reference(),input.run().startDate()));
                normalized=new Change(input.id(),null,null,new RunChange(preview.reference(),preview.startDate(),input.run().notes(),input.run().allowDuplicateReference()));
                after=new Result(null,old,null,preview,List.of(),false);
            }else if(action.equals("generate_process_tasks")){
                if(!old.configuration().isActive()||!old.configuration().activationMode().equals("recurring"))throw new IllegalArgumentException("An active recurring process required.");
                after=new Result(null,old,null,null,plans(user,processes.assistantCurrentOccurrenceDates(user.companyId(),old.id()),old.configuration()),false);
            }else{
                var config=old.configuration();
                if(action.equals("pause_process"))config=new ProcessChange(config.title(),config.description(),config.frequency(),config.priority(),config.unitId(),config.businessId(),config.responsibleUserCompanyId(),config.coordinatorUserCompanyId(),config.distributionMode(),config.activationMode(),config.organizationMode(),config.includeWeekends(),false,config.startDate(),config.endDate(),config.graceDays(),config.generationWindowDays(),config.evidenceRequired(),config.recurrence(),config.taskTemplates());
                after=new Result(null,new ProcessView(old.id(),old.folio(),old.currentVersion(),config,old.unitName(),old.businessName(),old.coordinatorName(),old.responsibleName(),old.taskCount(),null),null,null,List.of(),action.equals("archive_process"));
            }
        }
        // Planned assignees and dates are part of the immutable version comparison, including new objects.
        return new Prepared(action,normalized,hash(json(List.of(before,after))),before,after);
    }
    public Result execute(AuthSessionUser user,Prepared confirmed,String correlation){
        if(confirmed.change().id()!=null){
            var table=confirmed.action().endsWith("_project")?"projects":"processes";
            var locked=jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE",user.companyId(),confirmed.change().id());
            if(locked.isEmpty())throw new NoSuchElementException("Workflow object not found.");
        }
        // Serialize recipient organization/status changes with existing HR owner mutations.
        var members=new TreeSet<Long>();
        if(confirmed.change().project()!=null&&confirmed.change().project().ownerUserCompanyId()!=null)members.add(confirmed.change().project().ownerUserCompanyId());
        ProcessChange configuration=confirmed.after().process()==null?null:confirmed.after().process().configuration();
        if(configuration!=null){if(configuration.coordinatorUserCompanyId()!=null)members.add(configuration.coordinatorUserCompanyId());if(configuration.responsibleUserCompanyId()!=null)members.add(configuration.responsibleUserCompanyId());configuration.taskTemplates().forEach(t->members.addAll(t.assigneeUserCompanyIds()));}
        for(var id:members)jdbc.queryForList("SELECT id FROM user_companies WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),id);
        var fresh=prepare(user,confirmed.action(),confirmed.change());
        if(!fresh.version().equals(confirmed.version())||!mapper.valueToTree(fresh.change()).equals(mapper.valueToTree(confirmed.change())))throw new IllegalStateException("workflow_preparation_changed");
        var id=confirmed.change().id();
        return switch(confirmed.action()){
            case "create_project" -> result(projectView(projects.createProject(user.companyId(),user.userId(),payload(fresh.change().project()))));
            case "update_project" -> result(projectView(projects.updateProject(user.companyId(),id,payload(fresh.change().project()))));
            case "complete_project" -> result(projectView(projects.completeProject(user.companyId(),id)));
            case "cancel_project" -> result(projectView(projects.cancelProject(user.companyId(),id)));
            case "archive_project" -> {projects.deleteProject(user.companyId(),id);yield fresh.after();}
            case "create_process" -> result(processView(processes.createProcess(user.companyId(),user.userId(),user.userName(),payload(fresh.change().process()))));
            case "update_process" -> result(processView(processes.updateProcess(user.companyId(),user.userId(),id,payload(fresh.change().process()))));
            case "pause_process" -> {processes.setAssistantActive(user.companyId(),id,false);yield result(process(user,id));}
            case "archive_process" -> {processes.deleteProcess(user.companyId(),user.userId(),id);yield fresh.after();}
            case "generate_process_tasks" -> {processes.materializeProcess(user.companyId(),user.userId(),id);yield result(process(user,id));}
            case "create_process_run" -> {var c=fresh.change().run();var run=runs.createOccasionalRun(user.companyId(),user.userId(),new OccasionalRunRequest(id,c.reference(),c.startDate(),c.notes(),c.allowDuplicateReference()),"ai:"+correlation);yield new Result(null,process(user,id),run,null,List.of(),false);}
            default -> throw new IllegalArgumentException("Unsupported process action.");
        };
    }
    public void requireResultAccess(AuthSessionUser user,Result result){
        if(result.project()!=null){if(result.archived())requireArchived(user,"projects",result.project().id());else project(user,result.project().id());}
        if(result.process()!=null){if(result.archived())requireArchived(user,"processes",result.process().id());else process(user,result.process().id());}
        if(result.run()!=null)run(user,result.run().id());
    }
    private void requireArchived(AuthSessionUser user,String table,long id){
        var count=jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=? AND id=?",Integer.class,user.companyId(),id);
        if(count==null||count!=1)throw new NoSuchElementException("Archived object not found.");
        if(table.equals("projects")){var row=jdbc.queryForMap("SELECT unit_id,business_id FROM projects WHERE company_id=? AND id=?",user.companyId(),id);scope.requireCanAssign(user.companyId(),user.userId(),number(row,"unit_id"),number(row,"business_id"),null);}
    }
    private List<PlannedRun> plans(AuthSessionUser user,List<LocalDate> dates,ProcessChange configuration){
        if((long)dates.size()*configuration.taskTemplates().size()>1000)throw new IllegalArgumentException("Generation exceeds 1,000 tasks. Reduce the generation window before confirming.");
        var names=new HashMap<Long,String>();processes.listCollaborators(user.companyId()).items().forEach(c->names.put(c.userCompanyId(),c.name()));
        var result=new ArrayList<PlannedRun>();
        for(var date:dates){var tasks=new ArrayList<PlannedTask>();int position=0;
            for(var template:configuration.taskTemplates()){
                var scheduled=ProcessRunsService.addConfiguredDays(date,template.scheduledOffsetDays(),configuration.includeWeekends());
                var due=ProcessRunsService.addConfiguredDays(scheduled,template.deadlineOffsetDays(),configuration.includeWeekends());
                tasks.add(new PlannedTask(++position,template,scheduled,due,template.assigneeUserCompanyIds().stream().map(id->names.getOrDefault(id,"Inactive collaborator #"+id)).toList()));
            }result.add(new PlannedRun(date,List.copyOf(tasks)));
        }return List.copyOf(result);
    }
    private ProcessChange normalizedProcess(ProcessesService.AssistantDefinition d,Recurrence recurrence){
        var r=d.relationCommand();var c=d.definition();
        var templates=d.templates().stream().map(t->new Template(t.title(),t.description(),t.notes(),t.priority(),t.unitId(),t.businessId(),t.stage(),t.scheduledOffsetDays(),t.deadlineOffsetDays(),t.evidenceRequired(),t.assigneeUserCompanyIds())).toList();
        return new ProcessChange(d.title(),d.description(),d.frequency(),d.priority(),r.unitId(),r.businessId(),r.responsibleUserCompanyId(),c.coordinatorUserCompanyId(),c.distributionMode(),c.activationMode(),c.organizationMode(),c.includeWeekends(),d.isActive(),d.startDate(),d.endDate(),d.graceDays(),d.generationWindowDays(),d.evidenceRequired(),recurrence,templates);
    }
    private ProjectView projectView(Map<String,Object> row){return new ProjectView(((Number)row.get("id")).longValue(),str(row,"folio"),convert(row,ProjectChange.class),str(row,"unitName"),str(row,"businessName"),integer(row,"taskCount"),integer(row,"openTaskCount"),integer(row,"completedTaskCount"),integer(row,"overdueTaskCount"),integer(row,"auditedTaskCount"),integer(row,"completionPercent"),str(row,"updatedAt"));}
    private ProcessView processView(Map<String,Object> row){return new ProcessView(((Number)row.get("id")).longValue(),str(row,"folio"),integer(row,"currentVersion"),convert(row,ProcessChange.class),str(row,"unitName"),str(row,"businessName"),str(row,"coordinator"),str(row,"responsible"),integer(row,"taskCount"),str(row,"updatedAt"));}
    private <T> T convert(Map<String,Object> row,Class<T> type){var selected=new LinkedHashMap<String,Object>();for(var field:type.getRecordComponents())if(row.containsKey(field.getName()))selected.put(field.getName(),row.get(field.getName()));
        if(type==ProcessChange.class&&row.get("taskTemplates") instanceof List<?> list)selected.put("taskTemplates",list.stream().map(item->convert((Map<String,Object>)item,Template.class)).toList());
        return mapper.convertValue(selected,type);
    }
    private Map<String,Object> payload(Object value){return mapper.convertValue(value,new TypeReference<>(){});}
    private Recurrence recurrence(Object value){if(value==null)return null;try{return value instanceof String s?mapper.readValue(s,Recurrence.class):mapper.convertValue(value,Recurrence.class);}catch(Exception e){throw new IllegalStateException("Invalid stored recurrence.",e);}}
    private static Result result(ProjectView p){return new Result(p,null,null,null,List.of(),false);}
    private static Result result(ProcessView p){return new Result(null,p,null,null,List.of(),false);}
    private boolean projectVisible(AuthSessionUser user,ProjectChange c){try{requireProjectScope(user,c);return true;}catch(SecurityException|IllegalArgumentException e){return false;}}
    private void requireProjectScope(AuthSessionUser user,ProjectChange c){scope.requireCanAssign(user.companyId(),user.userId(),c.unitId(),c.businessId(),null);}
    private void requireReferences(AuthSessionUser user,Long unit,Long business){
        if(unit!=null){var count=jdbc.queryForObject("SELECT COUNT(*) FROM units WHERE id=? AND (company_id=? OR company_id IS NULL)",Integer.class,unit,user.companyId());if(count==null||count!=1)throw new NoSuchElementException("Unit not found.");}
        scope.targetScope(user.companyId(),unit,business);
    }
    private static boolean matches(PageRequest p,String name,String status,Long unit,Long business){return p==null||(p.query()==null||name!=null&&name.toLowerCase(Locale.ROOT).contains(p.query().trim().toLowerCase(Locale.ROOT)))&&(p.status()==null||p.status().equals(status))&&(p.unitId()==null||p.unitId().equals(unit))&&(p.businessId()==null||p.businessId().equals(business));}
    private static void validateProjectText(ProjectChange c){text(c.name(),180,true);text(c.description(),10000,false);text(c.ownerName(),180,false);if(c.startDate()!=null&&c.dueDate()!=null&&c.dueDate().isBefore(c.startDate()))throw new IllegalArgumentException("Project due date precedes its start.");}
    private static void validateProcess(ProcessChange c){
        text(c.title(),180,true);text(c.description(),10000,true);
        if(!Set.of("daily","weekly","bi-weekly","monthly","specific-dates").contains(c.frequency())||!Set.of("low","medium","high").contains(c.priority()))throw new IllegalArgumentException("Unsupported recurrence or priority.");
        if(c.startDate()!=null&&c.endDate()!=null&&c.endDate().isBefore(c.startDate()))throw new IllegalArgumentException("Process end precedes its start.");
        if(c.taskTemplates()==null||c.taskTemplates().isEmpty()||c.taskTemplates().size()>50)throw new IllegalArgumentException("One to fifty task templates required.");
        for(var t:c.taskTemplates()){text(t.title(),180,true);text(t.description(),10000,false);text(t.notes(),4000,false);}
    }
    private static void text(String value,int max,boolean required){if(required&&(value==null||value.isBlank())||value!=null&&value.length()>max)throw new IllegalArgumentException("Workflow text exceeds its bounds or is missing.");}
    private static long positive(long id){if(id<1)throw new IllegalArgumentException("Positive object ID required.");return id;}
    @SuppressWarnings("unchecked") private static List<Map<String,Object>> rows(Map<String,Object> result){return (List<Map<String,Object>>)result.get("items");}
    private static String str(Map<String,Object> row,String key){return row.get(key)==null?null:row.get(key).toString();}
    private static int integer(Map<String,Object> row,String key){return row.get(key) instanceof Number n?n.intValue():0;}
    private static Long number(Map<String,Object> row,String key){return row.get(key) instanceof Number n?n.longValue():null;}
    private static boolean bool(Map<String,Object> row,String key){return row.get(key) instanceof Boolean b?b:integer(row,key)!=0;}
    private static LocalDate date(Object value){return value==null?null:LocalDate.parse(value.toString());}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Invalid workflow snapshot.",e);}}
    static String hash(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("SHA-256 unavailable.",e);}}
}
