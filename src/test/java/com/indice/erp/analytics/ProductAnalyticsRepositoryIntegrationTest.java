package com.indice.erp.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.analytics.ProductAnalyticsRepository.SessionIdentity;
import com.indice.erp.analytics.ProductAnalyticsRepository.SessionMetadata;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class ProductAnalyticsRepositoryIntegrationTest {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private ProductAnalyticsRepository repository;

    private long companyId;
    private long userId;
    private String appSessionKey;
    private String webSessionKey;
    private LocalDate usageDate;

    @BeforeEach
    void setUp() {
        var token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Analytics test " + token);
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$analyticstest', 'Analytics Test')",
            "analytics-" + token + "@example.com"
        );
        userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        appSessionKey = UUID.randomUUID().toString();
        webSessionKey = UUID.randomUUID().toString();
        usageDate = LocalDate.of(2026, 8, 28);

        var now = Instant.parse("2026-08-28T20:00:00Z");
        repository.touchSession(
            new SessionIdentity(appSessionKey, "APP", companyId, userId, null),
            new SessionMetadata("es-mx", "DESKTOP", "", "", "", ""),
            now
        );
        repository.observe(appSessionKey, usageDate, "dashboard", "summary", 1, 30, 1, 0, now);
        repository.touchSession(
            new SessionIdentity(webSessionKey, "WEB", null, null, "a".repeat(64)),
            new SessionMetadata("es-mx", "MOBILE", "google", "organic", "launch", "google.com"),
            now
        );
        repository.observe(webSessionKey, usageDate, "/planes.php", "pricing", 1, 15, 1, 1, now);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM product_analytics_page_usage WHERE session_key IN (?, ?)", appSessionKey, webSessionKey);
        jdbc.update("DELETE FROM product_analytics_sessions WHERE session_key IN (?, ?)", appSessionKey, webSessionKey);
        jdbc.update("DELETE FROM users WHERE id = ?", userId);
        jdbc.update("DELETE FROM companies WHERE id = ?", companyId);
    }

    @Test
    void dashboardQueriesExecuteWithMysqlSafeAliasesAndPreserveTenantScope() {
        var app = repository.appSummary(usageDate, usageDate, companyId);
        var web = repository.webSummary(usageDate, usageDate);

        assertThat(app).containsEntry("active_users", 1L).containsEntry("active_companies", 1L);
        assertThat(web).containsEntry("visitors", 1L).containsEntry("conversions", 1L);
        assertThat(repository.dailyTrend(usageDate, usageDate, companyId)).hasSize(1);
        assertThat(repository.topPages("APP", usageDate, usageDate, companyId))
            .singleElement().satisfies(row -> assertThat(row).containsEntry("route", "dashboard"));
        assertThat(repository.topPages("WEB", usageDate, usageDate, null))
            .singleElement().satisfies(row -> assertThat(row).containsEntry("route", "/planes.php"));
        assertThat(repository.companyAdoption(usageDate, usageDate, companyId))
            .singleElement().satisfies(row -> assertThat(row).containsEntry("company_id", companyId));
        assertThat(repository.webSources(usageDate, usageDate))
            .singleElement().satisfies(row -> assertThat(row).containsEntry("source", "google"));
        assertThat(repository.dataSince()).isEqualTo(usageDate.toString());
    }
}
