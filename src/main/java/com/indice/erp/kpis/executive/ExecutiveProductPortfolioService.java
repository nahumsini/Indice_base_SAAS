package com.indice.erp.kpis.executive;

import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

import static com.indice.erp.kpis.executive.ExecutiveProductPortfolioContracts.*;

@Service
public class ExecutiveProductPortfolioService {

    private static final BigDecimal HIGH_SHARE_THRESHOLD = new BigDecimal("50.00");
    private static final BigDecimal HIGH_GROWTH_THRESHOLD = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal DISPLAY_GROWTH_FLOOR = new BigDecimal("-100.00");
    private static final BigDecimal DISPLAY_GROWTH_CEILING = new BigDecimal("100.00");
    private static final int MAXIMUM_DISPLAYED_PRODUCTS = 40;
    private static final List<String> QUADRANTS = List.of(
            "star", "cash_cow", "question_mark", "dog", "unclassified");

    private final ExecutiveKpiDomainRepository repository;
    private final KpiCurrencyAggregationService currencyAggregationService;

    public ExecutiveProductPortfolioService(
            ExecutiveKpiDomainRepository repository,
            KpiCurrencyAggregationService currencyAggregationService) {
        this.repository = repository;
        this.currencyAggregationService = currencyAggregationService;
    }

    public Portfolio build(ExecutiveKpiScope scope, BusinessExchangeRatesResponse rates) {
        var previous = scope.previousPeriod();
        var currentRows = repository.loadProductPortfolioSales(scope);
        var previousRows = repository.loadProductPortfolioSales(previous);
        var inventoryRows = repository.loadProductPortfolioInventory(scope);
        var currentQuality = quality(repository.loadProductPortfolioSalesQuality(scope));
        var previousQuality = quality(repository.loadProductPortfolioSalesQuality(previous));
        var rateDate = rateDate(rates, scope.snapshotDate());
        var sourceName = rates.metadata() == null ? "" : rates.metadata().sourceName();
        var nativeCurrencies = new LinkedHashSet<String>();
        var excludedCurrencies = new LinkedHashSet<String>();

        var products = merge(currentRows, previousRows);
        var inventoryByProduct = inventoryRows.stream().collect(java.util.stream.Collectors.toMap(
                ExecutiveKpiDomainRepository.ProductPortfolioInventoryRow::productId,
                row -> row,
                (left, right) -> left,
                LinkedHashMap::new));

        var calculated = products.values().stream().map(product -> {
            product.currentAmounts.forEach(amount -> addCurrency(nativeCurrencies, amount.currency()));
            product.currentCostAmounts.forEach(amount -> addCurrency(nativeCurrencies, amount.currency()));
            product.previousAmounts.forEach(amount -> addCurrency(nativeCurrencies, amount.currency()));
            var current = currencyAggregationService.aggregate(
                    product.currentAmounts, scope.preferredCurrency(), BusinessExchangeRateEvidence.verifiedRates(rates, scope.snapshotDate(), true),
                    "daily", rateDate, sourceName);
            var prior = currencyAggregationService.aggregate(
                    product.previousAmounts, scope.preferredCurrency(), BusinessExchangeRateEvidence.verifiedRates(rates, scope.snapshotDate(), true),
                    "daily", rateDate, sourceName);
            var cost = currencyAggregationService.aggregate(
                    product.currentCostAmounts, scope.preferredCurrency(), BusinessExchangeRateEvidence.verifiedRates(rates, scope.snapshotDate(), true),
                    "daily", rateDate, sourceName);
            excludedCurrencies.addAll(current.excludedCurrencies());
            excludedCurrencies.addAll(prior.excludedCurrencies());
            excludedCurrencies.addAll(cost.excludedCurrencies());
            return new CalculatedProduct(
                    product,
                    money(current.preferredTotal()),
                    money(prior.preferredTotal()),
                    money(cost.preferredTotal()),
                    product.currentUnits.compareTo(BigDecimal.ZERO) > 0
                            && product.currentMissingCostLines == 0
                            && !cost.partial(),
                    current.partial() || prior.partial(),
                    inventoryByProduct.get(product.productId));
        }).toList();

        var totalRevenue = calculated.stream().map(CalculatedProduct::currentRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var previousTotalRevenue = calculated.stream().map(CalculatedProduct::previousRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var categoryLeaders = new LinkedHashMap<String, BigDecimal>();
        calculated.stream().filter(item -> !item.partial()).forEach(item ->
                categoryLeaders.merge(categoryKey(item.source().category), item.currentRevenue(), BigDecimal::max));

        var items = calculated.stream().map(item -> product(
                        item, totalRevenue, categoryLeaders.getOrDefault(
                                categoryKey(item.source().category), BigDecimal.ZERO)))
                .sorted(Comparator.comparing(Product::currentRevenue).reversed()
                        .thenComparing(Product::previousRevenue, Comparator.reverseOrder())
                        .thenComparing(Product::productName))
                .toList();
        var classifiedProducts = (int) items.stream()
                .filter(item -> !"unclassified".equals(item.quadrant())).count();
        var unclassifiedProducts = items.size() - classifiedProducts;
        var displayed = items.stream().limit(MAXIMUM_DISPLAYED_PRODUCTS).toList();
        var truncated = items.size() > displayed.size();
        var quadrantSummaries = QUADRANTS.stream().map(quadrant -> {
            var quadrantItems = items.stream().filter(item -> quadrant.equals(item.quadrant())).toList();
            var revenue = quadrantItems.stream().map(Product::currentRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return new QuadrantSummary(
                    quadrant,
                    quadrantItems.size(),
                    money(revenue),
                    percent(revenue, totalRevenue));
        }).toList();

        var issues = new ArrayList<String>();
        if (currentQuality.attributedSales() == 0) {
            issues.add("No hay renglones de producto atribuibles en el periodo actual.");
        }
        if (previousQuality.attributedSales() == 0) {
            issues.add("No hay renglones de producto comparables en el periodo anterior.");
        }
        addCountIssue(issues, currentQuality.salesWithoutLines() + previousQuality.salesWithoutLines(),
                "ventas sin renglones de producto");
        addCountIssue(issues, currentQuality.invalidLineRows() + previousQuality.invalidLineRows(),
                "renglones de venta con cantidad, descuento o importe inválido");
        addCountIssue(issues, currentQuality.unlinkedProductRows() + previousQuality.unlinkedProductRows(),
                "renglones vinculados a productos inexistentes o eliminados");
        addCountIssue(issues, currentQuality.invalidCurrencyRecords() + previousQuality.invalidCurrencyRecords(),
                "ventas con moneda inválida");
        var exchangeIssues = exchangeIssues(scope, rates, nativeCurrencies, rateDate);
        issues.addAll(exchangeIssues);
        if (!excludedCurrencies.isEmpty()) {
            issues.add("Hay importes de producto excluidos por moneda o tasa no válida: "
                    + String.join(", ", excludedCurrencies) + ".");
        }
        if (unclassifiedProducts > 0) {
            issues.add(unclassifiedProducts
                    + " productos no tienen una base comparable completa y permanecen sin clasificar.");
        }
        var invalidInventoryRows = inventoryRows.stream()
                .mapToInt(ExecutiveKpiDomainRepository.ProductPortfolioInventoryRow::invalidQuantityRows).sum();
        addCountIssue(issues, invalidInventoryRows, "saldos de inventario con cantidades inválidas");
        if (truncated) {
            issues.add("La visualización muestra los " + MAXIMUM_DISPLAYED_PRODUCTS
                    + " productos con mayor venta; los totales consideran todo el portafolio elegible.");
        }

        var salesInvalid = currentQuality.salesWithoutLines() + previousQuality.salesWithoutLines()
                + currentQuality.invalidLineRows() + previousQuality.invalidLineRows()
                + currentQuality.unlinkedProductRows() + previousQuality.unlinkedProductRows()
                + currentQuality.invalidCurrencyRecords() + previousQuality.invalidCurrencyRecords();
        var decisionReady = currentQuality.attributedSales() > 0
                && previousQuality.attributedSales() > 0
                && classifiedProducts > 0
                && salesInvalid == 0
                && excludedCurrencies.isEmpty()
                && exchangeIssues.isEmpty();
        var partial = !decisionReady || unclassifiedProducts > 0 || invalidInventoryRows > 0 || truncated;

        return new Portfolio(
                "1.0",
                new Methodology(
                        "indice-internal-product-portfolio",
                        "1.0",
                        "current product net revenue / current category leader net revenue",
                        "(current product net revenue - previous product net revenue) / previous product net revenue",
                        HIGH_SHARE_THRESHOLD,
                        HIGH_GROWTH_THRESHOLD,
                        DISPLAY_GROWTH_FLOOR,
                        DISPLAY_GROWTH_CEILING,
                        MAXIMUM_DISPLAYED_PRODUCTS,
                        false),
                scope.preferredCurrency(),
                new Range(scope.from().toString(), scope.to().toString()),
                new Range(previous.from().toString(), previous.to().toString()),
                money(totalRevenue),
                money(previousTotalRevenue),
                items.size(),
                classifiedProducts,
                unclassifiedProducts,
                displayed.size(),
                truncated,
                quadrantSummaries,
                List.copyOf(displayed),
                new DataQuality(
                        decisionReady,
                        partial,
                        List.copyOf(issues),
                        List.copyOf(excludedCurrencies),
                        currentQuality.salesWithoutLines(),
                        previousQuality.salesWithoutLines(),
                        currentQuality.invalidLineRows() + previousQuality.invalidLineRows(),
                        currentQuality.unlinkedProductRows() + previousQuality.unlinkedProductRows(),
                        "sales_records.sale_lines_json + sales_products + sales_inventory_balances/repeatable-read",
                        scope.snapshotDate().toString(),
                        "Matriz interna del portafolio; no representa participación de mercado ni usa datos de competidores."));
    }

    private Product product(
            CalculatedProduct item,
            BigDecimal totalRevenue,
            BigDecimal categoryLeaderRevenue) {
        var source = item.source();
        var comparable = !item.partial()
                && item.previousRevenue().compareTo(BigDecimal.ZERO) > 0
                && categoryLeaderRevenue.compareTo(BigDecimal.ZERO) > 0;
        var growth = comparable
                ? item.currentRevenue().subtract(item.previousRevenue())
                        .multiply(BigDecimal.valueOf(100))
                        .divide(item.previousRevenue(), 2, RoundingMode.HALF_UP)
                : null;
        var relativeShare = categoryLeaderRevenue.compareTo(BigDecimal.ZERO) > 0
                ? percent(item.currentRevenue(), categoryLeaderRevenue)
                : BigDecimal.ZERO.setScale(2);
        var quadrant = quadrant(relativeShare, growth, comparable);
        var inventory = item.inventory();
        var contributionMargin = item.costAvailable()
                ? item.currentRevenue().subtract(item.currentCost())
                : null;
        var contributionMarginPercent = item.costAvailable()
                && item.currentRevenue().compareTo(BigDecimal.ZERO) > 0
                ? percent(contributionMargin, item.currentRevenue())
                : null;
        return new Product(
                source.productId,
                source.productName,
                source.sku,
                source.category,
                quadrant,
                item.currentRevenue(),
                item.previousRevenue(),
                growth,
                percent(item.currentRevenue(), totalRevenue),
                relativeShare,
                scale(source.currentUnits),
                scale(source.previousUnits),
                source.currentSaleCount,
                source.previousSaleCount,
                item.costAvailable() ? money(item.currentCost()) : null,
                contributionMargin == null ? null : money(contributionMargin),
                contributionMarginPercent,
                item.costAvailable(),
                stockStatus(inventory),
                inventory == null ? null : scale(inventory.availableQuantity()),
                inventory == null ? null : scale(inventory.minimumQuantity()),
                inventory == null ? 0 : inventory.stockLocations(),
                item.partial() || !comparable);
    }

    private String quadrant(BigDecimal relativeShare, BigDecimal growth, boolean comparable) {
        if (!comparable || growth == null) return "unclassified";
        var highShare = relativeShare.compareTo(HIGH_SHARE_THRESHOLD) >= 0;
        var highGrowth = growth.compareTo(HIGH_GROWTH_THRESHOLD) >= 0;
        if (highShare && highGrowth) return "star";
        if (highShare) return "cash_cow";
        if (highGrowth) return "question_mark";
        return "dog";
    }

    private String stockStatus(ExecutiveKpiDomainRepository.ProductPortfolioInventoryRow inventory) {
        if (inventory == null || inventory.stockLocations() == 0) return "not_tracked";
        if (inventory.invalidQuantityRows() > 0) return "unavailable";
        if (inventory.availableQuantity().compareTo(BigDecimal.ZERO) <= 0) return "out_of_stock";
        if (inventory.lowStockLocations() > 0 || inventory.outOfStockLocations() > 0
                || inventory.availableQuantity().compareTo(inventory.minimumQuantity()) <= 0) {
            return "low_stock";
        }
        return "healthy";
    }

    private Map<Long, MutableProduct> merge(
            List<ExecutiveKpiDomainRepository.ProductPortfolioSalesRow> currentRows,
            List<ExecutiveKpiDomainRepository.ProductPortfolioSalesRow> previousRows) {
        var result = new LinkedHashMap<Long, MutableProduct>();
        safeRows(currentRows).forEach(row -> result.computeIfAbsent(row.productId(), ignored -> product(row))
                .addCurrent(row));
        safeRows(previousRows).forEach(row -> result.computeIfAbsent(row.productId(), ignored -> product(row))
                .addPrevious(row));
        return result;
    }

    private MutableProduct product(ExecutiveKpiDomainRepository.ProductPortfolioSalesRow row) {
        return new MutableProduct(row.productId(), row.productName(), row.sku(), row.category());
    }

    private List<ExecutiveKpiDomainRepository.ProductPortfolioSalesRow> safeRows(
            List<ExecutiveKpiDomainRepository.ProductPortfolioSalesRow> rows) {
        return rows == null ? List.of() : rows;
    }

    private ExecutiveKpiDomainRepository.ProductPortfolioSalesQuality quality(
            ExecutiveKpiDomainRepository.ProductPortfolioSalesQuality quality) {
        return quality == null
                ? new ExecutiveKpiDomainRepository.ProductPortfolioSalesQuality(0, 0, 0, 0, 0, 0)
                : quality;
    }

    private List<String> exchangeIssues(
            ExecutiveKpiScope scope,
            BusinessExchangeRatesResponse rates,
            Set<String> nativeCurrencies,
            LocalDate rateDate) {
        var convertedCurrencies = nativeCurrencies.stream()
                .filter(currency -> !currency.equals(scope.preferredCurrency()))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (convertedCurrencies.isEmpty()) return List.of();
        var relevantCurrencies = new LinkedHashSet<>(convertedCurrencies);
        if (!"USD".equals(scope.preferredCurrency())) relevantCurrencies.add(scope.preferredCurrency());
        relevantCurrencies.remove("USD");
        var sources = rates.sources() == null ? List.<com.indice.erp.exchange.BusinessExchangeRateSourceResponse>of()
                : rates.sources();
        var issues = new ArrayList<String>();
        var missing = relevantCurrencies.stream()
                .filter(currency -> sources.stream().noneMatch(source -> currency.equals(source.currencyCode())))
                .toList();
        if (!missing.isEmpty()) {
            issues.add("No existe evidencia de fuente cambiaria para: " + String.join(", ", missing) + ".");
        }
        var nonOfficial = sources.stream()
                .filter(source -> relevantCurrencies.contains(source.currencyCode()))
                .filter(source -> !"official".equalsIgnoreCase(source.status()))
                .map(source -> source.currencyCode() + " (" + source.status() + ")")
                .toList();
        if (!nonOfficial.isEmpty()) {
            issues.add("Tasas no oficiales o desactualizadas: " + String.join(", ", nonOfficial) + ".");
        }
        if (rates.metadata() == null || parseDate(rates.metadata().sourceDate()) == null) {
            issues.add("La referencia cambiaria no contiene una fecha de corte válida.");
        }
        if (ChronoUnit.DAYS.between(rateDate, scope.snapshotDate()) > 7) {
            issues.add("La referencia cambiaria tiene más de siete días de antigüedad.");
        }
        return issues;
    }

    private LocalDate rateDate(BusinessExchangeRatesResponse rates, LocalDate fallback) {
        var parsed = rates.metadata() == null ? null : parseDate(rates.metadata().sourceDate());
        return parsed == null ? fallback : parsed;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private void addCurrency(Set<String> currencies, String currency) {
        if (currency != null && currency.trim().toUpperCase(Locale.ROOT).matches("[A-Z]{3}")) {
            currencies.add(currency.trim().toUpperCase(Locale.ROOT));
        }
    }

    private void addCountIssue(List<String> issues, int count, String description) {
        if (count > 0) issues.add(count + " " + description + ".");
    }

    private String categoryKey(String category) {
        return category == null || category.isBlank()
                ? "uncategorized"
                : category.trim().toLowerCase(Locale.ROOT);
    }

    private BigDecimal percent(BigDecimal value, BigDecimal total) {
        if (value == null || total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return value.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static final class MutableProduct {
        private final long productId;
        private final String productName;
        private final String sku;
        private final String category;
        private final List<KpiMoneyAmount> currentAmounts = new ArrayList<>();
        private final List<KpiMoneyAmount> previousAmounts = new ArrayList<>();
        private final List<KpiMoneyAmount> currentCostAmounts = new ArrayList<>();
        private BigDecimal currentUnits = BigDecimal.ZERO;
        private BigDecimal previousUnits = BigDecimal.ZERO;
        private int currentSaleCount;
        private int previousSaleCount;
        private int currentMissingCostLines;

        private MutableProduct(long productId, String productName, String sku, String category) {
            this.productId = productId;
            this.productName = productName == null ? "" : productName;
            this.sku = sku == null ? "" : sku;
            this.category = category == null || category.isBlank() ? "uncategorized" : category;
        }

        private void addCurrent(ExecutiveKpiDomainRepository.ProductPortfolioSalesRow row) {
            currentAmounts.add(new KpiMoneyAmount(row.revenue(), row.currency()));
            currentCostAmounts.add(new KpiMoneyAmount(row.cost(), row.costCurrency()));
            currentUnits = currentUnits.add(row.units() == null ? BigDecimal.ZERO : row.units());
            currentSaleCount += row.saleCount();
            currentMissingCostLines += row.missingCostLines();
        }

        private void addPrevious(ExecutiveKpiDomainRepository.ProductPortfolioSalesRow row) {
            previousAmounts.add(new KpiMoneyAmount(row.revenue(), row.currency()));
            previousUnits = previousUnits.add(row.units() == null ? BigDecimal.ZERO : row.units());
            previousSaleCount += row.saleCount();
        }
    }

    private record CalculatedProduct(
            MutableProduct source,
            BigDecimal currentRevenue,
            BigDecimal previousRevenue,
            BigDecimal currentCost,
            boolean costAvailable,
            boolean partial,
            ExecutiveKpiDomainRepository.ProductPortfolioInventoryRow inventory) {
    }
}
