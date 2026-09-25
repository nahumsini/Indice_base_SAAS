package com.indice.erp.pos.checkout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.dto.PosCheckoutItemRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.payment.PaymentMapper;
import com.indice.erp.pos.discount.DiscountRuleService;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutLine;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutOrder;
import com.indice.erp.pos.restaurant.RestaurantOrderService;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketItemResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskRepository;
import com.indice.erp.pos.payment.PaymentRecord;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.status.PaymentStatus;
import com.indice.erp.pos.status.ShiftStatus;
import com.indice.erp.pos.status.TicketStatus;
import com.indice.erp.pos.ticket.TicketInsertCommand;
import com.indice.erp.pos.ticket.TicketItemRecord;
import com.indice.erp.pos.ticket.TicketMapper;
import com.indice.erp.pos.ticket.TicketRecord;
import com.indice.erp.pos.ticket.TicketRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SpecificPosCheckoutTest {

    @Mock CashRegisterService cashRegisterService;
    @Mock ShiftRepository shiftRepository;
    @Mock CheckoutLookupRepository lookupRepository;
    @Mock SalesRecordSummaryRepository salesRecordSummaryRepository;
    @Mock TicketRepository ticketRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock InventoryDeductionService inventoryDeductionService;
    @Mock DiscountRuleService discountRuleService;
    @Mock SelfServiceKioskRepository selfServiceKioskRepository;
    @Mock RestaurantOrderService restaurantOrderService;

    private final TicketMapper ticketMapper = new TicketMapper();
    private final PaymentMapper paymentMapper = new PaymentMapper();
    private final CheckoutCalculator calculator = new CheckoutCalculator();
    private final CheckoutValidator validator = new CheckoutValidator();

    @Test
    void checkoutRequiresOpenShift() {
        var service = service();
        when(cashRegisterService.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shiftRepository.findOpenByUserAndRegister(context(), 20L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.checkout(context(), request("CASH", "10.0000")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Open shift required for checkout.");
    }

    @Test
    void checkoutAcceptsCreditWithoutIncreasingExpectedCash() {
        var service = readyService();
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItem()));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any())).thenReturn(List.of(paymentRecord(PaymentMethod.CREDIT)));

        var response = service.checkout(context(), request("CREDIT", "10.0000"));

        verify(paymentRepository).insertAll(eq(context()), eq(100L), any());
        verify(shiftRepository, never()).increaseExpectedCash(eq(context()), eq(40L), any());
        assertThat(response.payments()).hasSize(1);
        assertThat(response.payments().getFirst().paymentMethod()).isEqualTo(PaymentMethod.CREDIT);
    }

    @Test
    void checkoutRecalculatesTotalsFromItems() {
        var lines = calculator.lines(List.of(item("2", "10", "1", "3")), "MXN", productId -> null);
        var payments = calculator.payments(List.of(payment("CASH", "22.0000")), "MXN");
        var totals = calculator.totals(lines, payments);

        assertThat(totals.subtotalAmount()).isEqualByComparingTo("20.0000");
        assertThat(totals.discountAmount()).isEqualByComparingTo("1.0000");
        assertThat(totals.taxAmount()).isEqualByComparingTo("3.0000");
        assertThat(totals.totalAmount()).isEqualByComparingTo("22.0000");
    }

    @Test
    void checkoutRejectsPaymentMismatch() {
        var lines = calculator.lines(List.of(item("1", "10", "0", "0")), "MXN", productId -> null);
        var payments = calculator.payments(List.of(payment("CASH", "9.0000")), "MXN");

        assertThatThrownBy(() -> validator.validateTotals(calculator.totals(lines, payments)))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Paid amount must equal total amount.");
    }

    @Test
    void checkoutRejectsShiftWhoseWarehouseScopeDiffersFromRegister() {
        var mismatchedShift = new ShiftRecord(
            40L, 1L, 5L, 6L, 99L, 20L, "Register 1", 10L, null, ShiftStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "MXN", Instant.now(), null, null, null,
            10L, null, Instant.now(), Instant.now(), 0L, null, null
        );

        assertThatThrownBy(() -> validator.requireOpenShift(context(), mismatchedShift, register()))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Open shift scope does not match the cash register warehouse. Close the shift and open a new one.");
    }

    @Test
    void checkoutIncreasesExpectedCashOnlyForCash() {
        var service = readyService();
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItem()));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any())).thenReturn(List.of(paymentRecord(PaymentMethod.CASH)));
        when(shiftRepository.increaseExpectedCash(eq(context()), eq(40L), any())).thenReturn(true);

        service.checkout(context(), mixedPaymentRequest());

        var cashCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        verify(shiftRepository).increaseExpectedCash(eq(context()), eq(40L), cashCaptor.capture());
        assertThat(cashCaptor.getValue()).isEqualByComparingTo("4.0000");
    }

    @Test
    void completedTicketIsPersistedWithItemsAndPayments() {
        var service = readyService();
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItem()));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any())).thenReturn(List.of(paymentRecord(PaymentMethod.CARD)));

        var response = service.checkout(context(), request("CARD", "10.0000"));

        verify(salesRecordSummaryRepository).insert(eq(context()), any());
        verify(ticketRepository).insert(eq(context()), any(TicketInsertCommand.class));
        verify(ticketRepository).insertItems(eq(context()), eq(100L), any());
        verify(paymentRepository).insertAll(eq(context()), eq(100L), any());
        verify(shiftRepository, never()).increaseExpectedCash(eq(context()), eq(40L), any());
        assertThat(response.ticket().status()).isEqualTo(TicketStatus.COMPLETED);
        assertThat(response.items()).hasSize(1);
        assertThat(response.payments()).hasSize(1);
    }

    @Test
    void checkoutCallsInventoryDeductionBeforePersistingPayments() {
        var service = readyService();
        when(lookupRepository.findProduct(context(), 700L)).thenReturn(Optional.of(stockProduct()));
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItemWithProduct()));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any())).thenReturn(List.of(paymentRecord(PaymentMethod.CARD)));

        service.checkout(context(), stockProductRequest("CARD", "10.0000"));

        verify(inventoryDeductionService).deduct(eq(context()), any(ShiftRecord.class), any(TicketRecord.class),
            any(), any());
        verify(paymentRepository).insertAll(eq(context()), eq(100L), any());
    }

    @Test
    void inventoryFailureStopsPaymentAndCashUpdates() {
        var service = readyService();
        when(lookupRepository.findProduct(context(), 700L)).thenReturn(Optional.of(stockProduct()));
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItemWithProduct()));
        doThrow(PosApiException.badRequest("Insufficient stock for Coffee in selected warehouse."))
            .when(inventoryDeductionService).deduct(eq(context()), any(ShiftRecord.class), any(TicketRecord.class),
                any(), any());

        assertThatThrownBy(() -> service.checkout(context(), stockProductRequest("CASH", "10.0000")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Insufficient stock for Coffee in selected warehouse.");

        verify(paymentRepository, never()).insertAll(eq(context()), eq(100L), any());
        verify(shiftRepository, never()).increaseExpectedCash(eq(context()), eq(40L), any());
    }

    @Test
    void claimedPreticketCompletesAtomicallyWithItsPosTicket() {
        when(cashRegisterService.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shiftRepository.findOpenByUserAndRegister(context(), 20L)).thenReturn(Optional.of(shift()));
        when(ticketRepository.existsTicketNumber(eq(context()), any())).thenReturn(false);
        when(salesRecordSummaryRepository.insert(eq(context()), any())).thenReturn(500L);
        when(lookupRepository.findProduct(context(), 700L)).thenReturn(Optional.of(stockProduct()));
        when(selfServiceKioskRepository.lockClaimedForCheckout(eq(context()), eq(41L), any(CashRegisterRecord.class)))
            .thenReturn(Optional.of(preticket()));
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(ticketItemWithProduct()));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any())).thenReturn(List.of(paymentRecord(PaymentMethod.CARD)));
        when(selfServiceKioskRepository.completeClaim(eq(context()), eq(41L), any(CashRegisterRecord.class), eq(100L)))
            .thenReturn(true);
        var service = CheckoutTestFactory.create(new CheckoutDependencies(
            cashRegisterService, shiftRepository, lookupRepository, salesRecordSummaryRepository,
            ticketRepository, paymentRepository, inventoryDeductionService, ticketMapper, paymentMapper,
            calculator, validator, discountRuleService, selfServiceKioskRepository, null, null));

        service.checkout(context(), new PosCheckoutRequest(
            20L, null, 41L, "MXN", List.of(itemWithProduct("1", "10", "0", "0")),
            List.of(payment("CARD", "10.0000")), null));

        verify(selfServiceKioskRepository).completeClaim(eq(context()), eq(41L), any(CashRegisterRecord.class), eq(100L));
    }

    @Test
    void restaurantOrderWithTheSameProductInMultipleRoundsCompletesWithItsTicket() {
        when(cashRegisterService.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shiftRepository.findOpenByUserAndRegister(context(), 20L)).thenReturn(Optional.of(shift()));
        when(ticketRepository.existsTicketNumber(eq(context()), any())).thenReturn(false);
        when(salesRecordSummaryRepository.insert(eq(context()), any())).thenReturn(500L);
        when(lookupRepository.findProduct(context(), 700L)).thenReturn(Optional.of(stockProduct()));
        when(restaurantOrderService.requireClaimedForCheckout(context(), 81L, 20L))
            .thenReturn(new RestaurantCheckoutOrder(
                81L, 1L, 20L, "ORD-81", "MXN", 10L,
                List.of(
                    new RestaurantCheckoutLine(700L, "SKU-700", "Coffee", BigDecimal.ONE,
                        new BigDecimal("10.0000"), new BigDecimal("10.0000")),
                    new RestaurantCheckoutLine(700L, "SKU-700", "Coffee", new BigDecimal("2.0000"),
                        new BigDecimal("10.0000"), new BigDecimal("20.0000")))));
        when(ticketRepository.insert(eq(context()), any())).thenReturn(ticket());
        when(ticketRepository.insertItems(eq(context()), eq(100L), any())).thenReturn(List.of(
            ticketItemWithProduct(),
            new TicketItemRecord(201L, 1L, 100L, 700L, "SKU-700", "Coffee", "Product",
                new BigDecimal("2.0000"), new BigDecimal("10.0000"), BigDecimal.ZERO,
                BigDecimal.ZERO, new BigDecimal("20.0000"), "MXN", null, Instant.now())));
        when(paymentRepository.insertAll(eq(context()), eq(100L), any()))
            .thenReturn(List.of(paymentRecord(PaymentMethod.CARD)));
        var service = CheckoutTestFactory.create(new CheckoutDependencies(
            cashRegisterService, shiftRepository, lookupRepository, salesRecordSummaryRepository,
            ticketRepository, paymentRepository, inventoryDeductionService, ticketMapper, paymentMapper,
            calculator, validator, discountRuleService, selfServiceKioskRepository, restaurantOrderService, null));

        service.checkout(context(), new PosCheckoutRequest(
            20L, null, null, 81L, "MXN",
            List.of(
                itemWithProduct("1", "10", "0", "0"),
                itemWithProduct("2", "10", "0", "0")),
            List.of(payment("CARD", "30.0000")), null));

        verify(restaurantOrderService).completeCheckout(context(), 81L, 20L, 100L);
    }

    private CheckoutService readyService() {
        when(cashRegisterService.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shiftRepository.findOpenByUserAndRegister(context(), 20L)).thenReturn(Optional.of(shift()));
        when(ticketRepository.existsTicketNumber(eq(context()), any())).thenReturn(false);
        when(salesRecordSummaryRepository.insert(eq(context()), any())).thenReturn(500L);
        return service();
    }

    private CheckoutService service() {
        return CheckoutTestFactory.create(new CheckoutDependencies(cashRegisterService, shiftRepository, lookupRepository, salesRecordSummaryRepository,
            ticketRepository, paymentRepository, inventoryDeductionService, ticketMapper, paymentMapper, calculator,
            validator, null, null, null, null));
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private CashRegisterRecord register() {
        return new CashRegisterRecord(20L, 1L, 5L, 6L, 30L, "Main", "REG-1", "Register 1",
            CashRegisterStatus.ACTIVE, true, null, 10L, null, Instant.now(), Instant.now(), null, 0L, null, null);
    }

    private ShiftRecord shift() {
        return new ShiftRecord(40L, 1L, 5L, 6L, 30L, 20L, "Register 1", 10L, null, ShiftStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "MXN", Instant.now(), null, null, null,
            10L, null, Instant.now(), Instant.now(), 0L, null, null);
    }

    private PosCheckoutRequest request(String method, String amount) {
        return new PosCheckoutRequest(20L, null, "MXN", List.of(item("1", "10", "0", "0")),
            List.of(payment(method, amount)), null);
    }

    private PosCheckoutRequest stockProductRequest(String method, String amount) {
        return new PosCheckoutRequest(20L, null, "MXN", List.of(itemWithProduct("1", "10", "0", "0")),
            List.of(payment(method, amount)), null);
    }

    private PosCheckoutRequest mixedPaymentRequest() {
        return new PosCheckoutRequest(20L, null, "MXN", List.of(item("1", "10", "0", "0")),
            List.of(payment("CASH", "4"), payment("CARD", "6")), null);
    }

    private PosCheckoutItemRequest item(String quantity, String price, String discount, String tax) {
        return new PosCheckoutItemRequest(null, "Coffee", null, "product", new BigDecimal(quantity),
            new BigDecimal(price), new BigDecimal(discount), new BigDecimal(tax));
    }

    private PosCheckoutItemRequest itemWithProduct(String quantity, String price, String discount, String tax) {
        return new PosCheckoutItemRequest(700L, "Coffee", "SKU-700", "product", new BigDecimal(quantity),
            new BigDecimal(price), new BigDecimal(discount), new BigDecimal(tax));
    }

    private PosCheckoutPaymentRequest payment(String method, String amount) {
        return new PosCheckoutPaymentRequest(method, null, new BigDecimal(amount), null);
    }

    private ProductSnapshot stockProduct() {
        return new ProductSnapshot(700L, "SKU-700", "Coffee", "Product", true);
    }

    private PreticketResponse preticket() {
        var now = Instant.now();
        return new PreticketResponse(
            41L, 51L, 20L, "Register 1", "SS-1", "1234", "CLAIMED", "MXN",
            null, 1, new BigDecimal("10.0000"), BigDecimal.ZERO, null,
            new BigDecimal("10.0000"), now.plusSeconds(600), now,
            List.of(new PreticketItemResponse(
                700L, "SKU-700", "Coffee", BigDecimal.ONE, new BigDecimal("10.0000"),
                BigDecimal.ZERO, null, new BigDecimal("10.0000"))));
    }

    private TicketRecord ticket() {
        return new TicketRecord(100L, 1L, 5L, 6L, 30L, 20L, 40L, null, 500L, "POS-1",
            TicketStatus.COMPLETED, "POS", "MXN", new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO,
            new BigDecimal("10.0000"), new BigDecimal("10.0000"), BigDecimal.ZERO, "POS Customer",
            null, null, Instant.now(), 10L, null, Instant.now(), Instant.now(), 0L, null, null);
    }

    private TicketItemRecord ticketItem() {
        return new TicketItemRecord(200L, 1L, 100L, null, null, "Coffee", "product", BigDecimal.ONE,
            new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0000"),
            "MXN", null, Instant.now());
    }

    private TicketItemRecord ticketItemWithProduct() {
        return new TicketItemRecord(200L, 1L, 100L, 700L, "SKU-700", "Coffee", "Product", BigDecimal.ONE,
            new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0000"),
            "MXN", null, Instant.now());
    }

    private PaymentRecord paymentRecord(PaymentMethod method) {
        return new PaymentRecord(300L, 1L, 100L, 40L, 20L, method, null, new BigDecimal("10.0000"),
            "MXN", null, PaymentStatus.CAPTURED, Instant.now(), 10L, null);
    }
}
