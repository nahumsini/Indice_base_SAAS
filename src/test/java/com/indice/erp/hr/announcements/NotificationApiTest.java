package com.indice.erp.hr.announcements;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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
    void userReceivesOnlyVisibleAnnouncementNotifications() throws Exception {
        var suffix = System.currentTimeMillis();
        var unitId = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = 1 LIMIT 1", Long.class);
        var user = fixtures.createNormalUser(suffix, unitId);
        var visible = fixtures.createAnnouncement("Visible notification " + suffix, "employees", "published");
        var hidden = fixtures.createAnnouncement("Hidden notification " + suffix, "employees", "published");
        fixtures.addTarget(visible, "employee", String.valueOf(user.userCompanyId()));
        fixtures.addTarget(hidden, "employee", "999999999");

        var response = mockMvc.perform(get("/api/v1/notifications").session(fixtures.userSession(user)))
            .andExpect(status().isOk())
            .andReturn();

        var titles = items(response.getResponse().getContentAsString())
            .stream()
            .map(item -> String.valueOf(item.get("title")))
            .toList();
        assertThat(titles).contains("Visible notification " + suffix);
        assertThat(titles).doesNotContain("Hidden notification " + suffix);
    }

    @Test
    void userReceivesDepartmentAnnouncementNotifications() throws Exception {
        var suffix = System.currentTimeMillis();
        var unitId = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = 1 LIMIT 1", Long.class);
        var user = fixtures.createNormalUser(suffix, unitId);
        var title = "Department notification " + suffix;
        var announcementId = fixtures.createAnnouncement(title, "departments", "published");
        fixtures.addTarget(announcementId, "department", user.department());

        var titles = items(mockMvc.perform(get("/api/v1/notifications").session(fixtures.userSession(user)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString())
            .stream()
            .map(item -> String.valueOf(item.get("title")))
            .toList();
        assertThat(titles).contains(title);
    }

    @Test
    void readAndDismissNotificationsRequireCsrf() throws Exception {
        var suffix = System.currentTimeMillis();
        var unitId = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = 1 LIMIT 1", Long.class);
        var user = fixtures.createNormalUser(suffix, unitId);
        var title = "Action notification " + suffix;
        var announcementId = fixtures.createAnnouncement(title, "employees", "published");
        fixtures.addTarget(announcementId, "employee", String.valueOf(user.userCompanyId()));
        var session = fixtures.userSession(user);
        var notificationId = notificationId(session, title);
        var csrf = fixtures.csrf(session);

        mockMvc.perform(post("/api/v1/notifications/{id}/read", notificationId).session(session))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/notifications/{id}/read", notificationId)
                .session(session)
                .header("X-CSRF-Token", csrf))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.source_id").value(announcementId))
            .andExpect(jsonPath("$.is_unread").value(false));

        mockMvc.perform(delete("/api/v1/notifications/{id}", notificationId)
                .session(session)
                .header("X-CSRF-Token", csrf))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        var titles = items(mockMvc.perform(get("/api/v1/notifications").session(session))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString())
            .stream()
            .map(item -> String.valueOf(item.get("title")))
            .toList();
        assertThat(titles).doesNotContain(title);
    }

    private long notificationId(MockHttpSession session, String title) throws Exception {
        var response = mockMvc.perform(get("/api/v1/notifications").session(session))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return items(response)
            .stream()
            .filter(item -> title.equals(String.valueOf(item.get("title"))))
            .map(item -> ((Number) item.get("id")).longValue())
            .findFirst()
            .orElseThrow();
    }

    private List<Map<String, Object>> items(String body) throws Exception {
        var parsed = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) parsed.get("items");
        return items;
    }
}
