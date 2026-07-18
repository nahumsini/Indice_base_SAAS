package com.indice.erp.processTasks.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ProcessTaskAssignmentScopeServiceTest {

    private final ProcessTaskAssignmentScopeService service =
            new ProcessTaskAssignmentScopeService(mock(JdbcTemplate.class));

    @Test
    void corporateActorCanAccessEveryKioskScope() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.corporate(1L, 10L);

        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(null, null)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, null)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, 8L)))
                .isTrue();
    }

    @Test
    void companyWideKioskIsAvailableToScopedActors() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.business(1L, 10L, 7L, 8L);

        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(null, null)))
                .isTrue();
    }

    @Test
    void unitActorCanAccessItsUnitAndBusinessesOnly() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.unit(1L, 10L, 7L);

        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, null)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, 8L)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(9L, null)))
                .isFalse();
    }

    @Test
    void businessActorCanAccessOnlyItsBusinessOrParentUnitKiosk() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.business(1L, 10L, 7L, 8L);

        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, 8L)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, null)))
                .isTrue();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(7L, 11L)))
                .isFalse();
        assertThat(service.canAccessKioskScope(actor, new ProcessTaskAssignmentScopeService.TaskTargetScope(9L, null)))
                .isFalse();
    }
}
