package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.Mockito.*;

class OperationalNotificationSyncServiceTest {
    @Test void operationalManagementDoesNotDependOnHrPermission() {
        var expenses=mock(ExpenseNotificationSyncService.class);
        var pos=mock(PosNotificationSyncService.class);
        var sales=mock(SalesNotificationSyncService.class);
        var actor=new HrAnnouncementActor(7,1,20,"Admin","admin",null,null,"",List.of(),false);
        new OperationalNotificationSyncService(expenses,pos,sales).sync(actor);
        var expected=actor.withManagementAccess(true);
        verify(expenses).sync(expected); verify(pos).sync(expected); verify(sales).sync(expected);
    }

    @Test void emptyModuleListNeverGrantsReadAccessToOperationalData() {
        var db=mock(JdbcTemplate.class);
        var modules=mock(com.indice.erp.access.module.ModuleAccessService.class);
        var tabs=mock(com.indice.erp.access.tab.TabPermissionAccessService.class);
        var access=new NotificationAccessService(null,null,null,modules,tabs,null,null,null,null,List.of());
        var actor=new HrAnnouncementActor(7,1,20,"User","user",null,null,"",List.of(),false);
        // Default false is deliberate: no module/tab grant is not legacy administrator authority.
        new ExpenseNotificationSyncService(db,access).sync(actor);
        new PosNotificationSyncService(db,access).sync(actor);
        new SalesNotificationSyncService(db,access).sync(actor);
        verifyNoInteractions(db);
    }
}
