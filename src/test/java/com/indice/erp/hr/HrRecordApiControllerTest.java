package com.indice.erp.hr;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HrRecordApiController.class)
class HrRecordApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private HrRecordService hrRecordService;

    @Test
    void listReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/records"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listReturnsExpectedEnvelope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var serviceResult = new LinkedHashMap<String, Object>();
        serviceResult.put("rows", List.of(Map.of(
            "id", 7L,
            "title", "Safety Incident",
            "status", "pending",
            "type", "incident"
        )));
        serviceResult.put("page", 1);
        serviceResult.put("size", 50);
        serviceResult.put("total_count", 1);
        serviceResult.put("total_pages", 1);
        serviceResult.put("summary", Map.of(
            "total_count", 1,
            "pending_count", 1,
            "reviewed_count", 0,
            "resolved_count", 0,
            "high_severity_count", 1
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrRecordService.listRecords(anyLong(), any(Map.class))).willReturn(serviceResult);

        mockMvc.perform(get("/api/v1/hr/records"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].title").value("Safety Incident"))
            .andExpect(jsonPath("$.summary.pending_count").value(1));
    }

    @Test
    void updateReturnsNotFoundWhenRecordIsMissing() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrRecordService.updateRecord(anyLong(), anyLong(), anyLong(), any(Map.class)))
            .willThrow(new NoSuchElementException("Record not found."));

        mockMvc.perform(put("/api/v1/hr/records/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_id": 2,
                      "record_type": "incident",
                      "severity": "high",
                      "title": "Missing",
                      "description": "Missing"
                    }
                    """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Record not found."));
    }

    @Test
    void detailsReturnsExpandedRecordEnvelope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var detailBody = new LinkedHashMap<String, Object>();
        detailBody.put("record_id", 12L);
        detailBody.put("record", Map.of(
            "id", 12L,
            "title", "Jordan Safety Observation",
            "status", "reviewed"
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrRecordService.getRecordDetails(1L, 12L)).willReturn(detailBody);

        mockMvc.perform(get("/api/v1/hr/records/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.record_id").value(12))
            .andExpect(jsonPath("$.record.title").value("Jordan Safety Observation"))
            .andExpect(jsonPath("$.record.status").value("reviewed"));
    }

    @Test
    void attachmentPresignReturnsServiceUnavailableWhenStorageIsDisabled() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrRecordService.createAttachmentUpload(anyLong(), anyLong(), any(Map.class)))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(post("/api/v1/hr/records/12/attachments/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "file_name": "incident.pdf",
                      "content_type": "application/pdf",
                      "size_bytes": 1024
                    }
                    """))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));
    }
}
