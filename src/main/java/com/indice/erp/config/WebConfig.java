package com.indice.erp.config;

import com.indice.erp.billing.lifecycle.CommercialLifecycleInterceptor;
import com.indice.erp.billing.subscription.ModuleEntitlementInterceptor;
import com.indice.erp.billing.subscription.SubscriptionAccessInterceptor;
import com.indice.erp.entitlement.EntitlementShadowInterceptor;
import java.time.Clock;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(AppWebProperties.class)
public class WebConfig implements WebMvcConfigurer {

    private final AppWebProperties appWebProperties;
    private final ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor;
    private final ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor;
    private final ObjectProvider<SubscriptionAccessInterceptor> subscriptionAccessInterceptor;
    private final ObjectProvider<ModuleEntitlementInterceptor> moduleEntitlementInterceptor;

    public WebConfig(
        AppWebProperties appWebProperties,
        ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor,
        ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor,
        ObjectProvider<SubscriptionAccessInterceptor> subscriptionAccessInterceptor,
        ObjectProvider<ModuleEntitlementInterceptor> moduleEntitlementInterceptor
    ) {
        this.appWebProperties = appWebProperties;
        this.entitlementShadowInterceptor = entitlementShadowInterceptor;
        this.commercialLifecycleInterceptor = commercialLifecycleInterceptor;
        this.subscriptionAccessInterceptor = subscriptionAccessInterceptor;
        this.moduleEntitlementInterceptor = moduleEntitlementInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(appWebProperties.getAllowedOrigins().toArray(String[]::new))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowCredentials(true)
            .allowedHeaders("*");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        commercialLifecycleInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/**").order(-100)
        );
        entitlementShadowInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/**").order(-50)
        );
        subscriptionAccessInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/v1/**").order(-40)
        );
        moduleEntitlementInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/v1/**").order(-30)
        );
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
