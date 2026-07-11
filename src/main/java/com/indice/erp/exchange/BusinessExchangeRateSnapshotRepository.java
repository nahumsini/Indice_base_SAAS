package com.indice.erp.exchange;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BusinessExchangeRateSnapshotRepository {

    private static final String BASE_CURRENCY = "USD";
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public BusinessExchangeRateSnapshotRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void acquireDailyRefreshLock(LocalDate rateDate) {
        var lockName = "indice_exchange_rates_" + rateDate;
        var acquired = jdbcTemplate.queryForObject("SELECT GET_LOCK(?, 15)", Integer.class, lockName);
        if (acquired == null || acquired != 1) {
            throw new IllegalStateException("No fue posible asegurar la actualización diaria de divisas");
        }
    }

    public void releaseDailyRefreshLock(LocalDate rateDate) {
        jdbcTemplate.queryForObject("SELECT RELEASE_LOCK(?)", Integer.class, "indice_exchange_rates_" + rateDate);
    }

    public Optional<BusinessExchangeRatesResponse> find(LocalDate rateDate) {
        return jdbcTemplate.query(
            "SELECT response_payload FROM business_exchange_rate_daily_snapshots WHERE rate_date = ? AND base_currency = ?",
            (resultSet, rowNumber) -> deserialize(resultSet.getString("response_payload")),
            rateDate,
            BASE_CURRENCY
        ).stream().findFirst();
    }

    public Optional<BusinessExchangeRatesResponse> findLatestBefore(LocalDate rateDate) {
        return jdbcTemplate.query(
            "SELECT response_payload FROM business_exchange_rate_daily_snapshots "
                + "WHERE rate_date < ? AND base_currency = ? ORDER BY rate_date DESC LIMIT 1",
            (resultSet, rowNumber) -> deserialize(resultSet.getString("response_payload")),
            rateDate,
            BASE_CURRENCY
        ).stream().findFirst();
    }

    public void save(LocalDate rateDate, BusinessExchangeRatesResponse response) {
        jdbcTemplate.update(
            "INSERT INTO business_exchange_rate_daily_snapshots (rate_date, base_currency, response_payload) VALUES (?, ?, ?)",
            rateDate,
            BASE_CURRENCY,
            serialize(response)
        );
    }

    private String serialize(BusinessExchangeRatesResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No fue posible guardar el corte diario de divisas", ex);
        }
    }

    private BusinessExchangeRatesResponse deserialize(String payload) {
        try {
            return objectMapper.readValue(payload, BusinessExchangeRatesResponse.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("El corte diario de divisas guardado no es válido", ex);
        }
    }
}
