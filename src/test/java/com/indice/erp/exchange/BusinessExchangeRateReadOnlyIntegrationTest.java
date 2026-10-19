package com.indice.erp.exchange;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@Import(BusinessExchangeRateReadOnlyIntegrationTest.OfflineRates.class)
class BusinessExchangeRateReadOnlyIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired BusinessExchangeRateService rates;
    @Autowired PlatformTransactionManager transactions;

    @TestConfiguration
    static class OfflineRates {
        @Bean @Primary
        BusinessExchangeRateService offlineRates(ObjectMapper mapper, BusinessExchangeRateSnapshotRepository snapshots) throws Exception {
            var http = mock(HttpClient.class);
            when(http.send(any(), any())).thenThrow(new IOException("Synthetic provider unavailable"));
            return new BusinessExchangeRateService(mapper, snapshots, "", 1000, http);
        }
    }

    @BeforeEach void coldCache() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        db.update("DELETE FROM business_exchange_rate_daily_snapshots WHERE rate_date=?", today());
    }

    @AfterEach void clearSyntheticSnapshot() {
        db.update("DELETE FROM business_exchange_rate_daily_snapshots WHERE rate_date=?", today());
    }

    @ParameterizedTest @ValueSource(booleans={false, true})
    void coldDailyCachePersistsWithoutMakingTheCallerWritable(boolean explicitRefresh) {
        var report = new TransactionTemplate(transactions);
        report.setReadOnly(true);
        var response = report.execute(status -> {
            assertThat(TransactionSynchronizationManager.isCurrentTransactionReadOnly()).isTrue();
            var result = explicitRefresh ? rates.loadDailyRates(true) : rates.loadDailyRates();
            assertThat(TransactionSynchronizationManager.isCurrentTransactionReadOnly()).isTrue();
            status.setRollbackOnly();
            return result;
        });
        assertThat(response).isNotNull();
        assertThat(response.warnings()).isNotEmpty();
        assertThat(response.sources()).noneSatisfy(source -> assertThat(source.status()).isEqualTo("official"));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM business_exchange_rate_daily_snapshots WHERE rate_date=?", Integer.class, today())).isEqualTo(1);
        assertThat(rates.cachedDailyRates()).contains(response);
    }

    private LocalDate today() { return LocalDate.now(ZoneId.of("America/Toronto")); }
}
