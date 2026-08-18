package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.checkout.dto.PosPrintableSummary;
import com.indice.erp.pos.payment.PaymentInsertCommand;
import com.indice.erp.pos.payment.PaymentMapper;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.PaymentStatus;
import com.indice.erp.pos.status.TicketStatus;
import com.indice.erp.pos.ticket.TicketInsertCommand;
import com.indice.erp.pos.ticket.TicketItemInsertCommand;
import com.indice.erp.pos.ticket.TicketMapper;
import com.indice.erp.pos.ticket.TicketRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckoutService {

    private static final DateTimeFormatter TICKET_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final CashRegisterService cashRegisterService;
    private final ShiftRepository shiftRepository;
    private final CheckoutLookupRepository lookupRepository;
    private final SalesRecordSummaryRepository salesRecordSummaryRepository;
    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryDeductionService inventoryDeductionService;
    private final TicketMapper ticketMapper;
    private final PaymentMapper paymentMapper;
    private final CheckoutCalculator calculator;
    private final CheckoutValidator validator;

    public CheckoutService(
            CashRegisterService cashRegisterService,
            ShiftRepository shiftRepository,
            CheckoutLookupRepository lookupRepository,
            SalesRecordSummaryRepository salesRecordSummaryRepository,
            TicketRepository ticketRepository,
            PaymentRepository paymentRepository,
            InventoryDeductionService inventoryDeductionService,
            TicketMapper ticketMapper,
            PaymentMapper paymentMapper,
            CheckoutCalculator calculator,
            CheckoutValidator validator) {
        this.cashRegisterService = cashRegisterService;
        this.shiftRepository = shiftRepository;
        this.lookupRepository = lookupRepository;
        this.salesRecordSummaryRepository = salesRecordSummaryRepository;
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryDeductionService = inventoryDeductionService;
        this.ticketMapper = ticketMapper;
        this.paymentMapper = paymentMapper;
        this.calculator = calculator;
        this.validator = validator;
    }

    @Transactional
    public PosCheckoutResponse checkout(PosContext context, PosCheckoutRequest request) {
        validator.validateRequest(request);
        var register = cashRegisterService.requireOperationalRegister(context, request.cashRegisterId());
        var shift = shiftRepository.findOpenByUserAndRegister(context, register.id()).orElse(null);
        validator.requireOpenShift(context, shift, register);

        var currency = CheckoutCalculator.normalizeCurrency(request.currencyCode());
        requireShiftCurrency(shift, currency);
        var customer = customer(context, request.customerId());
        var lines = calculator.lines(request.items(), currency, productResolver(context));
        var payments = calculator.payments(request.payments(), currency);
        var totals = calculator.totals(lines, payments);
        validator.validateLines(lines);
        validator.validatePayments(payments);
        validator.validateTotals(totals);

        var ticketNumber = nextTicketNumber(context);
        var inventoryExpected = hasInventoryDeduction(lines);
        var salesRecordId = salesRecordSummaryRepository.insert(
            context,
            salesRecordCommand(context, shift, customer, ticketNumber, lines, payments, totals, request.notes(),
                inventoryExpected)
        );
        var ticket = ticketRepository.insert(context, new TicketInsertCommand(
            shift.unitId(), shift.businessId(), shift.warehouseId(), shift.cashRegisterId(), shift.id(),
            customer == null ? null : customer.id(), salesRecordId, ticketNumber, TicketStatus.COMPLETED,
            currency, totals.subtotalAmount(), totals.discountAmount(), totals.taxAmount(), totals.totalAmount(),
            totals.paidAmount(), totals.balanceAmount(), customerName(customer), taxId(customer),
            trimToNull(request.notes()), context.userId(), metadataJson(inventoryExpected)
        ));
        var itemRecords = ticketRepository.insertItems(context, ticket.id(), itemCommands(lines));
        inventoryDeductionService.deduct(context, shift, ticket, lines, itemRecords);
        var paymentRecords = paymentRepository.insertAll(context, ticket.id(), paymentCommands(context, shift, payments));
        increaseShiftExpectedCash(context, shift, totals.cashPaidAmount());

        return new PosCheckoutResponse(
            ticketMapper.toResponse(ticket),
            itemRecords.stream().map(ticketMapper::toResponse).toList(),
            paymentRecords.stream().map(paymentMapper::toResponse).toList(),
            new PosPrintableSummary(ticket.ticketNumber(), customerName(customer), ticket.currencyCode(),
                ticket.subtotalAmount(), ticket.discountAmount(), ticket.taxAmount(), ticket.totalAmount(),
                ticket.paidAmount(), ticket.completedAt())
        );
    }

    private CheckoutCalculator.ProductResolver productResolver(PosContext context) {
        return productId -> {
            if (productId == null) {
                return null;
            }
            return lookupRepository.findProduct(context, productId)
                .orElseThrow(() -> PosApiException.badRequest("Product does not belong to this company."));
        };
    }

    private CustomerSnapshot customer(PosContext context, Long customerId) {
        if (customerId == null) {
            return null;
        }
        return lookupRepository.findCustomer(context, customerId)
            .orElseThrow(() -> PosApiException.badRequest("Customer does not belong to this company."));
    }

    private void requireShiftCurrency(ShiftRecord shift, String currency) {
        if (!CheckoutCalculator.normalizeCurrency(shift.currencyCode()).equals(currency)) {
            throw PosApiException.badRequest("Checkout currency must match the open shift currency.");
        }
    }

    private String nextTicketNumber(PosContext context) {
        for (var i = 0; i < 5; i++) {
            var suffix = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
            var ticketNumber = "POS-" + LocalDateTime.now().format(TICKET_FORMAT) + "-" + suffix;
            if (!ticketRepository.existsTicketNumber(context, ticketNumber)) {
                return ticketNumber;
            }
        }
        throw PosApiException.conflict("Could not generate POS ticket number.");
    }

    private List<TicketItemInsertCommand> itemCommands(List<CheckoutLine> lines) {
        return lines.stream().map(line -> new TicketItemInsertCommand(
            line.productId(), truncate(line.skuSnapshot(), 120), truncate(line.productNameSnapshot(), 240),
            truncate(line.productTypeSnapshot(), 40), line.quantity(), line.unitPrice(), line.discountAmount(),
            line.taxAmount(), line.lineTotalAmount(), line.currencyCode(), null
        )).toList();
    }

    private List<PaymentInsertCommand> paymentCommands(
            PosContext context,
            ShiftRecord shift,
            List<CheckoutPayment> payments) {
        return payments.stream().map(payment -> new PaymentInsertCommand(
            shift.id(), shift.cashRegisterId(), payment.paymentMethod(), payment.paymentAccountId(),
            payment.amount(), payment.currencyCode(), truncate(payment.reference(), 160),
            PaymentStatus.CAPTURED, context.userId(), null
        )).toList();
    }

    private void increaseShiftExpectedCash(PosContext context, ShiftRecord shift, BigDecimal cashPaidAmount) {
        if (cashPaidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (!shiftRepository.increaseExpectedCash(context, shift.id(), cashPaidAmount)) {
            throw PosApiException.conflict("Open shift cash total could not be updated.");
        }
    }

    private SalesRecordSummaryCommand salesRecordCommand(
            PosContext context,
            ShiftRecord shift,
            CustomerSnapshot customer,
            String ticketNumber,
            List<CheckoutLine> lines,
            List<CheckoutPayment> payments,
            CheckoutTotals totals,
            String notes,
            boolean inventoryDeducted) {
        return new SalesRecordSummaryCommand(
            shift.unitId(), shift.businessId(), ticketNumber, customerName(customer), context.userName(),
            totals.totalAmount(), totals.subtotalAmount(), totals.discountAmount(), totals.taxAmount(),
            lines.getFirst().currencyCode(), paymentMethodSummary(payments), paymentReferenceSummary(payments),
            PosJsonSupport.toJson(lines), trimToNull(notes), metadataJson(inventoryDeducted), inventoryDeducted
        );
    }

    private String paymentMethodSummary(List<CheckoutPayment> payments) {
        return payments.size() == 1 ? payments.getFirst().paymentMethod().name() : "MIXED";
    }

    private String paymentReferenceSummary(List<CheckoutPayment> payments) {
        return payments.stream().map(CheckoutPayment::reference).filter(value -> value != null && !value.isBlank())
            .findFirst().map(value -> truncate(value, 120)).orElse(null);
    }

    private boolean hasInventoryDeduction(List<CheckoutLine> lines) {
        return lines.stream().anyMatch(line -> line.stockTracked() && line.productId() != null);
    }

    private String metadataJson(boolean inventoryDeducted) {
        return PosJsonSupport.toJson(Map.of("source", "POS", "inventoryDeducted", inventoryDeducted));
    }

    private String customerName(CustomerSnapshot customer) {
        var name = customer == null ? null : truncate(customer.name(), 220);
        return name == null ? "POS Customer" : name;
    }

    private String taxId(CustomerSnapshot customer) {
        return customer == null ? null : truncate(customer.taxId(), 80);
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }

    private String truncate(String value, int maxLength) {
        var trimmed = trimToNull(value);
        return trimmed == null || trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
