package com.indice.erp.exchange;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class BusinessExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(BusinessExchangeRateService.class);
    private static final String BASE_CURRENCY = "USD";
    private static final String OFFICIAL_DAILY_SOURCE = "official_daily_reference";
    private static final String DAILY_REFERENCE_MODE = "daily_reference";
    private static final String FALLBACK_STATUS = "fallback";
    private static final String OFFICIAL_STATUS = "official";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Toronto");
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter BCB_DATE = DateTimeFormatter.ofPattern("MM-dd-yyyy");
    private static final DateTimeFormatter BANXICO_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Map<String, BigDecimal> DEFAULT_RATES_PER_USD = Map.of(
        "MXN", new BigDecimal("18.45"),
        "CAD", new BigDecimal("1.361624"),
        "USD", BigDecimal.ONE,
        "COP", new BigDecimal("4010.869565"),
        "BRL", new BigDecimal("5.507463")
    );

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Duration requestTimeout;
    private final String banxicoToken;

    public BusinessExchangeRateService(
        ObjectMapper objectMapper,
        @Value("${app.exchange.banxico-token:}") String banxicoToken,
        @Value("${app.exchange.request-timeout-ms:7000}") long requestTimeoutMs
    ) {
        this.objectMapper = objectMapper;
        this.banxicoToken = banxicoToken == null ? "" : banxicoToken.trim();
        this.requestTimeout = Duration.ofMillis(Math.max(1000, requestTimeoutMs));
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(this.requestTimeout)
            .build();
    }

    public BusinessExchangeRatesResponse loadDailyRates() {
        var rates = new LinkedHashMap<>(DEFAULT_RATES_PER_USD);
        var sources = new ArrayList<BusinessExchangeRateSourceResponse>();
        var warnings = new ArrayList<String>();

        applyObservation("MXN", rates, sources, warnings, this::fetchMxnFromBanxico);
        applyObservation("CAD", rates, sources, warnings, this::fetchCadFromBankOfCanada);
        applyObservation("COP", rates, sources, warnings, this::fetchCopFromDatosAbiertos);
        applyObservation("BRL", rates, sources, warnings, this::fetchBrlFromBancoCentralDoBrasil);
        rates.put(BASE_CURRENCY, BigDecimal.ONE);

        var sourceDate = sources.stream()
            .filter(source -> OFFICIAL_STATUS.equals(source.status()))
            .map(BusinessExchangeRateSourceResponse::observedDate)
            .filter(date -> date != null && !date.isBlank())
            .max(Comparator.naturalOrder())
            .orElse(LocalDate.now(BUSINESS_ZONE).format(ISO_DATE));
        var metadata = new BusinessExchangeRateMetadataResponse(
            DAILY_REFERENCE_MODE,
            OFFICIAL_DAILY_SOURCE,
            sourceDate,
            Instant.now().toString(),
            "Fuentes oficiales",
            "https://www.bankofcanada.ca/valet-api-how-to/",
            "https://www.bankofcanada.ca/terms/",
            "Tasas informativas consultadas desde fuentes oficiales disponibles para estimaciones operativas."
        );

        return new BusinessExchangeRatesResponse(
            BASE_CURRENCY,
            rates,
            metadata,
            List.copyOf(sources),
            List.copyOf(warnings)
        );
    }

    private void applyObservation(
        String currencyCode,
        Map<String, BigDecimal> rates,
        List<BusinessExchangeRateSourceResponse> sources,
        List<String> warnings,
        RateFetcher fetcher
    ) {
        try {
            var observation = fetcher.fetch();
            rates.put(currencyCode, observation.ratePerUsd());
            sources.add(observation.toResponse(OFFICIAL_STATUS, ""));
        } catch (Exception ex) {
            var defaultRate = DEFAULT_RATES_PER_USD.get(currencyCode);
            var fallback = fallbackSource(currencyCode, defaultRate, ex.getMessage());
            sources.add(fallback);
            warnings.add("%s usa tasa interna porque la fuente oficial no estuvo disponible: %s".formatted(
                currencyCode,
                safeMessage(ex)
            ));
            log.warn("Official exchange rate source unavailable for {}: {}", currencyCode, safeMessage(ex));
        }
    }

    private RateObservation fetchMxnFromBanxico() throws IOException, InterruptedException {
        if (banxicoToken.isBlank()) {
            throw new IllegalStateException("APP_EXCHANGE_BANXICO_TOKEN no configurado");
        }

        var url = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno";
        var root = getJson(url, Map.of("Bmx-Token", banxicoToken));
        var data = root.path("bmx").path("series").path(0).path("datos").path(0);
        var rate = parseDecimal(data.path("dato").asText());
        var date = parseBanxicoDate(data.path("fecha").asText());

        return new RateObservation(
            "MXN",
            rate,
            date,
            "Banco de Mexico",
            "SIE SF43718 FIX",
            "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno",
            "https://www.banxico.org.mx/SieAPIRest/",
            "Requiere token de Banxico para consulta automatizada."
        );
    }

    private RateObservation fetchCadFromBankOfCanada() throws IOException, InterruptedException {
        var url = "https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1";
        var root = getJson(url, Map.of());
        var observation = firstArrayItem(root.path("observations"))
            .orElseThrow(() -> new IllegalStateException("Bank of Canada sin observaciones recientes"));
        var rate = parseDecimal(observation.path("FXUSDCAD").path("v").asText());
        var date = observation.path("d").asText();

        return new RateObservation(
            "CAD",
            rate,
            normalizeIsoDate(date),
            "Bank of Canada",
            "Valet API FXUSDCAD",
            url,
            "https://www.bankofcanada.ca/terms/",
            "Daily average exchange rate: USD expressed in CAD."
        );
    }

    private RateObservation fetchCopFromDatosAbiertos() throws IOException, InterruptedException {
        var url = "https://www.datos.gov.co/resource/ceyp-9c7c.json?$limit=1&$order=vigenciadesde%20DESC";
        var root = getJson(url, Map.of());
        var observation = firstArrayItem(root)
            .orElseThrow(() -> new IllegalStateException("Datos Abiertos Colombia sin TRM vigente"));
        var rate = parseDecimal(observation.path("valor").asText());
        var date = normalizeIsoDate(observation.path("vigenciadesde").asText());

        return new RateObservation(
            "COP",
            rate,
            date,
            "Superintendencia Financiera de Colombia / Datos Abiertos Colombia",
            "TRM dataset ceyp-9c7c",
            "https://www.datos.gov.co/resource/ceyp-9c7c.json",
            "https://www.datos.gov.co/",
            "TRM oficial publicada en Datos Abiertos Colombia."
        );
    }

    private RateObservation fetchBrlFromBancoCentralDoBrasil() throws IOException, InterruptedException {
        var today = LocalDate.now(BUSINESS_ZONE);
        var start = today.minusDays(10);
        var url = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
            + "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)"
            + "?@moeda='USD'"
            + "&@dataInicial='" + start.format(BCB_DATE) + "'"
            + "&@dataFinalCotacao='" + today.format(BCB_DATE) + "'"
            + "&$top=100&$format=json";
        var root = getJson(url, Map.of());
        var latest = latestBcbObservation(root.path("value"))
            .orElseThrow(() -> new IllegalStateException("Banco Central do Brasil sin PTAX reciente"));
        var rate = parseDecimal(latest.path("cotacaoVenda").asText());
        var date = normalizeIsoDate(latest.path("dataHoraCotacao").asText());

        return new RateObservation(
            "BRL",
            rate,
            date,
            "Banco Central do Brasil",
            "PTAX OData CotacaoMoedaPeriodo",
            url,
            "https://opendata.bcb.gov.br/en/dataset/?res_format=API",
            "PTAX USD venda publicada por Banco Central do Brasil."
        );
    }

    private JsonNode getJson(String url, Map<String, String> headers) throws IOException, InterruptedException {
        var requestBuilder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(requestTimeout)
            .GET()
            .header("Accept", "application/json")
            .header("User-Agent", "IndiceERP/1.0");
        headers.forEach(requestBuilder::header);
        var response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("HTTP %s desde fuente oficial".formatted(response.statusCode()));
        }

        return objectMapper.readTree(response.body());
    }

    private Optional<JsonNode> firstArrayItem(JsonNode node) {
        if (!node.isArray() || node.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(node.get(0));
    }

    private Optional<JsonNode> latestBcbObservation(JsonNode node) {
        if (!node.isArray() || node.isEmpty()) {
            return Optional.empty();
        }

        JsonNode latest = null;
        for (var observation : node) {
            if (!observation.hasNonNull("cotacaoVenda")) {
                continue;
            }
            if (latest == null || observation.path("dataHoraCotacao").asText().compareTo(latest.path("dataHoraCotacao").asText()) > 0) {
                latest = observation;
            }
        }
        return Optional.ofNullable(latest);
    }

    private BusinessExchangeRateSourceResponse fallbackSource(String currencyCode, BigDecimal defaultRate, String note) {
        return new BusinessExchangeRateSourceResponse(
            currencyCode,
            defaultRate,
            LocalDate.now(BUSINESS_ZONE).format(ISO_DATE),
            fallbackInstitution(currencyCode),
            "Referencia interna de Indice",
            fallbackSourceUrl(currencyCode),
            fallbackLicenseUrl(currencyCode),
            FALLBACK_STATUS,
            note == null || note.isBlank() ? "Fuente oficial no disponible." : note
        );
    }

    private String fallbackInstitution(String currencyCode) {
        return switch (currencyCode) {
            case "MXN" -> "Banco de Mexico";
            case "CAD" -> "Bank of Canada";
            case "COP" -> "Superintendencia Financiera de Colombia / Datos Abiertos Colombia";
            case "BRL" -> "Banco Central do Brasil";
            default -> "Fuente oficial";
        };
    }

    private String fallbackSourceUrl(String currencyCode) {
        return switch (currencyCode) {
            case "MXN" -> "https://www.banxico.org.mx/SieAPIRest/";
            case "CAD" -> "https://www.bankofcanada.ca/valet-api-how-to/";
            case "COP" -> "https://www.datos.gov.co/resource/ceyp-9c7c.json";
            case "BRL" -> "https://opendata.bcb.gov.br/en/dataset/?res_format=API";
            default -> "";
        };
    }

    private String fallbackLicenseUrl(String currencyCode) {
        return switch (currencyCode) {
            case "CAD" -> "https://www.bankofcanada.ca/terms/";
            case "COP" -> "https://www.datos.gov.co/";
            case "BRL" -> "https://opendata.bcb.gov.br/en/dataset/?res_format=API";
            case "MXN" -> "https://www.banxico.org.mx/SieAPIRest/";
            default -> "";
        };
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("valor numerico vacio");
        }

        var normalized = value.trim().replace(" ", "");
        if (normalized.contains(",") && normalized.contains(".")) {
            normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
                ? normalized.replace(".", "").replace(",", ".")
                : normalized.replace(",", "");
        } else if (normalized.contains(",")) {
            normalized = normalized.replace(",", ".");
        }
        normalized = normalized.replaceAll("[^0-9.-]", "");

        if (normalized.isBlank() || "-".equals(normalized) || ".".equals(normalized)) {
            throw new IllegalArgumentException("valor numerico invalido");
        }

        return new BigDecimal(normalized).setScale(6, RoundingMode.HALF_UP).stripTrailingZeros();
    }

    private String normalizeIsoDate(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now(BUSINESS_ZONE).format(ISO_DATE);
        }

        var trimmed = value.trim();
        if (trimmed.length() >= 10) {
            return trimmed.substring(0, 10);
        }
        return trimmed;
    }

    private String parseBanxicoDate(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now(BUSINESS_ZONE).format(ISO_DATE);
        }

        try {
            return LocalDate.parse(value.trim(), BANXICO_DATE).format(ISO_DATE);
        } catch (RuntimeException ex) {
            return normalizeIsoDate(value);
        }
    }

    private String safeMessage(Exception ex) {
        var message = ex.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }

    private interface RateFetcher {
        RateObservation fetch() throws IOException, InterruptedException;
    }

    private record RateObservation(
        String currencyCode,
        BigDecimal ratePerUsd,
        String observedDate,
        String institution,
        String dataset,
        String sourceUrl,
        String licenseUrl,
        String note
    ) {
        BusinessExchangeRateSourceResponse toResponse(String status, String overrideNote) {
            return new BusinessExchangeRateSourceResponse(
                currencyCode,
                ratePerUsd,
                observedDate,
                institution,
                dataset,
                sourceUrl,
                licenseUrl,
                status,
                overrideNote == null || overrideNote.isBlank() ? note : overrideNote
            );
        }
    }
}
