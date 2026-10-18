package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.notifications.AppNotificationService;
import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.access.module.ModuleAccessService;
import java.time.Clock;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostSaleReminderService {
    private final JdbcTemplate db;
    private final PostSaleWorkspaceRepository repo;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final AppNotificationService notifications;
    private final FinanceBusinessTimeZoneResolver zones;
    private final Clock clock;
    public PostSaleReminderService(JdbcTemplate db,PostSaleWorkspaceRepository repo,ModuleAccessService modules,
            TabPermissionAccessService tabs,AppNotificationService notifications,FinanceBusinessTimeZoneResolver zones,Clock clock) {
        this.db=db;this.repo=repo;this.modules=modules;this.tabs=tabs;this.notifications=notifications;this.zones=zones;this.clock=clock;
    }
    @Transactional
    public void dispatch(long company,long work) {
        repo.lockCompany(company);
        var rows=db.query("""
            SELECT w.source_kind,w.source_id,w.version,w.next_action_date,w.next_action,uc.id,uc.user_id,uc.role
            FROM sales_post_sale_work w JOIN user_companies uc ON uc.company_id=w.company_id AND uc.id=w.owner_user_company_id AND uc.status='active'
            WHERE w.company_id=? AND w.id=? AND w.next_action_date IS NOT NULL
            AND ((w.source_kind='won' AND w.stage_key<>'completed') OR (w.source_kind='lost' AND w.recovery_status='scheduled'))
            """,(rs,n)->new Pending(rs.getString(1),rs.getLong(2),rs.getInt(3),rs.getObject(4,LocalDate.class),rs.getString(5),
                new AuthSessionUser(rs.getLong(7),company,rs.getLong(6),"Post-sale recipient",rs.getString(8))),company,work);
        if(rows.isEmpty())return;
        var row=rows.getFirst();
        if(row.date().isAfter(LocalDate.now(clock.withZone(zones.resolve(company))))||!modules.companyCanAccessForMutation(company,"sales")
            ||!modules.canAccess(row.actor(),"sales")||!tabs.canAccess(row.actor(),TabPermissionRequirement.one("crm.contracts")))return;
        PostSaleWorkspaceDtos.Item item;
        try {item=repo.item(company,row.kind(),row.source());}catch(NoSuchElementException ex){return;}
        String key="sales:post-sale:"+work+":"+row.version();
        if(db.queryForObject("SELECT COUNT(*) FROM app_notifications WHERE company_id=? AND recipient_user_company_id=? AND event_key=?",Integer.class,company,row.actor().userCompanyId(),key)>0)return;
        notifications.publish(new AppNotificationEvent(company,row.actor().userCompanyId(),"sales","post_sale_work",work,"sales_customer_activity",key,
            row.kind().equals("lost")?"Postventa · Revisar recuperación":"Postventa · Seguimiento pendiente",
            item.clientName()+" · "+row.action()+" · "+row.date(),"/sales/after-sales?kind="+row.kind()+"&source="+row.source()));
    }
    private record Pending(String kind,long source,int version,LocalDate date,String action,AuthSessionUser actor) { }
}
