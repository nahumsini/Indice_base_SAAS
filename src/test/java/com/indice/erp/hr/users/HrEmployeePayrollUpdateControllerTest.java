package com.indice.erp.hr.users;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class HrEmployeePayrollUpdateControllerTest {
    @Test void authenticationPermissionAndCsrfAreRequiredBeforeUnifiedSave() {
        var auth=mock(SessionAuthService.class); var csrf=mock(SessionCsrfService.class);
        var access=mock(HrAccessService.class); var updates=mock(HrEmployeePayrollUpdateService.class);
        var session=new MockHttpSession(); var actor=new AuthSessionUser(1L,2L,"Synthetic","root");
        var controller=new HrUserApiController(auth,csrf,mock(HrUserService.class),access,updates);
        when(auth.currentUser(session)).thenReturn(Optional.empty());
        assertEquals(401,controller.update(session,3,null,Map.of()).getStatusCode().value());
        when(auth.currentUser(session)).thenReturn(Optional.of(actor));
        assertEquals(403,controller.update(session,3,null,Map.of()).getStatusCode().value());
        when(access.canAccessManagementTab(actor,HrAccessService.HrTab.COLLABORATORS)).thenReturn(true);
        doThrow(new IllegalArgumentException("invalid")).when(csrf).requireCsrf(session,null);
        assertEquals(403,controller.update(session,3,null,Map.of()).getStatusCode().value());
        verifyNoInteractions(updates);
    }
    @Test void profileVersionConflictHasExplicitConflictStatus() {
        var auth=mock(SessionAuthService.class); var csrf=mock(SessionCsrfService.class);
        var access=mock(HrAccessService.class); var updates=mock(HrEmployeePayrollUpdateService.class);
        var session=new MockHttpSession(); var actor=new AuthSessionUser(1L,2L,"Synthetic","root");
        when(auth.currentUser(session)).thenReturn(Optional.of(actor));
        when(access.canAccessManagementTab(actor,HrAccessService.HrTab.COLLABORATORS)).thenReturn(true);
        when(updates.update(actor,3,Map.of())).thenThrow(new MexicoPayrollProfileService.ProfileConflictException());
        var controller=new HrUserApiController(auth,csrf,mock(HrUserService.class),access,updates);
        assertEquals(409,controller.update(session,3,"synthetic",Map.of()).getStatusCode().value());
        verify(csrf).requireCsrf(session,"synthetic");
    }
}
