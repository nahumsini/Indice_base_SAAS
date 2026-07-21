package com.indice.erp.billing.signup;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.billing.provisioning")
public class BillingProvisioningProperties {

    private boolean enabled;
    private int reconciliationBatchSize = 25;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getReconciliationBatchSize() {
        return reconciliationBatchSize;
    }

    public void setReconciliationBatchSize(int reconciliationBatchSize) {
        this.reconciliationBatchSize = Math.max(1, Math.min(reconciliationBatchSize, 100));
    }
}
