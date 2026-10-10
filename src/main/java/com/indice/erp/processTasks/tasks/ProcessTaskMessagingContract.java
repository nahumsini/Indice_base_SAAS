package com.indice.erp.processTasks.tasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Task-owner port for a personal follow-up explicitly captured in a conversation. */
@Service
public class ProcessTaskMessagingContract {
    public record TaskLink(long id,String folio,String title,String status,String dueDate) {
        @Override public String toString() { return "TaskLink[id="+id+"]"; }
    }
    private final ProcessTasksService tasks;
    private final ProcessTaskAssistantService scope;
    private final ProcessTaskKioskService kiosks;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    public ProcessTaskMessagingContract(ProcessTasksService tasks,ProcessTaskAssistantService scope,
            ProcessTaskKioskService kiosks,ModuleAccessService modules,TabPermissionAccessService tabs) {
        this.tasks=tasks;this.scope=scope;this.kiosks=kiosks;this.modules=modules;this.tabs=tabs;
    }
    public boolean allowed(AuthSessionUser actor) {
        return modules.canAccess(actor,"processes")
            && tabs.canAccess(actor,new TabPermissionRequirement(List.of("processes.calendar")));
    }
    @Transactional
    public TaskLink create(AuthSessionUser actor,KioskResolvedDefinition definition,String title,LocalDate due) {
        if(!allowed(actor) || !modules.companyCanAccessForMutation(actor.companyId(),"processes")) throw new SecurityException();
        var payload=new LinkedHashMap<String,Object>();
        payload.put("title",title);payload.put("priority","medium");payload.put("status","pending");
        if(due!=null) payload.put("dueDate",due.toString());
        if(definition!=null) {
            if(definition.companyId()!=actor.companyId()) throw new SecurityException();
            var result=kiosks.employeeCreateTask(definition,actor.userId(),payload);
            @SuppressWarnings("unchecked") var task=(Map<String,Object>)result.get("task");
            return project(task);
        }
        var assignment=scope.creationAssignment(actor.companyId(),actor.userId(),actor.userCompanyId());
        payload.put("assignedUserCompanyId",assignment.userCompanyId());payload.put("assignedName",assignment.name());
        payload.put("unitId",assignment.unitId());payload.put("businessId",assignment.businessId());
        return project(tasks.createTask(actor.companyId(),actor.userId(),payload));
    }
    public TaskLink read(AuthSessionUser actor,long taskId) {
        if(!allowed(actor)) throw new SecurityException();
        return project(scope.snapshot(actor.companyId(),actor.userId(),taskId).task());
    }
    private static TaskLink project(Map<String,Object> task) {
        var due=task.containsKey("dueDate")?task.get("dueDate"):task.get("due_date");
        return new TaskLink(((Number)task.get("id")).longValue(),String.valueOf(task.getOrDefault("folio","")),
            String.valueOf(task.get("title")),String.valueOf(task.get("status")),due==null?null:String.valueOf(due));
    }
}
