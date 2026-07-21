package com.indice.erp.hr.announcements;

import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AnnApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private ObjectStorageService objectStorageService;

    private HrAnnouncementTestFixtures fixtures;

    @BeforeEach
    void setUp() {
        fixtures = new HrAnnouncementTestFixtures(jdbcTemplate);
    }

    @AfterEach
    void tearDown() {
        fixtures.tearDown();
    }

    @Test
    void managerCanUpdateAndSoftDeleteWithCsrf() throws Exception {
        var id = fixtures.createAnnouncement("Editable announcement", "all", "draft");
        var session = fixtures.adminSession();
        var csrf = fixtures.csrf(session);

        mockMvc.perform(patch("/api/v1/hr/announcements/{id}", id)
                .session(session)
                .header("X-CSRF-Token", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"title":"Updated announcement","type":"urgent","content":"Updated body","audience_type":"all","status":"published"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Updated announcement"))
            .andExpect(jsonPath("$.delivery_count", greaterThanOrEqualTo(1)));

        mockMvc.perform(delete("/api/v1/hr/announcements/{id}", id)
                .session(session)
                .header("X-CSRF-Token", csrf))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void targetedUserCanMarkVisibleAnnouncementReadOnlyWithCsrf() throws Exception {
        var unitId = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = 1 LIMIT 1", Long.class);
        var user = fixtures.createNormalUser(System.currentTimeMillis(), unitId);
        var visible = fixtures.createAnnouncement("Read visible", "employees", "published");
        var hidden = fixtures.createAnnouncement("Read hidden", "employees", "published");
        fixtures.addTarget(visible, "employee", String.valueOf(user.userCompanyId()));
        fixtures.addTarget(hidden, "employee", "999999999");
        var session = fixtures.userSession(user);
        var csrf = fixtures.csrf(session);

        mockMvc.perform(post("/api/v1/hr/announcements/{id}/read", visible)
                .session(session)
                .header("X-CSRF-Token", csrf))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.announcement_id").value(visible));

        mockMvc.perform(post("/api/v1/hr/announcements/{id}/read", hidden)
                .session(session)
                .header("X-CSRF-Token", csrf))
            .andExpect(status().isNotFound());
    }

    @Test
    void managerCanPresignAndRegisterAttachmentWithCsrf() throws Exception {
        var id = fixtures.createAnnouncement("Attachment announcement", "all", "draft");
        var objectKey = "hr/announcements/1/" + id + "/attachments/2026/05/19/test.pdf";
        var session = fixtures.adminSession();
        var csrf = fixtures.csrf(session);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.presignUpload(
                anyString(), anyString(), anyString(), anyLong(), anyInt()))
            .thenReturn(new PresignedUpload(objectKey, "https://upload.example", Instant.now(), Map.of()));
        when(objectStorageService.objectExists(anyString(), anyString())).thenReturn(true);
        when(objectStorageService.presignDownload(anyString(), anyString(), anyInt()))
            .thenReturn("https://download.example");

        mockMvc.perform(post("/api/v1/hr/announcements/{id}/attachments/presign-upload", id)
                .session(session)
                .header("X-CSRF-Token", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"file_name\":\"test.pdf\",\"content_type\":\"application/pdf\",\"size_bytes\":200}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.object_key").value(objectKey));

        mockMvc.perform(post("/api/v1/hr/announcements/{id}/attachments", id)
                .session(session)
                .header("X-CSRF-Token", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"file_name":"test.pdf","content_type":"application/pdf","size_bytes":200,"object_key":"%s"}
                    """.formatted(objectKey)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.attachment_count").value(1));
    }
}
