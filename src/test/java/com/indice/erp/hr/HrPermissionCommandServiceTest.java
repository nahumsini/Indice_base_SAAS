package com.indice.erp.hr;

import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.hr.permissions.HrPermissionCommandRepository;
import com.indice.erp.hr.permissions.HrPermissionCommandService;
import com.indice.erp.hr.permissions.HrPermissionAttendanceSyncService;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.PermissionActor;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPermissionCommandServiceTest {

    @Mock
    private HrPermissionCommandRepository commandRepository;

    @Mock
    private HrPermissionQueryService queryService;

    @Mock
    private HrPermissionAttendanceSyncService attendanceSyncService;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void createOwnGeneratesFolioAndReturnsDetailEnvelope() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService, hrOperationalScopeService);
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());
        var snapshot = new HrPermissionCommandRepository.PermissionUserSnapshot(12L, 7L, "Attendance User", "Analyst", "HR");
        var expected = new LinkedHashMap<String, Object>();
        expected.put("permissionId", 9L);

        when(commandRepository.loadUserSnapshot(1L, 12L)).thenReturn(snapshot);
        when(commandRepository.createRequest(eq(1L), eq(7L), eq(snapshot), any())).thenReturn(9L);
        when(queryService.getOwn(actor, 9L)).thenReturn(expected);

        var result = service.createOwn(actor, Map.of(
            "type", "vacation",
            "startDate", "2026-05-20",
            "endDate", "2026-05-22",
            "reason", "Family trip"
        ));

        assertSame(expected, result);
        verify(commandRepository).updateRequestNumber(1L, 9L, "PER-%d-0009".formatted(LocalDate.now().getYear()));
    }

    @Test
    void createOwnRejectsPayloadScopeOverrides() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService, hrOperationalScopeService);
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());

        var error = assertThrows(IllegalArgumentException.class, () -> service.createOwn(actor, Map.of(
            "type", "vacation",
            "startDate", "2026-05-20",
            "endDate", "2026-05-22",
            "reason", "Family trip",
            "unit_id", 99
        )));

        assertEquals("Permission requests can only be created for the current user and assigned unit.", error.getMessage());
        verify(commandRepository, never()).loadUserSnapshot(anyLong(), anyLong());
        verify(commandRepository, never()).createRequest(anyLong(), anyLong(), any(), any());
    }

    @Test
    void approveRejectsNonPendingRequests() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService, hrOperationalScopeService);
        var actor = new PermissionActor(1L, 1L, 2L, "Manager User", "admin", java.util.List.of("human_resources"));
        var scope = HrOperationalScope.unitHeadquarters(4L);

        when(commandRepository.loadRequestState(1L, 14L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(14L, 2L, "approved"));
        when(hrOperationalScopeService.resolve(any())).thenReturn(scope);

        var error = assertThrows(IllegalArgumentException.class, () -> service.approve(actor, 14L, Map.of()));
        assertEquals("Only pending permission requests can be updated.", error.getMessage());
        verify(hrOperationalScopeService).requireUserInScope(1L, scope, 2L);
        verify(attendanceSyncService, never()).syncApprovedLeaveStatus(anyLong(), anyLong(), anyLong());
    }

    @Test
    void approveSyncsAttendanceAfterStatusTransition() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService, hrOperationalScopeService);
        var actor = new PermissionActor(1L, 1L, 2L, "Manager User", "admin", java.util.List.of("human_resources"));
        var scope = HrOperationalScope.unitHeadquarters(4L);
        var expected = new LinkedHashMap<String, Object>();
        expected.put("permissionId", 14L);

        when(commandRepository.loadRequestState(1L, 14L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(14L, 9L, "pending"));
        when(hrOperationalScopeService.resolve(any())).thenReturn(scope);
        when(commandRepository.updateStatusIfPending(1L, 1L, 14L, "approved", null)).thenReturn(1);
        when(queryService.getManagement(actor, 14L)).thenReturn(expected);

        var result = service.approve(actor, 14L, Map.of());

        assertSame(expected, result);
        verify(hrOperationalScopeService).requireUserInScope(1L, scope, 9L);
        verify(attendanceSyncService).syncApprovedLeaveStatus(1L, 1L, 14L);
    }

    @Test
    void approveRejectsRequestsOutsideActorScopeBeforeStatusUpdate() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService, hrOperationalScopeService);
        var actor = new PermissionActor(1L, 1L, 2L, "Manager User", "admin", java.util.List.of("human_resources"));
        var scope = HrOperationalScope.unitHeadquarters(4L);

        when(commandRepository.loadRequestState(1L, 14L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(14L, 99L, "pending"));
        when(hrOperationalScopeService.resolve(any())).thenReturn(scope);
        org.mockito.Mockito.doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireUserInScope(1L, scope, 99L);

        assertThrows(HrAccessDeniedException.class, () -> service.approve(actor, 14L, Map.of()));
        verify(commandRepository, never()).updateStatusIfPending(anyLong(), anyLong(), anyLong(), any(), any());
        verify(attendanceSyncService, never()).syncApprovedLeaveStatus(anyLong(), anyLong(), anyLong());
    }
}
