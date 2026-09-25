package com.indice.erp.pos.mercadopago;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.annotation.PersistenceExceptionTranslationPostProcessor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
class MpRepositoryProxyTest {
    @Test void repositoriesAndTransactionsSupportSpringClassProxiesWithoutDatabaseAccess() {
        new ApplicationContextRunner().withUserConfiguration(ProxyConfiguration.class,
            MpConnectionStore.class, MpConnectionLease.class, MpOAuthStore.class,
            MpTerminalStore.class, MpTerminalWriter.class, MpTerminalConfigurationStore.class, MpTerminalSynchronizationStore.class,
            MpTerminalVerificationLeaseStore.class,
            MpConnectionWriter.class, MpTerminalMapper.class)
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(MpProperties.class, MpProperties::new)
            .withBean(MpTokenCodec.class, () -> mock(MpTokenCodec.class))
            .withBean(Clock.class, () -> MpTestFixtures.CLOCK)
            .withBean(MpPaymentAudit.class, () -> new MpPaymentAudit(mock(JdbcTemplate.class)))
            .withBean(TerminalPaymentGuard.class, () -> mock(TerminalPaymentGuard.class))
            .run(context -> {
                assertThat(context).hasNotFailed();
                for (var type : List.of(MpConnectionStore.class, MpConnectionLease.class,
                    MpOAuthStore.class, MpTerminalStore.class, MpTerminalWriter.class,
                    MpTerminalConfigurationStore.class, MpTerminalSynchronizationStore.class,
                    MpTerminalVerificationLeaseStore.class, MpConnectionWriter.class)) {
                    assertThat(AopUtils.isAopProxy(context.getBean(type))).as(type.getSimpleName()).isTrue();
                }
            });
    }
    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement(proxyTargetClass = true)
    static class ProxyConfiguration {
        @Bean static PersistenceExceptionTranslationPostProcessor translation() {
            var processor = new PersistenceExceptionTranslationPostProcessor();
            processor.setProxyTargetClass(true);
            return processor;
        }
        @Bean PlatformTransactionManager transactions() { return mock(PlatformTransactionManager.class); }
    }
}
