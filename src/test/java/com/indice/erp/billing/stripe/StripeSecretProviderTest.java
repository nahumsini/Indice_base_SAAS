package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StripeSecretProviderTest {

    @TempDir
    Path tempDir;

    @Test
    void remainsUnavailableUntilExplicitlyEnabledInTestMode() {
        var properties = new StripePhaseTwoProperties();
        properties.setSecretKey("sk_test_safe");
        var provider = new StripeSecretProvider(properties);

        assertThatThrownBy(provider::secretKey)
            .isInstanceOf(StripePhaseTwoUnavailableException.class)
            .hasMessageContaining("disabled");

        properties.setEnabled(true);
        properties.setMode("live");
        assertThatThrownBy(provider::secretKey)
            .isInstanceOf(StripePhaseTwoUnavailableException.class)
            .hasMessageContaining("test mode");
    }

    @Test
    void rejectsLiveKeysAndPrefersMountedSecretFiles() throws Exception {
        var keyFile = tempDir.resolve("stripe-key");
        var webhookFile = tempDir.resolve("stripe-webhook");
        Files.writeString(keyFile, "sk_test_from_file\n");
        Files.writeString(webhookFile, "whsec_from_file\n");

        var properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("test");
        properties.setSecretKey("sk_live_must_not_be_used");
        properties.setSecretKeyFile(keyFile.toString());
        properties.setWebhookSecret("invalid-direct-value");
        properties.setWebhookSecretFile(webhookFile.toString());
        var provider = new StripeSecretProvider(properties);

        assertThat(provider.secretKey()).isEqualTo("sk_test_from_file");
        assertThat(provider.webhookSecret()).isEqualTo("whsec_from_file");

        properties.setSecretKeyFile("");
        assertThatThrownBy(provider::secretKey)
            .isInstanceOf(StripePhaseTwoUnavailableException.class)
            .hasMessageContaining("test secret key");
    }
}
