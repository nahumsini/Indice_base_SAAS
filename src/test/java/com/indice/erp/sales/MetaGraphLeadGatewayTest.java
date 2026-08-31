package com.indice.erp.sales;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withTooManyRequests;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MetaGraphLeadGatewayTest {

    private static final String GRAPH_BASE_URL = "https://graph.facebook.com";
    private static final String ACCESS_TOKEN = "meta-page-token-that-must-stay-private";

    @Test
    void downloadsAndMapsLeadAdsWithoutPuttingTheTokenInTheUrl() {
        var builder = RestClient.builder().baseUrl(GRAPH_BASE_URL);
        var server = MockRestServiceServer.bindTo(builder).build();
        var gateway = new MetaGraphLeadGateway(builder.build(), "v23.0");

        server.expect(requestTo(containsString("/v23.0/123456/leadgen_forms?")))
                .andExpect(requestTo(containsString("fields=id,name")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess(
                        """
                        {"data":[{"id":"form-1","name":"Website form"}]}
                        """,
                        MediaType.APPLICATION_JSON));

        server.expect(requestTo(containsString("/v23.0/form-1/leads?")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess(
                        """
                        {
                          "data":[{
                            "id":"lead-1",
                            "created_time":"2026-08-28T12:34:56+0000",
                            "form_id":"form-1",
                            "ad_id":"ad-7",
                            "ad_name":"August campaign ad",
                            "campaign_id":"campaign-8",
                            "campaign_name":"August campaign",
                            "field_data":[
                              {"name":"full_name","values":["Ada Lovelace"]},
                              {"name":"email","values":["ada@example.com"]}
                            ]
                          }]
                        }
                        """,
                        MediaType.APPLICATION_JSON));

        var leads = gateway.download("123456", ACCESS_TOKEN, 100);

        assertEquals(1, leads.size());
        var lead = leads.getFirst();
        assertEquals("lead-1", lead.id());
        assertEquals("Website form", lead.formName());
        assertEquals("August campaign", lead.campaignName());
        assertEquals("Ada Lovelace", lead.fields().get("full_name").getFirst());
        assertEquals("ada@example.com", lead.fields().get("email").getFirst());
        assertEquals("2026-08-28T12:34:56Z", lead.sourceCreatedAt().toString());
        server.verify();
    }

    @Test
    void translatesProviderRateLimitsToASafeApplicationError() {
        var builder = RestClient.builder().baseUrl(GRAPH_BASE_URL);
        var server = MockRestServiceServer.bindTo(builder).build();
        var gateway = new MetaGraphLeadGateway(builder.build(), "v23.0");

        server.expect(requestTo(containsString("/v23.0/123456/leadgen_forms?")))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withTooManyRequests());

        var error = assertThrows(
                MetaLeadIntegrationException.class,
                () -> gateway.download("123456", ACCESS_TOKEN, 100));

        assertEquals("META_RATE_LIMITED", error.code());
        assertEquals(429, error.status().value());
        server.verify();
    }
}
