package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.CheckoutCalculator;
import com.indice.erp.pos.checkout.CheckoutLookupRepository;
import com.indice.erp.pos.checkout.CheckoutService;
import com.indice.erp.pos.checkout.CheckoutValidator;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentRequestPreparer {

    private final CashRegisterService cashRegisters;
    private final ShiftRepository shifts;
    private final CheckoutLookupRepository lookup;
    private final CheckoutCalculator calculator;
    private final CheckoutValidator validator;
    private final CheckoutService checkoutService;
    private final ObjectMapper objectMapper;

    SquarePaymentRequestPreparer(CashRegisterService cashRegisters, ShiftRepository shifts,
            CheckoutLookupRepository lookup, CheckoutCalculator calculator, CheckoutValidator validator,
            CheckoutService checkoutService, ObjectMapper objectMapper) {
        this.cashRegisters = cashRegisters;
        this.shifts = shifts;
        this.lookup = lookup;
        this.calculator = calculator;
        this.validator = validator;
        this.checkoutService = checkoutService;
        this.objectMapper = objectMapper;
    }

    Draft prepare(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        var shift = requireOpenShift(context, request.cashRegisterId());
        var checkoutJson = json(request);
        var amount = total(context, request);
        var currencyCode = currency(request.currencyCode());
        checkoutService.validateForCheckout(context, checkoutRequest(request, amount, currencyCode));
        return new Draft(shift, checkoutJson, SquareHashing.sha256(checkoutJson), amount,
            currencyCode, key(request.idempotencyKey()));
    }

    private ShiftRecord requireOpenShift(PosContext context, long registerId) {
        var register = cashRegisters.requireOperationalRegister(context, registerId);
        var shift = shifts.findOpenByUserAndRegister(context, register.id()).orElse(null);
        validator.requireOpenShift(context, shift, register);
        return shift;
    }

    private BigDecimal total(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        var lines = calculator.lines(request.items(), currency(request.currencyCode()), id -> id == null ? null
            : lookup.findProduct(context, id).orElseThrow(() -> PosApiException.badRequest(
                "Product does not belong to this company.")));
        validator.validateLines(lines);
        var total = lines.stream().map(line -> line.lineTotalAmount())
            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(4, RoundingMode.HALF_UP);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw PosApiException.badRequest("Square payment amount must be greater than zero.");
        }
        return total;
    }

    private PosCheckoutRequest checkoutRequest(
            SquareTerminalDtos.CreatePaymentRequest request, BigDecimal amount, String currency) {
        return new PosCheckoutRequest(request.cashRegisterId(), request.customerId(), request.preticketId(),
            request.restaurantOrderId(), currency, request.items(),
            List.of(new PosCheckoutPaymentRequest("CARD", null, amount, "Square preflight")),
            request.notes());
    }

    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception ex) { throw PosApiException.badRequest("Square checkout payload is invalid."); }
    }

    private String key(String value) {
        var key = value == null ? "" : value.trim();
        if (key.isBlank() || key.length() > 64) {
            throw PosApiException.badRequest("Square idempotency key is invalid.");
        }
        return key;
    }

    private String currency(String value) {
        var code = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (code.length() != 3) throw PosApiException.badRequest("currencyCode must be a 3-letter code.");
        return code;
    }

    record Draft(ShiftRecord shift, String checkoutJson, String payloadHash,
                 BigDecimal amount, String currencyCode, String idempotencyKey) {
    }
}
