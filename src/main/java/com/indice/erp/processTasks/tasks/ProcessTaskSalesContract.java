package com.indice.erp.processTasks.tasks;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Task-owner contract for explicit Sales follow-ups, including authorized delegation. */
@Service
public class ProcessTaskSalesContract {
    public record Assignee(long membershipId,String name) { @Override public String toString(){return "Assignee[redacted]";} }
    public record Task(long id,String folio,String title,String dueDate) { @Override public String toString(){return "Task[redacted]";} }
    private final ProcessTasksService tasks;private final ProcessTaskAssignmentScopeService scope;private final JdbcTemplate db;
    private final SessionAuthService auth;private final ModuleAccessService modules;private final TabPermissionAccessService tabs;
    public ProcessTaskSalesContract(ProcessTasksService tasks,ProcessTaskAssignmentScopeService scope,JdbcTemplate db,SessionAuthService auth,ModuleAccessService modules,TabPermissionAccessService tabs){this.tasks=tasks;this.scope=scope;this.db=db;this.auth=auth;this.modules=modules;this.tabs=tabs;}
    public boolean allowed(AuthSessionUser a){return modules.canAccess(a,"processes")&&tabs.canAccess(a,TabPermissionRequirement.one("processes.calendar"));}
    public List<Assignee> candidates(AuthSessionUser a,Long unit,Long business){if(!allowed(a))throw new SecurityException();
        return db.query("SELECT uc.id,u.full_name FROM user_companies uc JOIN users u ON u.id=uc.user_id WHERE uc.company_id=? AND uc.status='active' ORDER BY u.full_name,uc.id LIMIT 200",(r,n)->new Assignee(r.getLong(1),r.getString(2)),a.companyId()).stream().filter(receiver->{try{authorize(a,receiver.membershipId(),unit,business,false);return true;}catch(RuntimeException denied){return false;}}).toList();
    }
    private void authorize(AuthSessionUser a,long receiver,Long unit,Long business,boolean write){
        if(!allowed(a)||write&&!modules.companyCanAccessForMutation(a.companyId(),"processes"))throw new SecurityException();
        var users=db.query("SELECT user_id FROM user_companies WHERE company_id=? AND id=? AND status='active'",(r,n)->r.getLong(1),a.companyId(),receiver);
        var member=users.stream().findFirst().flatMap(user->auth.scheduledActor(user,a.companyId())).orElseThrow(SecurityException::new);
        if(!Objects.equals(member.userCompanyId(),receiver)||!allowed(member))throw new SecurityException();
        scope.requireCanAssign(a.companyId(),a.userId(),unit,business,receiver);
        scope.requireCanReceive(a.companyId(),unit,business,receiver);
    }
    @Transactional
    public Task create(AuthSessionUser a,long receiver,Long unit,Long business,String title,LocalDate due,String sourceReference){
        authorize(a,receiver,unit,business,true);if(title==null||title.isBlank()||title.length()>220||due==null)throw new IllegalArgumentException("Task title and due date required");
        var payload=new LinkedHashMap<String,Object>();payload.put("title",title);if(sourceReference!=null)payload.put("description",sourceReference);payload.put("dueDate",due.toString());payload.put("priority","medium");payload.put("status","pending");payload.put("assignedUserCompanyId",receiver);payload.put("unitId",unit);payload.put("businessId",business);
        var saved=tasks.createTask(a.companyId(),a.userId(),payload);return new Task(((Number)saved.get("id")).longValue(),Objects.toString(saved.get("folio"),""),Objects.toString(saved.get("title"),""),due.toString());
    }
    public Task read(AuthSessionUser a,long id){if(!allowed(a))throw new SecurityException();scope.requireTaskAccess(a.companyId(),a.userId(),id);
        return db.query("SELECT id,folio,title,due_date FROM process_tasks WHERE company_id=? AND id=? AND deleted_at IS NULL",(r,n)->new Task(r.getLong(1),r.getString(2),r.getString(3),r.getString(4)),a.companyId(),id).stream().findFirst().orElseThrow(NoSuchElementException::new);
    }
}
