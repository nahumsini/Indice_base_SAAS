package com.indice.erp;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ReleaseDependencyRegressionTest {
    @Test
    void resolvedLibrariesKeepTheReleaseSecurityFixes() throws ClassNotFoundException {
        assertThat(Class.forName("org.apache.commons.lang3.ClassUtils").getPackage().getImplementationVersion())
                .isEqualTo("3.18.0");
        assertThat(Class.forName("org.apache.logging.log4j.LogManager").getPackage().getImplementationVersion())
                .isEqualTo("2.25.5");
    }
}
