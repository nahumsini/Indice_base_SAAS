package com.indice.erp.sales.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class SalesReportingContracts {
    private SalesReportingContracts() { }
    public record Filter(LocalDate from, LocalDate to, String search, String origin, String channel,
        String status, Long unitId, Long businessId, int page, int pageSize, String sort, String direction) { }
    public record Sale(long id, String number, LocalDate date, String origin, String channel,
        String customer, String seller, Long unitId, String unitName, Long businessId, String businessName,
        String currency, BigDecimal total, BigDecimal tax, BigDecimal discount,
        String commercialStatus, String financeStatus, String inventoryStatus, String deliveryStatus,
        Long ticketId, String ticketNumber) { }
    public record NativeGroup(String origin, String channel, String currency, long records, long active,
        long cancelled, BigDecimal total, BigDecimal tax, BigDecimal beforeTax) { }
    public record NativeDay(LocalDate date, String currency, long active, BigDecimal total) { }
    public record Unit(long id, String name) { }
    public record Business(long id, long unitId, String name) { }
    public record Channel(String origin, String channel) { }
    public record Options(List<Unit> units, List<Business> businesses, List<Channel> channels) { }
    public record Page(List<Sale> items, long total, List<NativeGroup> groups, List<NativeDay> history, Options options) { }
}
