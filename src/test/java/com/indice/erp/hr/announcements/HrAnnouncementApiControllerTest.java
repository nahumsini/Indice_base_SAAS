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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HrAnnouncementApiControllerTest {

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
    void createRequiresCsrf() throws Exception {
        mockMvc.perform(
            post("/api/v1/hr/announcements")
                .session(fixtures.adminSession())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "title", "Missing CSRF",
                    "type", "general",
                    "content", "Body",
                    "audience_type", "all",
                    "status", "published"
                )))
        )
            .andExpect(status().isForbidden());
    }

    @Test
    void normalUserSeesOnlyPublishedTargetedAnnouncements() throws Exception {
        var suffix = System.currentTimeMillis();
        var unitId = jdbcTemplate.queryForObject(
            "SELECT id FROM units WHERE company_id = 1 AND LOWER(status) = 'active' LIMIT 1",
            Long.class
        );
        var user = fixtures.createNormalUser(suffix, unitId);
        fixtures.createAnnouncement("Visible all " + suffix, "all", "published");
        var unitAnnouncement = fixtures.createAnnouncement("Visible unit " + suffix, "units", "published");
        var departmentAnnouncement = fixtures.createAnnouncement("Visible dept " + suffix, "departments", "published");
        var employeeAnnouncement = fixtures.createAnnouncement("Visible employee " + suffix, "employees", "published");
        var hiddenAnnouncement = fixtures.createAnnouncement("Hidden employee " + suffix, "employees", "published");
        fixtures.createAnnouncement("Hidden draft " + suffix, "all", "draft");
        fixtures.addTarget(unitAnnouncement, "unit", String.valueOf(unitId));
        fixtures.addTarget(departmentAnnouncement, "department", user.department());
        fixtures.addTarget(employeeAnnouncement, "employee", String.valueOf(user.userCompanyId()));
        fixtures.addTarget(hiddenAnnouncement, "employee", "999999999");

        var response = mockMvc.perform(get("/api/v1/hr/announcements").session(fixtures.userSession(user)))
            .andExpect(status().isOk())
            .andReturn();

        var titles = itemTitles(response.getResponse().getContentAsString());
        assertThat(titles).contains(
            "Visible all " + suffix,
            "Visible unit " + suffix,
            "Visible dept " + suffix,
            "Visible employee " + suffix
        );
        assertThat(titles).doesNotContain("Hidden employee " + suffix, "Hidden draft " + suffix);
    }

    @Test
    void managerAudienceOptionsComeFromHrWorkProfiles() throws Exception {
        var suffix = System.currentTimeMillis();
        var unitId = jdbcTemplate.queryForObject(
            "SELECT id FROM units WHERE company_id = 1 AND LOWER(status) = 'active' LIMIT 1",
            Long.class
        );
        var user = fixtures.createNormalUser(suffix, unitId);

        mockMvc.perform(get("/api/v1/hr/announcements/audience-options").session(fixtures.userSession(user)))
            .andExpect(status().isForbidden());

        var body = mockMvc.perform(get("/api/v1/hr/announcements/audience-options").session(fixtures.adminSession()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        assertThat(section(body, "departments")).anySatisfy(item -> {
            assertThat(item.get("name")).isEqualTo(user.department());
            assertThat(((Number) item.get("active_user_count")).intValue()).isGreaterThanOrEqualTo(1);
            assertThat(item.get("is_available")).isEqualTo(true);
        });
        assertThat(section(body, "units")).anySatisfy(item -> {
            assertThat(((Number) item.get("id")).longValue()).isEqualTo(unitId);
            assertThat(((Number) item.get("active_user_count")).intValue()).isGreaterThanOrEqualTo(1);
        });
        assertThat(section(body, "employees")).anySatisfy(item ->
            assertThat(((Number) item.get("id")).longValue()).isEqualTo(user.userCompanyId())
        );
    }

    private List<String> itemTitles(String body) throws Exception {
        var parsed = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) parsed.get("items");
        return items.stream().map(item -> String.valueOf(item.get("title"))).toList();
    }

    private List<Map<String, Object>> section(String body, String key) throws Exception {
        var parsed = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) parsed.get(key);
        return items;
    }
}
