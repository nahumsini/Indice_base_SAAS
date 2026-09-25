package com.indice.erp.access.tab;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
class PaymentProviderTabWebConfig implements WebMvcConfigurer {
    private final ObjectProvider<PaymentProviderTabInterceptor> interceptors;
    PaymentProviderTabWebConfig(ObjectProvider<PaymentProviderTabInterceptor> interceptors) {
        this.interceptors = interceptors;
    }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        interceptors.ifAvailable(interceptor -> registry.addInterceptor(interceptor).addPathPatterns(
            "/api/v1/pos/square/**", "/api/v1/pos/mercado-pago/**", "/api/v1/pos/returns/**",
            "/api/v1/pos/payment-terminals/**", "/api/v1/finance/terminal-refund-adjustments/**")
            .order(-19));
    }
}
