package com.indice.erp.pos.checkout;

import com.indice.erp.pos.checkout.dto.PosCheckoutItemRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class CheckoutCalculator {

    static final int MONEY_SCALE = 4;

    public List<CheckoutLine> lines(List<PosCheckoutItemRequest> items, String currencyCode, ProductResolver resolver) {
        return items.stream()
            .map(item -> line(item, normalizeCurrency(currencyCode), resolver.resolve(item.productId())))
            .toList();
    }

    public List<CheckoutPayment> payments(List<PosCheckoutPaymentRequest> payments, String currencyCode) {
        return payments.stream()
            .map(payment -> new CheckoutPayment(
                paymentMethod(payment.paymentMethod()),
                payment.paymentAccountId(),
                money(payment.amount()),
                normalizeCurrency(currencyCode),
                trimToNull(payment.reference())
            ))
            .toList();
    }

    public CheckoutTotals totals(List<CheckoutLine> lines, List<CheckoutPayment> payments) {
        var subtotal = lines.stream()
            .map(line -> money(line.quantity().multiply(line.unitPrice())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var discount = lines.stream().map(CheckoutLine::discountAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var tax = lines.stream().map(CheckoutLine::taxAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var total = money(subtotal.subtract(discount).add(tax));
        var paid = payments.stream().map(CheckoutPayment::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var cash = payments.stream()
            .filter(payment -> payment.paymentMethod() == PaymentMethod.CASH)
            .map(CheckoutPayment::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CheckoutTotals(
            money(subtotal), money(discount), money(tax), total, money(paid), money(total.subtract(paid)), money(cash)
        );
    }

    static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    static String normalizeCurrency(String value) {
        return normalizeCode(value);
    }

    static String normalizeCode(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private PaymentMethod paymentMethod(String value) {
        try {
            return PaymentMethod.valueOf(normalizeCode(value));
        } catch (IllegalArgumentException ex) {
            throw PosApiException.badRequest("Unsupported payment method.");
        }
    }

    private CheckoutLine line(PosCheckoutItemRequest item, String currencyCode, ProductSnapshot product) {
        var quantity = money(item.quantity());
        var unitPrice = money(item.unitPrice());
        var discount = money(item.discountAmount());
        var tax = money(item.taxAmount());
        var lineTotal = money(quantity.multiply(unitPrice).subtract(discount).add(tax));

        return new CheckoutLine(
            item.productId(),
            product == null ? trimToNull(item.sku()) : trimToNull(product.sku()),
            product == null ? item.productName().trim() : product.name(),
            product == null ? trimToNull(item.productType()) : trimToNull(product.type()),
            quantity,
            unitPrice,
            discount,
            tax,
            lineTotal,
            currencyCode,
            product != null && product.stockTracked()
        );
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }

    public interface ProductResolver {
        ProductSnapshot resolve(Long productId);
    }
}
