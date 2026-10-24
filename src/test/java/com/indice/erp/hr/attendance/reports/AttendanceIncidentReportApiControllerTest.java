package com.indice.erp.hr.attendance.reports;

import com.indice.erp.auth.*;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.attendance.api.AttendanceIncidentReportApiController;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.*;

@WebMvcTest(AttendanceIncidentReportApiController.class)
class AttendanceIncidentReportApiControllerTest {
    @Autowired MockMvc mvc;
    @MockBean SessionAuthService auth;
    @MockBean HrAccessService access;
    @MockBean AttendanceIncidentReportService service;
    @MockBean com.indice.erp.learning.LearningAppliedAdvice learningAppliedAdvice;
    final AuthSessionUser user = new AuthSessionUser(8L, 3L, "Test operator", "admin");
    final String url = "/api/v1/hr/attendance/incidents";
    void allow() {
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        when(access.canAccessManagementTab(user, HrAccessService.HrTab.CONTROL)).thenReturn(true);
    }
    @Test void unauthenticatedReadFailsClosed() throws Exception {
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(get(url).param("from", "2026-10-01").param("to", "2026-10-31")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void deniedControlTabNeverReadsReport() throws Exception {
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        mvc.perform(get(url).param("from", "2026-10-01").param("to", "2026-10-31")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void invalidDateIsRejected() throws Exception {
        allow(); mvc.perform(get(url).param("from", "2026-02-30").param("to", "2026-10-31")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void periodAndFiltersBindToTheAuthenticatedActor() throws Exception {
        allow(); var from = LocalDate.of(2026, 10, 1); var to = from.plusDays(6);
        when(service.report(user, from, to, 1L, 2L, 7L)).thenReturn(new Report(from, to, LocalDateTime.now(), 7, 0,
            List.of(), new Totals(Map.of(), 0, 0, 0, 0)));
        mvc.perform(get(url).param("from", from.toString()).param("to", to.toString()).param("unitId", "1")
            .param("businessId", "2").param("employeeId", "7").param("companyId", "999"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.calendarDays").value(7)).andExpect(jsonPath("$.employeeCount").value(0));
        verify(service).report(user, from, to, 1L, 2L, 7L);
    }
    @Test void scopeDenialIsNotTurnedIntoAnEmptyOrPartialReport() throws Exception {
        allow(); when(service.report(eq(user), any(), any(), any(), any(), any())).thenThrow(new HrAccessDeniedException("Forbidden"));
        mvc.perform(get(url).param("from", "2026-10-01").param("to", "2026-10-31")).andExpect(status().isForbidden());
    }
}
