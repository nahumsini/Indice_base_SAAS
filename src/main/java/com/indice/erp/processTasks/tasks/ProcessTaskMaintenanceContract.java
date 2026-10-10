package com.indice.erp.processTasks.tasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit task-owner boundary for a human-approved maintenance work order. */
@Service
public class ProcessTaskMaintenanceContract {
    public record TaskLink(long id,String folio,String title,String status,String dueDate) {
        @Override public String toString(){return "TaskLink[protected]";}
    }
    private final ProcessTasksService tasks;
    private final ProcessTaskAssistantService scope;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final JdbcTemplate db;
    public ProcessTaskMaintenanceContract(ProcessTasksService tasks,ProcessTaskAssistantService scope,
        ModuleAccessService modules,TabPermissionAccessService tabs,JdbcTemplate db){
        this.tasks=tasks;this.scope=scope;this.modules=modules;this.tabs=tabs;this.db=db;
    }
    public boolean allowed(AuthSessionUser actor){
        return modules.canAccess(actor,"processes")&&tabs.canAccess(actor,new TabPermissionRequirement(List.of("processes.calendar")));
    }
    @Transactional
    public TaskLink create(AuthSessionUser actor,String title,long assigneeUserId,LocalDate due){
        if(!allowed(actor)||!modules.companyCanAccessForMutation(actor.companyId(),"processes"))throw new SecurityException();
        var memberships=db.queryForList("SELECT id FROM user_companies WHERE company_id=? AND user_id=? AND status='active' ORDER BY id DESC LIMIT 1",Long.class,actor.companyId(),assigneeUserId);
        if(memberships.isEmpty())throw new IllegalArgumentException("Active assignee required.");
        var assignment=scope.creationAssignment(actor.companyId(),actor.userId(),memberships.getFirst());
        var payload=new LinkedHashMap<String,Object>();
        payload.put("title",title);payload.put("status","pending");payload.put("priority","medium");
        payload.put("assignedUserCompanyId",assignment.userCompanyId());payload.put("assignedName",assignment.name());
        payload.put("unitId",assignment.unitId());payload.put("businessId",assignment.businessId());payload.put("dueDate",due.toString());
        return project(tasks.createTask(actor.companyId(),actor.userId(),payload));
    }
    public TaskLink read(AuthSessionUser actor,long task){
        if(!allowed(actor))throw new SecurityException();
        return project(scope.snapshot(actor.companyId(),actor.userId(),task).task());
    }
    private static TaskLink project(Map<String,Object> task){
        return new TaskLink(((Number)task.get("id")).longValue(),String.valueOf(task.getOrDefault("folio","")),
            String.valueOf(task.get("title")),String.valueOf(task.get("status")),task.get("dueDate")==null?null:String.valueOf(task.get("dueDate")));
    }
}
