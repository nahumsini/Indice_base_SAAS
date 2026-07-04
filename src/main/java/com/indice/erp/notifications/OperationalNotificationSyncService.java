package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.Locale;
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
        if (hasModule(actor, "expenses", "finance")) {
            expenseSyncService.sync(actor);
        }
        if (hasModule(actor, "pos", "point_of_sale")) {
            posSyncService.sync(actor);
        }
        if (hasModule(actor, "sales", "crm")) {
            salesSyncService.sync(actor);
        }
    }

    private boolean hasModule(HrAnnouncementActor actor, String... moduleSlugs) {
        if (actor.moduleSlugs() == null || actor.moduleSlugs().isEmpty()) {
            return true;
        }
        for (var current : actor.moduleSlugs()) {
            var normalized = normalize(current);
            for (var expected : moduleSlugs) {
                if (normalized.equals(normalize(expected))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
