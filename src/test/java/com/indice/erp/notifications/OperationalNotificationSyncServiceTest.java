package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class OperationalNotificationSyncServiceTest {

    @Test
    void syncDelegatesToEnabledOperationalModules() {
        var expenseSync = mock(ExpenseNotificationSyncService.class);
        var posSync = mock(PosNotificationSyncService.class);
        var salesSync = mock(SalesNotificationSyncService.class);
        var service = new OperationalNotificationSyncService(expenseSync, posSync, salesSync);
        var actor = actor(List.of("expenses", "pos", "sales"));

        service.sync(actor);

        verify(expenseSync).sync(actor);
        verify(posSync).sync(actor);
        verify(salesSync).sync(actor);
    }

    @Test
    void syncAllowsEmptyModuleListForLegacyAdminSessions() {
        var expenseSync = mock(ExpenseNotificationSyncService.class);
        var posSync = mock(PosNotificationSyncService.class);
        var salesSync = mock(SalesNotificationSyncService.class);
        var service = new OperationalNotificationSyncService(expenseSync, posSync, salesSync);
        var actor = actor(List.of());

        service.sync(actor);

        verify(expenseSync).sync(actor);
        verify(posSync).sync(actor);
        verify(salesSync).sync(actor);
    }

    @Test
    void syncSkipsUnavailableModules() {
        var expenseSync = mock(ExpenseNotificationSyncService.class);
        var posSync = mock(PosNotificationSyncService.class);
        var salesSync = mock(SalesNotificationSyncService.class);
        var service = new OperationalNotificationSyncService(expenseSync, posSync, salesSync);
        var actor = actor(List.of("human_resources"));

        service.sync(actor);

        verify(expenseSync, never()).sync(actor);
        verify(posSync, never()).sync(actor);
        verify(salesSync, never()).sync(actor);
    }

    private HrAnnouncementActor actor(List<String> moduleSlugs) {
        return new HrAnnouncementActor(
            7L,
            1L,
            20L,
            "Demo Admin",
            "superadmin",
            null,
            null,
            "Operations",
            moduleSlugs,
            true
        );
    }
}
