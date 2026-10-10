package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.notifications.*;
import java.time.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Generic private inbox signals; record titles and evidence are resolved only after native authorization. */
@Service
public class MaintenanceNotificationService {
    private final MaintenanceRepository db;private final MaintenanceAccess access;
    private final ModuleAccessService modules;private final AppNotificationService notifications;
    public MaintenanceNotificationService(MaintenanceRepository db,MaintenanceAccess access,ModuleAccessService modules,AppNotificationService notifications){this.db=db;this.access=access;this.modules=modules;this.notifications=notifications;}
    @Transactional public void dispatch(long company,long orderId,boolean changed){
        db.jdbc().queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,company);
        if(!modules.companyCanAccessForMutation(company,"maintenance"))return;
        var recipients=db.jdbc().query("SELECT uc.id,uc.user_id,uc.role FROM maintenance_orders o JOIN user_companies uc ON uc.company_id=o.company_id AND uc.user_id=COALESCE(o.assignee_id,o.created_by) AND uc.status='active' WHERE o.company_id=? AND o.id=? ORDER BY uc.id LIMIT 1",(r,n)->new AuthSessionUser(r.getLong(2),company,r.getLong(1),"Maintenance recipient",r.getString(3)),company,orderId);
        if(recipients.isEmpty())return;var actor=recipients.getFirst();
        try{access.requireTabs(actor,"orders");}catch(org.springframework.web.server.ResponseStatusException denied){return;}
        MaintenanceDtos.Order order;
        try{order=db.order(actor,orderId);}catch(org.springframework.web.server.ResponseStatusException denied){return;}
        if(changed)deliver(actor,orderId,"work_updated",Long.toString(order.version()));
        if(!MaintenancePolicy.TERMINAL.contains(order.status())&&order.dueAt().isBefore(Instant.now()))deliver(actor,orderId,"work_overdue",order.dueAt().toString());
    }
    private void deliver(AuthSessionUser actor,long order,String type,String key){
        if(db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_notification_receipts WHERE company_id=? AND order_id=? AND recipient_user_company_id=? AND event_type=? AND event_key=?",Long.class,actor.companyId(),order,actor.userCompanyId(),type,key)>0)return;
        notifications.publish(new AppNotificationEvent(actor.companyId(),actor.userCompanyId(),"maintenance","work_order",order,type,"maintenance:"+order+":"+type+":"+key,"Maintenance","","/maintenance/orders?order="+order));
        db.jdbc().update("INSERT INTO maintenance_notification_receipts(company_id,order_id,recipient_user_company_id,event_type,event_key) VALUES(?,?,?,?,?)",actor.companyId(),order,actor.userCompanyId(),type,key);
    }
}
