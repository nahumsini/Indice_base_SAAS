package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class OperationalNotificationSyncService {

    private final ExpenseNotificationSyncService expenseSyncService;
    private final PosNotificationSyncService posSyncService;
    private final SalesNotificationSyncService salesSyncService;

    OperationalNotificationSyncService(
            ExpenseNotificationSyncService expenseSyncService,
            PosNotificationSyncService posSyncService,
            SalesNotificationSyncService salesSyncService) {
        this.expenseSyncService = expenseSyncService;
        this.posSyncService = posSyncService;
        this.salesSyncService = salesSyncService;
    }

    @Transactional
    void sync(HrAnnouncementActor actor) {
        // This management scope is operational; HR management permission is unrelated.
        var operationalActor=actor.withManagementAccess(NotificationAccessService.management(actor));
        expenseSyncService.sync(operationalActor);
        posSyncService.sync(operationalActor);
        salesSyncService.sync(operationalActor);
    }
}
