package com.indice.erp.hr;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.permissions.HrMyPermissionApiController;
import com.indice.erp.hr.permissions.HrPermissionApiException;
import com.indice.erp.hr.permissions.HrPermissionApiExceptionHandler;
import com.indice.erp.hr.permissions.HrPermissionAttachmentService;
import com.indice.erp.hr.permissions.HrPermissionCommandService;
import com.indice.erp.hr.permissions.HrPermissionManagementApiController;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.HrPermissionSecurityService;
import com.indice.erp.hr.permissions.HrPermissionSelfDeleteService;
import com.indice.erp.hr.permissions.PermissionActor;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({HrPermissionManagementApiController.class, HrMyPermissionApiController.class})
@Import(HrPermissionApiExceptionHandler.class)
class HrPermissionApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HrPermissionSecurityService securityService;

    @MockBean
    private HrPermissionQueryService queryService;

    @MockBean
    private HrPermissionCommandService commandService;

    @MockBean
    private HrPermissionAttachmentService attachmentService;

    @MockBean
    private HrPermissionSelfDeleteService selfDeleteService;

    @MockBean
    private SessionAuthService sessionAuthService;

    @Test
    void managementListReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(securityService.requireManagementActor(any()))
            .willThrow(new HrPermissionApiException(HttpStatus.UNAUTHORIZED, "Unauthorized"));

        mockMvc.perform(get("/api/v1/hr/permissions"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void managementApproveReturnsForbiddenWhenActorCannotManage() throws Exception {
        given(securityService.requireManagementWriteActor(any(), any()))
            .willThrow(new HrPermissionApiException(HttpStatus.FORBIDDEN, "Forbidden"));

        mockMvc.perform(post("/api/v1/hr/permissions/4/approve")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void myCreateReturnsCreatedEnvelope() throws Exception {
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());
        given(securityService.requireSelfWriteActor(any(), any())).willReturn(actor);
        given(commandService.createOwn(any(), any())).willReturn(Map.of(
            "permissionId", 9L,
            "permission", Map.of("folio", "PER-2026-0009", "status", "pending")
        ));

        mockMvc.perform(post("/api/v1/hr/permissions/me")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "type": "vacation",
                      "startDate": "2026-05-20",
                      "endDate": "2026-05-22",
                      "reason": "Family trip"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.permissionId").value(9))
            .andExpect(jsonPath("$.permission.folio").value("PER-2026-0009"));
    }

    @Test
    void myAttachmentPresignReturnsServiceUnavailableWhenStorageIsDisabled() throws Exception {
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());
        given(securityService.requireSelfWriteActor(any(), any())).willReturn(actor);
        given(attachmentService.createOwnUpload(any(), anyLong(), any()))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(post("/api/v1/hr/permissions/me/9/attachments/presign-upload")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "file_name": "support.pdf",
                      "content_type": "application/pdf",
                      "size_bytes": 1024
                    }
                    """))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));
    }

    @Test
    void myCreateReturnsForbiddenWhenCsrfTokenIsInvalid() throws Exception {
        given(securityService.requireSelfWriteActor(any(), any()))
            .willThrow(new HrPermissionApiException(HttpStatus.FORBIDDEN, "Invalid CSRF token."));

        mockMvc.perform(post("/api/v1/hr/permissions/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "type": "vacation",
                      "startDate": "2026-05-20",
                      "endDate": "2026-05-22",
                      "reason": "Family trip"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
    }
}
