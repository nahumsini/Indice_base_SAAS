package com.indice.erp.pos.discount;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class DiscountRuleServiceTest {

    private static final PosContext CONTEXT = new PosContext(
        5L, 7L, "Admin", "admin", true, PosScope.corporateOffice());

    @Mock
    private DiscountRuleRepository repository;

    private DiscountRuleService service;

    @BeforeEach
    void setUp() {
        service = new DiscountRuleService(
            repository,
            new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-08-19T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void deleteSoftDeletesTheCurrentVersion() {
        var rule = rule(3L);
        given(repository.find(CONTEXT, rule.id())).willReturn(Optional.of(rule));
        given(repository.softDelete(CONTEXT, rule.id(), rule.version())).willReturn(true);

        var result = service.delete(CONTEXT, rule.id(), rule.version());

        assertThat(result).containsEntry("success", true).containsEntry("id", rule.id());
        then(repository).should().softDelete(CONTEXT, rule.id(), rule.version());
    }

    @Test
    void deleteRejectsAStaleVersion() {
        var rule = rule(4L);
        given(repository.find(CONTEXT, rule.id())).willReturn(Optional.of(rule));
        given(repository.softDelete(CONTEXT, rule.id(), 3L)).willReturn(false);

        assertThatThrownBy(() -> service.delete(CONTEXT, rule.id(), 3L))
            .isInstanceOf(PosApiException.class)
            .hasMessage("The discount rule changed. Reload it before deleting it.");
    }

    private DiscountRuleRecord rule(long version) {
        var now = Instant.parse("2026-08-19T12:00:00Z");
        return new DiscountRuleRecord(
            42L, CONTEXT.companyId(), null, null, null, "2 por 1", "Promoción de prueba",
            "ORDER", "PERCENTAGE", BigDecimal.valueOf(50), "MXN", now, now.plusSeconds(86400),
            BigDecimal.ONE, null, null, null, null, false, false, 1, "PAUSED",
            "[\"POS\"]", version, now, now);
    }
}
