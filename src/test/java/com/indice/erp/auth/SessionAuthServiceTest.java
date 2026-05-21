package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SessionAuthServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Test
    void currentSessionIncludesModuleAndTabAccess() {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Access User");
        session.setAttribute(SessionAuthService.SESSION_ROLE, "admin");

        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(5L),
            eq(7L)
        )).thenReturn(List.of(11L));
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(11L)
        )).thenReturn(List.of("config_center", "human_resources"));
        when(jdbcTemplate.query(
            contains("FROM user_company_tab_permissions"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(11L)
        )).thenReturn(List.of("config_center.profile", "human_resources.attendance"));
        when(jdbcTemplate.queryForObject(
            contains("COUNT(*) FROM user_company_tab_permissions"),
            eq(Long.class),
            eq(11L)
        )).thenReturn(12L);

        var current = service.currentSession(session);

        assertTrue(current.isPresent());
        assertEquals(List.of("config_center", "human_resources"), current.get().user().module_slugs());
        assertEquals(List.of("config_center.profile", "human_resources.attendance"), current.get().user().tab_permission_keys());
        assertTrue(current.get().user().tab_permissions_configured());
    }
}
