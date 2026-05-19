package com.indice.erp.hr;

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

    @Test
    void createOwnGeneratesFolioAndReturnsDetailEnvelope() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService);
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
    void approveRejectsNonPendingRequests() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService);
        var actor = new PermissionActor(1L, 1L, 2L, "Manager User", "admin", java.util.List.of("human_resources"));

        when(commandRepository.loadRequestState(1L, 14L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(14L, 2L, "approved"));

        var error = assertThrows(IllegalArgumentException.class, () -> service.approve(actor, 14L, Map.of()));
        assertEquals("Only pending permission requests can be updated.", error.getMessage());
        verify(attendanceSyncService, never()).syncApprovedLeaveStatus(anyLong(), anyLong(), anyLong());
    }

    @Test
    void approveSyncsAttendanceAfterStatusTransition() {
        var service = new HrPermissionCommandService(commandRepository, queryService, attendanceSyncService);
        var actor = new PermissionActor(1L, 1L, 2L, "Manager User", "admin", java.util.List.of("human_resources"));
        var expected = new LinkedHashMap<String, Object>();
        expected.put("permissionId", 14L);

        when(commandRepository.loadRequestState(1L, 14L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(14L, 9L, "pending"));
        when(commandRepository.updateStatusIfPending(1L, 1L, 14L, "approved", null)).thenReturn(1);
        when(queryService.getManagement(actor, 14L)).thenReturn(expected);

        var result = service.approve(actor, 14L, Map.of());

        assertSame(expected, result);
        verify(attendanceSyncService).syncApprovedLeaveStatus(1L, 1L, 14L);
    }
}
