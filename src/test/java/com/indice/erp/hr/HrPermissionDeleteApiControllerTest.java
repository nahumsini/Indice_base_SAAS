package com.indice.erp.hr;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.permissions.HrMyPermissionApiController;
import com.indice.erp.hr.permissions.HrPermissionApiExceptionHandler;
import com.indice.erp.hr.permissions.HrPermissionAttachmentService;
import com.indice.erp.hr.permissions.HrPermissionCommandService;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.HrPermissionSecurityService;
import com.indice.erp.hr.permissions.HrPermissionSelfDeleteService;
import com.indice.erp.hr.permissions.PermissionActor;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HrMyPermissionApiController.class)
@Import(HrPermissionApiExceptionHandler.class)
class HrPermissionDeleteApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HrPermissionSecurityService securityService;

    @MockBean
    private HrPermissionQueryService queryService;

    @MockBean
    private HrPermissionCommandService commandService;

    @MockBean
    private HrPermissionSelfDeleteService selfDeleteService;

    @MockBean
    private HrPermissionAttachmentService attachmentService;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void myDeleteReturnsBadRequestWhenRequestIsAlreadyApproved() throws Exception {
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", List.of());
        given(securityService.requireSelfWriteActor(any(), any())).willReturn(actor);
        given(selfDeleteService.deleteOwnPending(any(), anyLong()))
            .willThrow(new IllegalArgumentException("Only pending permission requests can be deleted."));

        mockMvc.perform(delete("/api/v1/hr/permissions/me/9")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Only pending permission requests can be deleted."));
    }
}
