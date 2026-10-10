package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.tasks.ProcessTaskMaintenanceContract;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;

@Service
public class MaintenanceTaskService {
    private final MaintenanceRepository db;private final MaintenanceAccess access;private final ProcessTaskMaintenanceContract tasks;
    public MaintenanceTaskService(MaintenanceRepository db,MaintenanceAccess access,ProcessTaskMaintenanceContract tasks){this.db=db;this.access=access;this.tasks=tasks;}
    @Transactional public OrderDetail create(AuthSessionUser actor,long id,long expected){
        actor=access.lock(actor,"orders");MaintenanceAccess.manage(actor);var order=db.order(actor,id);
        var existing=db.jdbc().queryForList("SELECT task_id FROM maintenance_task_links WHERE company_id=? AND order_id=?",Long.class,actor.companyId(),id);
        if(!existing.isEmpty()){tasks.read(actor,existing.getFirst());return db.detail(actor,id);}
        version(order.version(),expected);require(!TERMINAL.contains(order.status())&&order.assigneeId()!=null,"maintenance_assignee_required");
        var task=tasks.create(actor,order.title(),order.assigneeId(),order.dueAt().atZone(ZoneId.of(order.timezone())).toLocalDate());
        db.jdbc().update("INSERT INTO maintenance_task_links(company_id,order_id,task_id) VALUES(?,?,?)",actor.companyId(),id,task.id());db.jdbc().update("UPDATE maintenance_orders SET version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);db.audit(actor,"ORDER",id,"TASK_LINKED",task.folio());return db.detail(actor,id);
    }
}
