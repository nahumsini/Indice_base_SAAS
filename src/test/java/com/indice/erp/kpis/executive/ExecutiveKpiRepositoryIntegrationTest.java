package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ExecutiveKpiRepository.class, com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver.class, com.fasterxml.jackson.databind.ObjectMapper.class})
class ExecutiveKpiRepositoryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ExecutiveKpiRepository repository;

    @Test
    void nativeCurrenciesSupportsMixedSourceCollations() {
        var companyName = "KPI currency test " + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", companyName);
        var companyId = jdbc.queryForObject(
                "SELECT id FROM companies WHERE name = ?",
                Long.class,
                companyName);
        var scope = new ExecutiveKpiScope(
                companyId,
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 31),
                "monthly",
                null,
                null,
                "",
                "all",
                "MXN",
                LocalDate.of(2026, 8, 18));

        assertThatCode(() -> repository.loadNativeCurrencies(scope)).doesNotThrowAnyException();
    }
}
