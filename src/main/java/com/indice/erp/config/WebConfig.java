package com.indice.erp.config;

import com.indice.erp.entitlement.EntitlementShadowInterceptor;
import com.indice.erp.billing.lifecycle.CommercialLifecycleInterceptor;
import java.time.Clock;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(AppWebProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final AppWebProperties appWebProperties;
    private final ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor;
    private final ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor;

    public WebConfig(
        AppWebProperties appWebProperties,
        ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor,
        ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor
    ) {
        this.appWebProperties = appWebProperties;
        this.entitlementShadowInterceptor = entitlementShadowInterceptor;
        this.commercialLifecycleInterceptor = commercialLifecycleInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        var commercial = commercialLifecycleInterceptor.getIfAvailable();
        if (commercial != null) {
            registry.addInterceptor(commercial).addPathPatterns("/api/**").order(-100);
        }
        var interceptor = entitlementShadowInterceptor.getIfAvailable();
        if (interceptor != null) {
            registry.addInterceptor(interceptor).addPathPatterns("/api/**");
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(appWebProperties.getAllowedOrigins().toArray(String[]::new))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowCredentials(true)
            .allowedHeaders("*");
    }

    @Bean
    BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
