package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.pos.customerdisplay.CustomerDisplaySecretProtectionJob;
import com.indice.erp.pos.customerdisplay.CustomerDisplaySecretProtectionStartup;
import com.indice.erp.pos.customerdisplay.KioskProtectionKeySentinel;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalSecretProtectionJob;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementSupplierPortalSecretProtectionStartup;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

class KioskSecretProtectionTestIsolationTest {

    private static final String PROTECTION_ENABLED =
        "app.kiosk.secret-protection.enabled";

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withInitializer(new ConfigDataApplicationContextInitializer())
        .withUserConfiguration(ProtectionComponents.class);

    @Test
    void testConfigurationDoesNotStartSecretProtectionComponents() {
        contextRunner.run(context -> {
            assertThat(context.getEnvironment().getProperty(PROTECTION_ENABLED))
                .isEqualTo("false");
            assertThat(context.getBeansOfType(KioskProtectionKeySentinel.class)).isEmpty();
            assertThat(context.getBeansOfType(CustomerDisplaySecretProtectionJob.class)).isEmpty();
            assertThat(context.getBeansOfType(CustomerDisplaySecretProtectionStartup.class)).isEmpty();
            assertThat(context.getBeansOfType(
                ProcurementSupplierPortalSecretProtectionJob.class)).isEmpty();
            assertThat(context.getBeansOfType(
                ProcurementSupplierPortalSecretProtectionStartup.class)).isEmpty();
        });
    }

    @Configuration(proxyBeanMethods = false)
    @Import({
        KioskProtectionKeySentinel.class,
        CustomerDisplaySecretProtectionJob.class,
        CustomerDisplaySecretProtectionStartup.class,
        ProcurementSupplierPortalSecretProtectionJob.class,
        ProcurementSupplierPortalSecretProtectionStartup.class
    })
    static class ProtectionComponents {
    }
}
