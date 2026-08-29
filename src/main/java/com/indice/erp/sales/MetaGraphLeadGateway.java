package com.indice.erp.sales;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.sales.MetaLeadImportDtos.ProviderLead;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

interface MetaLeadGateway {
    List<ProviderLead> download(String pageId, String accessToken, int maxLeads);
}

@Component
class MetaGraphLeadGateway implements MetaLeadGateway {

    private static final Pattern GRAPH_VERSION = Pattern.compile("v[0-9]{1,2}\\.[0-9]");
    private static final int MAX_FORMS = 200;
    private static final int PAGE_SIZE = 100;
    private static final String LEAD_FIELDS = String.join(",",
            "id", "created_time", "form_id", "ad_id", "ad_name",
            "campaign_id", "campaign_name", "field_data");

    private final RestClient restClient;
    private final String apiVersion;

    @Autowired
    MetaGraphLeadGateway(
            RestClient.Builder restClientBuilder,
            @Value("${app.sales.meta.graph-api-version:v23.0}") String apiVersion) {
        this(configuredClient(restClientBuilder), apiVersion);
    }

    MetaGraphLeadGateway(RestClient restClient, String apiVersion) {
        var normalizedVersion = apiVersion == null ? "" : apiVersion.trim().toLowerCase(Locale.ROOT);
        if (!GRAPH_VERSION.matcher(normalizedVersion).matches()) {
            throw new IllegalArgumentException("Invalid Meta Graph API version configuration.");
        }
        this.restClient = restClient;
        this.apiVersion = normalizedVersion;
    }

    private static RestClient configuredClient(RestClient.Builder restClientBuilder) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        return restClientBuilder
                .baseUrl("https://graph.facebook.com")
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public List<ProviderLead> download(String pageId, String accessToken, int maxLeads) {
        try {
            var forms = loadForms(pageId, accessToken);
            var leads = new LinkedHashMap<String, ProviderLead>();
            for (var form : forms) {
                if (leads.size() >= maxLeads) {
                    break;
                }
                loadFormLeads(pageId, form, accessToken, maxLeads, leads);
            }
            return List.copyOf(leads.values());
        } catch (RestClientResponseException exception) {
            throw translateResponseFailure(exception);
        } catch (RestClientException exception) {
            throw new MetaLeadIntegrationException(
                    "META_UNAVAILABLE",
                    HttpStatus.BAD_GATEWAY,
                    "Meta is temporarily unavailable. Try the import again later.");
        }
    }

    private List<MetaForm> loadForms(String pageId, String accessToken) {
        var forms = new ArrayList<MetaForm>();
        String after = null;
        do {
            var response = getEdge(pageId, "leadgen_forms", "id,name", PAGE_SIZE, after, accessToken);
            requireDataArray(response);
            for (var item : response.path("data")) {
                var formId = boundedText(item.path("id").asText(""), 40);
                if (!formId.isBlank()) {
                    forms.add(new MetaForm(formId, boundedText(item.path("name").asText(""), 180)));
                }
                if (forms.size() >= MAX_FORMS) {
                    return forms;
                }
            }
            after = nextCursor(response);
        } while (!after.isBlank());
        return forms;
    }

    private void loadFormLeads(
            String pageId,
            MetaForm form,
            String accessToken,
            int maxLeads,
            Map<String, ProviderLead> leads) {
        String after = null;
        do {
            var remaining = maxLeads - leads.size();
            if (remaining <= 0) {
                return;
            }
            var response = getEdge(form.id(), "leads", LEAD_FIELDS, Math.min(PAGE_SIZE, remaining), after, accessToken);
            requireDataArray(response);
            for (var item : response.path("data")) {
                var lead = toProviderLead(pageId, form, item);
                if (!lead.id().isBlank()) {
                    leads.putIfAbsent(lead.id(), lead);
                }
                if (leads.size() >= maxLeads) {
                    return;
                }
            }
            after = nextCursor(response);
        } while (!after.isBlank());
    }

    private JsonNode getEdge(
            String objectId,
            String edge,
            String fields,
            int limit,
            String after,
            String accessToken) {
        var response = restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .pathSegment(apiVersion, objectId, edge)
                            .queryParam("fields", fields)
                            .queryParam("limit", limit);
                    if (after != null && !after.isBlank()) {
                        builder.queryParam("after", after);
                    }
                    return builder.build();
                })
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(JsonNode.class);
        if (response == null || !response.isObject()) {
            throw new MetaLeadIntegrationException(
                    "META_INVALID_RESPONSE",
                    HttpStatus.BAD_GATEWAY,
                    "Meta returned an invalid response.");
        }
        return response;
    }

    private ProviderLead toProviderLead(String pageId, MetaForm form, JsonNode item) {
        var fields = new LinkedHashMap<String, List<String>>();
        var fieldData = item.path("field_data");
        if (fieldData.isArray()) {
            for (var field : fieldData) {
                var name = normalizeFieldName(field.path("name").asText(""));
                if (name.isBlank()) {
                    continue;
                }
                var values = new ArrayList<String>();
                var rawValues = field.path("values");
                if (rawValues.isArray()) {
                    for (var value : rawValues) {
                        var normalized = boundedText(value.asText(""), 1000);
                        if (!normalized.isBlank() && values.size() < 20) {
                            values.add(normalized);
                        }
                    }
                }
                fields.put(name, List.copyOf(values));
            }
        }
        return new ProviderLead(
                boundedText(item.path("id").asText(""), 80),
                pageId,
                boundedText(item.path("form_id").asText(form.id()), 40),
                form.name(),
                boundedText(item.path("ad_id").asText(""), 80),
                boundedText(item.path("ad_name").asText(""), 250),
                boundedText(item.path("campaign_id").asText(""), 80),
                boundedText(item.path("campaign_name").asText(""), 250),
                parseInstant(item.path("created_time").asText("")),
                Map.copyOf(fields));
    }

    private void requireDataArray(JsonNode response) {
        if (!response.path("data").isArray()) {
            throw new MetaLeadIntegrationException(
                    "META_INVALID_RESPONSE",
                    HttpStatus.BAD_GATEWAY,
                    "Meta returned an invalid response.");
        }
    }

    private String nextCursor(JsonNode response) {
        return boundedText(response.path("paging").path("cursors").path("after").asText(""), 1000);
    }

    private MetaLeadIntegrationException translateResponseFailure(RestClientResponseException exception) {
        if (exception.getStatusCode().value() == 429) {
            return new MetaLeadIntegrationException(
                    "META_RATE_LIMITED",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Meta temporarily limited the request. Try again later.");
        }
        if (exception.getStatusCode().is4xxClientError()) {
            return new MetaLeadIntegrationException(
                    "META_ACCESS_DENIED",
                    HttpStatus.BAD_GATEWAY,
                    "Meta denied access. Verify the Page ID, token and Lead Ads permissions.");
        }
        return new MetaLeadIntegrationException(
                "META_UNAVAILABLE",
                HttpStatus.BAD_GATEWAY,
                "Meta is temporarily unavailable. Try the import again later.");
    }

    private static String normalizeFieldName(String value) {
        return boundedText(value, 200)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private static String boundedText(String value, int maxLength) {
        var normalized = value == null ? "" : value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            var normalized = value.trim();
            if (normalized.matches(".*[+-][0-9]{4}$")) {
                normalized = normalized.substring(0, normalized.length() - 2)
                        + ":"
                        + normalized.substring(normalized.length() - 2);
            }
            return OffsetDateTime.parse(normalized).toInstant();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private record MetaForm(String id, String name) {
    }
}
