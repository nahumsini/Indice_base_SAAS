package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.stripe.exception.ApiConnectionException;
import com.stripe.model.Invoice;
import com.stripe.model.InvoiceLineItem;
import com.stripe.model.StripeCollection;
import com.stripe.net.ApiRequest;
import com.stripe.net.ApiResource;
import com.stripe.net.StripeResponseGetter;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class StripeJavaCollectionGatewayTest {
    @Test
    void retrievesOnlyExactInvoiceAndItsLinesWithBoundedReadOnlyRequests() throws Exception {
        var secrets = mock(StripeSecretProvider.class);
        when(secrets.secretKey()).thenReturn("rk_test_unit_fixture");
        var transport = mock(StripeResponseGetter.class);
        var requests = new ArrayList<ApiRequest>();
        var invoice = ApiResource.GSON.fromJson("""
            {"id":"in_fixture","customer":"cus_fixture","status":"paid","currency":"usd",
             "livemode":false,"amount_due":1500,"amount_paid":1500,"amount_remaining":0,
             "amount_paid_off_stripe":0,"subtotal":1500,"billing_reason":"subscription_create",
             "parent":{"subscription_details":{"subscription":"sub_fixture","metadata":{"indice_company_id":"9"}}}}
            """, Invoice.class);
        var line = ApiResource.GSON.fromJson("""
            {"id":"il_fixture","quantity":2,"amount":1500,"currency":"usd",
             "pricing":{"price_details":{"price":"price_fixture"}}}
            """, InvoiceLineItem.class);
        var lines = new StripeCollection<InvoiceLineItem>();
        lines.setData(List.of(line));
        lines.setHasMore(false);
        when(transport.request(any(ApiRequest.class), any(Type.class))).thenAnswer(invocation -> {
            var request = invocation.getArgument(0, ApiRequest.class);
            requests.add(request);
            return request.getPath().endsWith("/lines") ? lines : invoice;
        });

        var actual = new StripeJavaCollectionGateway(secrets, transport).retrieveInvoice("in_fixture");

        assertThat(actual.subscriptionId()).isEqualTo("sub_fixture");
        assertThat(actual.amountPaidOffStripe()).isZero();
        assertThat(actual.lines()).containsExactly(new StripeCollectionGateway.Line("price_fixture", 2, 1500, "usd"));
        assertThat(requests).hasSize(2).allSatisfy(request -> {
            assertThat(request.getMethod()).isEqualTo(ApiResource.RequestMethod.GET);
            assertThat(request.getOptions().getConnectTimeout()).isEqualTo(5000);
            assertThat(request.getOptions().getReadTimeout()).isEqualTo(15000);
            assertThat(request.getOptions().getMaxNetworkRetries()).isZero();
        });
        assertThat(requests.getFirst().getParams().get("expand")).isEqualTo(List.of("amount_paid_off_stripe"));
    }

    @Test
    void rejectsInvalidReferencesBeforeAccessingSecretsOrProvider() {
        var secrets = mock(StripeSecretProvider.class);
        var transport = mock(StripeResponseGetter.class);
        assertThatThrownBy(() -> new StripeJavaCollectionGateway(secrets, transport).retrieveInvoice("../customers"))
            .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(secrets, transport);
    }

    @Test
    void sanitizesProviderFailuresWithoutKeepingTheirCause() throws Exception {
        var secrets = mock(StripeSecretProvider.class);
        when(secrets.secretKey()).thenReturn("rk_test_unit_fixture");
        var transport = mock(StripeResponseGetter.class);
        when(transport.request(any(ApiRequest.class), any(Type.class)))
            .thenThrow(new ApiConnectionException("sensitive provider detail"));
        assertThatThrownBy(() -> new StripeJavaCollectionGateway(secrets, transport).retrieveInvoice("in_fixture"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Stripe invoice verification is temporarily unavailable.").hasNoCause();
    }
}
