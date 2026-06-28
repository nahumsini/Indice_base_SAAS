package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class LoginAuditServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void recordsSuccessfulLoginAttempt() {
        var service = new LoginAuditService(jdbcTemplate);

        service.record(
            "demo@example.com",
            7L,
            3L,
            "admin",
            true,
            "",
            new LoginAuditContext("127.0.0.1", "JUnit", "session-1")
        );

        verify(jdbcTemplate).update(
            contains("INSERT INTO user_login_audit"),
            eq("demo@example.com"),
            eq(7L),
            eq(3L),
            eq("admin"),
            eq(1),
            eq(null),
            eq("127.0.0.1"),
            eq("JUnit"),
            eq("session-1")
        );
    }
}
