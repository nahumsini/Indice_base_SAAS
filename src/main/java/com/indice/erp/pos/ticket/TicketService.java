package com.indice.erp.pos.ticket;

import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.payment.PaymentMapper;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.ticket.dto.PosTicketDetailResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketService {

    private static final ZoneId OPERATIONAL_ZONE = ZoneId.of("America/Toronto");

    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final TicketMapper ticketMapper;
    private final PaymentMapper paymentMapper;
    private final KpiCurrencyAggregationService currencyAggregationService;
    private final BusinessExchangeRateService exchangeRateService;

    public TicketService(
            TicketRepository ticketRepository,
            PaymentRepository paymentRepository,
            TicketMapper ticketMapper,
            PaymentMapper paymentMapper,
            KpiCurrencyAggregationService currencyAggregationService,
            BusinessExchangeRateService exchangeRateService) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.ticketMapper = ticketMapper;
        this.paymentMapper = paymentMapper;
        this.currencyAggregationService = currencyAggregationService;
        this.exchangeRateService = exchangeRateService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context) {
        var items = ticketRepository.findAll(context).stream().map(ticketMapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional(readOnly = true)
    public KpiMonetaryAggregate summarizeToday(PosContext context, String preferredCurrency) {
        var businessDate = LocalDate.now(OPERATIONAL_ZONE);
        var fromInclusive = businessDate.atStartOfDay(OPERATIONAL_ZONE).toInstant();
        var toExclusive = businessDate.plusDays(1).atStartOfDay(OPERATIONAL_ZONE).toInstant();
        var rates = exchangeRateService.loadDailyRates();
        var metadata = rates.metadata();
        return currencyAggregationService.aggregate(
            ticketRepository.summarizeCompletedSalesBetween(context, fromInclusive, toExclusive),
            preferredCurrency == null || preferredCurrency.isBlank() ? "MXN" : preferredCurrency,
            rates.ratesPerUsd(),
            "daily",
            parseSourceDate(metadata == null ? null : metadata.sourceDate()),
            metadata == null ? "" : metadata.sourceName()
        );
    }

    @Transactional(readOnly = true)
    public PosTicketDetailResponse get(PosContext context, long ticketId) {
        var ticket = ticketRepository.findById(context, ticketId)
            .orElseThrow(() -> new NoSuchElementException("Ticket not found."));
        var items = ticketRepository.findItems(context, ticketId).stream().map(ticketMapper::toResponse).toList();
        var payments = paymentRepository.findByTicketId(context, ticketId).stream().map(paymentMapper::toResponse).toList();
        return new PosTicketDetailResponse(ticketMapper.toResponse(ticket), items, payments);
    }

    private LocalDate parseSourceDate(String value) {
        try {
            return value == null || value.isBlank() ? LocalDate.now(OPERATIONAL_ZONE) : LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            return LocalDate.now(OPERATIONAL_ZONE);
        }
    }
}
