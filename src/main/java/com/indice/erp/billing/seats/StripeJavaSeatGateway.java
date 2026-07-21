package com.indice.erp.billing.seats;

import com.indice.erp.billing.stripe.StripeGatewayException;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.stripe.exception.StripeException;
import com.stripe.model.SubscriptionItem;
import com.stripe.net.RequestOptions;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaSeatGateway implements StripeSeatGateway {

    private final StripeSecretProvider secrets;

    public StripeJavaSeatGateway(StripeSecretProvider secrets) {
        this.secrets = secrets;
    }

    @Override
    public Result setExtraSeatQuantity(Command command, String idempotencyKey) {
        var options = RequestOptions.builder()
            .setApiKey(secrets.secretKey())
            .setIdempotencyKey(idempotencyKey)
            .build();
        try {
            if (command.quantity() == 0) {
                if (blank(command.subscriptionItemId())) {
                    return new Result(null, 0);
                }
                SubscriptionItem.retrieve(command.subscriptionItemId(), options).delete(options);
                return new Result(null, 0);
            }
            var params = new LinkedHashMap<String, Object>();
            params.put("quantity", command.quantity());
            params.put("proration_behavior", "create_prorations");
            params.put("metadata", Map.of("indice_billable_code", "extra_seat"));
            SubscriptionItem item;
            if (blank(command.subscriptionItemId())) {
                params.put("subscription", command.subscriptionId());
                params.put("price", command.priceId());
                item = SubscriptionItem.create(params, options);
            } else {
                item = SubscriptionItem.retrieve(command.subscriptionItemId(), options).update(params, options);
            }
            return new Result(item.getId(), Math.toIntExact(item.getQuantity()));
        } catch (StripeException exception) {
            throw new StripeGatewayException("Stripe could not update the extra-seat quantity.", exception);
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
