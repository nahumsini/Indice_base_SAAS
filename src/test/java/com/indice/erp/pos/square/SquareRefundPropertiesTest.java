package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareRefundPropertiesTest {
    @Test void operationalBoundsRejectBusyLoopsAndUnboundedRetries() {
        var properties = new SquareRefundProperties();
        properties.setSubmissionMaxAttempts(0); properties.setRecoveryMaxAttempts(1000);
        properties.setRecoveryDelaySeconds(1); properties.setRecoveryJobDelayMs(0);
        assertThat(properties.submissionAttempts()).isEqualTo(1);
        assertThat(properties.recoveryAttempts()).isEqualTo(100);
        assertThat(properties.recoveryDelay()).isEqualTo(30);
        assertThat(properties.recoveryJobDelay()).isEqualTo(5_000);
    }
}
