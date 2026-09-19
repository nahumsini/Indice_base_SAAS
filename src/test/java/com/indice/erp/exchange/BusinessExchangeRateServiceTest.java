package com.indice.erp.exchange;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class BusinessExchangeRateServiceTest {

    @Test
    void usesAttributedEcbFrankfurterReferenceWhenBanxicoHasNoToken() throws Exception {
        var httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        doReturn(200).when(response).statusCode();
        doReturn("{\"date\":\"2026-09-14\",\"base\":\"USD\",\"quote\":\"MXN\",\"rate\":17.0721}")
            .when(response).body();
        doReturn(response).when(httpClient).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

        var service = new BusinessExchangeRateService(
            new ObjectMapper(),
            mock(BusinessExchangeRateSnapshotRepository.class),
            "",
            7000,
            httpClient
        );

        var observation = service.fetchMxnReference();

        assertThat(observation.currencyCode()).isEqualTo("MXN");
        assertThat(observation.ratePerUsd()).isEqualByComparingTo(new BigDecimal("17.0721"));
        assertThat(observation.observedDate()).isEqualTo("2026-09-14");
        assertThat(observation.institution()).isEqualTo("Banco Central Europeo via Frankfurter");
        assertThat(observation.dataset()).isEqualTo("ECB reference rate USD/MXN");
        assertThat(observation.sourceUrl())
            .isEqualTo("https://api.frankfurter.dev/v2/providers/ecb/rate/usd/mxn");
        assertThat(observation.licenseUrl()).isEqualTo("https://frankfurter.dev/providers/ecb/");

        var requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(requestCaptor.getValue().uri().toString())
            .isEqualTo("https://api.frankfurter.dev/v2/providers/ecb/rate/usd/mxn");
    }
}
