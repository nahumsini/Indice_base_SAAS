package com.indice.erp.billing.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Price;
import com.stripe.model.Product;
import com.stripe.net.RequestOptions;
import java.util.LinkedHashMap;
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
    public ProductResult upsertProduct(ProductCommand command, String idempotencyKey) {
        requireTestMode();
        var params = new LinkedHashMap<String, Object>();
        params.put("name", command.name());
        params.put("tax_code", command.taxCode());
        try {
            Product product;
            if (command.externalProductId() == null || command.externalProductId().isBlank()) {
                product = Product.create(params, requestOptions(idempotencyKey));
            } else {
                product = Product.retrieve(command.externalProductId(), requestOptions())
                    .update(params, requestOptions(idempotencyKey));
            }
            if (Boolean.TRUE.equals(product.getLivemode())) {
                throw new StripeGatewayException("La sincronización del catálogo sólo puede usar Stripe TEST.", null);
            }
            return new ProductResult(product.getId());
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo sincronizar el producto con Stripe TEST.", exception);
        }
    }

    @Override
    public PriceResult createRecurringPrice(PriceCommand command, String idempotencyKey) {
        requireTestMode();
        var params = new LinkedHashMap<String, Object>();
        params.put("product", command.productId());
        params.put("currency", command.currency().toLowerCase(Locale.ROOT));
        params.put("unit_amount", command.amountCents());
        params.put("recurring", Map.of("interval", command.interval().toLowerCase(Locale.ROOT)));
        params.put("tax_behavior", "exclusive");
        try {
            var price = Price.create(params, requestOptions(idempotencyKey));
            if (Boolean.TRUE.equals(price.getLivemode())) {
                throw new StripeGatewayException("La sincronización del catálogo sólo puede usar Stripe TEST.", null);
            }
            return new PriceResult(price.getId(), price.getTaxBehavior());
        } catch (StripeException exception) {
            throw new StripeGatewayException("No se pudo crear la tarifa recurrente en Stripe TEST.", exception);
        }
    }

    private void requireTestMode() {
        secrets.requireEnabled();
        if (!secrets.isTestMode()) {
            throw new StripePhaseTwoUnavailableException(
                "Por seguridad, los precios del catálogo sólo se sincronizan con Stripe TEST."
            );
        }
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
