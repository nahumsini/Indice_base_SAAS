package com.indice.erp.billing.portal;

import com.indice.erp.billing.stripe.StripeGatewayException;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.stripe.exception.StripeException;
import com.stripe.model.billingportal.Session;
import com.stripe.net.RequestOptions;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Component;

@Component
public class StripeJavaCustomerPortalGateway implements StripeCustomerPortalGateway {

    private final StripeSecretProvider secrets;

    public StripeJavaCustomerPortalGateway(StripeSecretProvider secrets) {
        this.secrets = secrets;
    }

    @Override
    public PortalResult create(String customerId, String returnUrl, String idempotencyKey) {
        var params = new LinkedHashMap<String, Object>();
        params.put("customer", customerId);
        params.put("return_url", returnUrl);
        try {
            var session = Session.create(params, RequestOptions.builder()
                .setApiKey(secrets.secretKey())
                .setIdempotencyKey(idempotencyKey)
                .build());
            return new PortalResult(session.getUrl());
        } catch (StripeException exception) {
            throw new StripeGatewayException("Stripe customer portal creation failed.", exception);
        }
    }
}
