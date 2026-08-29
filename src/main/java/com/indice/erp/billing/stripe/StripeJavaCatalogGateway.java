package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.Coupon;
import com.stripe.model.Price;
import com.stripe.model.Product;
import com.stripe.model.PromotionCode;
import com.stripe.net.RequestOptions;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaCatalogGateway implements StripeCatalogGateway {

    private final StripeSecretProvider secrets;

    public StripeJavaCatalogGateway(StripeSecretProvider secrets) {
        this.secrets = secrets;
    }

    @Override
    public AccountResult account() {
        requireConfiguredMode();
        try {
            var account = Account.retrieve(requestOptions());
            return new AccountResult(
                account.getId(),
                Boolean.TRUE.equals(account.getChargesEnabled()),
                Boolean.TRUE.equals(account.getPayoutsEnabled())
            );
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo identificar la cuenta de Stripe configurada.", exception);
        }
    }

    @Override
    public ProductResult upsertProduct(ProductCommand command, String idempotencyKey) {
        requireConfiguredMode();
        var params = new LinkedHashMap<String, Object>();
        params.put("name", command.name());
        params.put("tax_code", command.taxCode());
        params.put("active", true);
        params.put("metadata", Map.of("indice_catalog_reference", command.catalogReference()));
        try {
            Product product;
            if (command.externalProductId() == null || command.externalProductId().isBlank()) {
                product = Product.create(params, requestOptions(idempotencyKey));
            } else {
                product = Product.retrieve(command.externalProductId(), requestOptions())
                    .update(params, requestOptions(idempotencyKey));
            }
            requireMatchingMode(Boolean.TRUE.equals(product.getLivemode()), "producto");
            return new ProductResult(product.getId(), Boolean.TRUE.equals(product.getLivemode()));
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo sincronizar el producto con Stripe.", exception);
        }
    }

    @Override
    public PriceResult createRecurringPrice(PriceCommand command, String idempotencyKey) {
        requireConfiguredMode();
        var params = new LinkedHashMap<String, Object>();
        params.put("product", command.productId());
        params.put("currency", command.currency().toLowerCase(Locale.ROOT));
        params.put("unit_amount", command.amountCents());
        params.put("recurring", Map.of("interval", command.interval().toLowerCase(Locale.ROOT)));
        params.put("tax_behavior", "exclusive");
        params.put("metadata", Map.of("indice_catalog_reference", command.catalogReference()));
        try {
            var price = Price.create(params, requestOptions(idempotencyKey));
            requireMatchingMode(Boolean.TRUE.equals(price.getLivemode()), "tarifa");
            return new PriceResult(
                price.getId(),
                price.getTaxBehavior(),
                Boolean.TRUE.equals(price.getLivemode())
            );
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo crear la tarifa recurrente en Stripe.", exception);
        }
    }

    @Override
    public ProductVerification verifyProduct(String productId) {
        requireConfiguredMode();
        try {
            var product = Product.retrieve(productId, requestOptions());
            requireMatchingMode(Boolean.TRUE.equals(product.getLivemode()), "producto");
            return new ProductVerification(
                product.getId(), product.getName(), product.getTaxCode(),
                Boolean.TRUE.equals(product.getActive()), Boolean.TRUE.equals(product.getLivemode())
            );
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo verificar el producto en Stripe.", exception);
        }
    }

    @Override
    public PriceVerification verifyRecurringPrice(String priceId) {
        requireConfiguredMode();
        try {
            var price = Price.retrieve(priceId, requestOptions());
            requireMatchingMode(Boolean.TRUE.equals(price.getLivemode()), "tarifa");
            var recurring = price.getRecurring();
            return new PriceVerification(
                price.getId(), price.getProduct(), price.getCurrency(),
                price.getUnitAmount() == null ? 0L : price.getUnitAmount(),
                recurring == null ? null : recurring.getInterval(), price.getTaxBehavior(),
                Boolean.TRUE.equals(price.getActive()), Boolean.TRUE.equals(price.getLivemode())
            );
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo verificar la tarifa en Stripe.", exception);
        }
    }

    @Override
    public PromotionVerification verifyPromotionCode(String promotionCodeId) {
        requireConfiguredMode();
        try {
            var promotion = PromotionCode.retrieve(
                promotionCodeId,
                Map.of("expand", List.of("promotion.coupon")),
                requestOptions()
            );
            requireMatchingMode(Boolean.TRUE.equals(promotion.getLivemode()), "promoción");
            var promotionDefinition = promotion.getPromotion();
            if (promotionDefinition == null || promotionDefinition.getCoupon() == null) {
                throw new StripeGatewayException("La promoción de Stripe no tiene un cupón asociado.", null);
            }
            Coupon coupon = promotionDefinition.getCouponObject();
            if (coupon == null) {
                coupon = Coupon.retrieve(promotionDefinition.getCoupon(), requestOptions());
            }
            requireMatchingMode(Boolean.TRUE.equals(coupon.getLivemode()), "cupón");
            var percentBasisPoints = coupon.getPercentOff() == null
                ? null
                : coupon.getPercentOff().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).intValueExact();
            var discountType = percentBasisPoints == null ? "FIXED" : "PERCENT";
            return new PromotionVerification(
                promotion.getId(), promotion.getCode(), discountType, percentBasisPoints,
                coupon.getAmountOff(), coupon.getCurrency(), normalizeDuration(coupon.getDuration()),
                coupon.getDurationInMonths() == null ? null : Math.toIntExact(coupon.getDurationInMonths()),
                coupon.getAppliesTo() == null || coupon.getAppliesTo().getProducts() == null
                    ? List.of()
                    : List.copyOf(coupon.getAppliesTo().getProducts()),
                Boolean.TRUE.equals(promotion.getActive()) && Boolean.TRUE.equals(coupon.getValid()),
                Boolean.TRUE.equals(promotion.getLivemode())
            );
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo verificar la promoción en Stripe.", exception);
        }
    }

    private void requireConfiguredMode() {
        secrets.requireEnabled();
    }

    private void requireMatchingMode(boolean livemode, String objectType) {
        if (livemode != secrets.isLiveMode()) {
            throw new StripeGatewayException(
                "El " + objectType + " pertenece a un modo de Stripe distinto al configurado.", null
            );
        }
    }

    private String normalizeDuration(String duration) {
        if (duration == null) return null;
        return switch (duration.toLowerCase(Locale.ROOT)) {
            case "once" -> "ONCE";
            case "repeating" -> "REPEATING";
            case "forever" -> "FOREVER";
            default -> duration.toUpperCase(Locale.ROOT);
        };
    }

    private RequestOptions requestOptions(String idempotencyKey) {
        return RequestOptions.builder()
            .setApiKey(secrets.secretKey())
            .setIdempotencyKey(idempotencyKey)
            .build();
    }

    private RequestOptions requestOptions() {
        return RequestOptions.builder()
            .setApiKey(secrets.secretKey())
            .build();
    }
}
