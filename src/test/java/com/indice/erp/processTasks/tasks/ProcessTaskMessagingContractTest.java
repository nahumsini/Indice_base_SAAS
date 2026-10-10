package com.indice.erp.processTasks.tasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class ProcessTaskMessagingContractTest {
    final ProcessTasksService tasks=mock(ProcessTasksService.class);
    final ProcessTaskAssistantService scope=mock(ProcessTaskAssistantService.class);
    final ProcessTaskKioskService kiosks=mock(ProcessTaskKioskService.class);
    final ModuleAccessService modules=mock(ModuleAccessService.class);
    final TabPermissionAccessService tabs=mock(TabPermissionAccessService.class);
    final ProcessTaskMessagingContract port=new ProcessTaskMessagingContract(tasks,scope,kiosks,modules,tabs);
    final AuthSessionUser actor=new AuthSessionUser(1L,2L,3L,"Member","user");
    KioskResolvedDefinition definition(long company) {
        return new KioskResolvedDefinition(9,company,"PROCESS_TASKS","EMPLOYEE_TOOL",null,"TASKS","My tasks",
            com.indice.erp.kiosk.engine.KioskDefinitionStatus.ACTIVE,null,null,null,
            com.indice.erp.kiosk.engine.KioskAccessLevel.IDENTIFIED,null,null,false,1,1);
    }
    void grant() {
        when(modules.canAccess(actor,"processes")).thenReturn(true);
        when(modules.companyCanAccessForMutation(2,"processes")).thenReturn(true);
        when(tabs.canAccess(eq(actor),any())).thenReturn(true);
    }
    @Test void personalCaptureUsesOwnedAssignmentScopeAndCannotDelegate() {
        grant();
        when(scope.creationAssignment(2,1,3)).thenReturn(new ProcessTaskAssistantService.Assignment(3,"Member",10L,"Unit",11L,"Business"));
        when(tasks.createTask(eq(2L),eq(1L),any())).thenReturn(Map.of("id",9L,"folio","T9","title","Call","status","pending"));
        assertThat(port.create(actor,null,"Call",null).id()).isEqualTo(9);
        verify(tasks).createTask(eq(2L),eq(1L),argThat(p->p.get("assignedUserCompanyId").equals(3L) && p.get("unitId").equals(10L) && p.get("businessId").equals(11L)));
        verifyNoInteractions(kiosks);
    }
    @Test void availabilityDoesNotAcquireMutationLocksOutsideATransaction() {
        grant();assertThat(port.allowed(actor)).isTrue();
        verify(modules,never()).companyCanAccessForMutation(anyLong(),anyString());
    }
    @Test void revokedPermissionAndForeignKioskFailBeforeMutation() {
        assertThatThrownBy(()->port.create(actor,null,"Call",null)).isInstanceOf(SecurityException.class);
        grant();when(tabs.canAccess(eq(actor),any())).thenReturn(false);
        assertThatThrownBy(()->port.create(actor,null,"Call",null)).isInstanceOf(SecurityException.class);
        grant();var definition=definition(99);
        assertThatThrownBy(()->port.create(actor,definition,"Call",null)).isInstanceOf(SecurityException.class);
        verifyNoInteractions(tasks,kiosks,scope);
    }
    @Test void pinCaptureUsesNativeEmployeeTaskOwner() {
        grant();var definition=definition(2);
        when(kiosks.employeeCreateTask(eq(definition),eq(1L),any())).thenReturn(Map.of("task",Map.of("id",8L,"title","Call","status","pending")));
        assertThat(port.create(actor,definition,"Call",null).id()).isEqualTo(8);
        verifyNoInteractions(tasks,scope);
    }
}
