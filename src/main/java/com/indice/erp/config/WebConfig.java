package com.indice.erp.config;

import com.indice.erp.access.tab.TabPermissionInterceptor;
import com.indice.erp.access.module.ModuleAccessInterceptor;
import com.indice.erp.auth.AuthSecurityProperties;
import com.indice.erp.auth.AuthSessionTimeoutInterceptor;
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
@EnableConfigurationProperties({AppWebProperties.class, AuthSecurityProperties.class})
public class WebConfig implements WebMvcConfigurer {

    private final AppWebProperties appWebProperties;
    private final ObjectProvider<AuthSessionTimeoutInterceptor> authSessionTimeoutInterceptor;
    private final ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor;
    private final ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor;
    private final ObjectProvider<SubscriptionAccessInterceptor> subscriptionAccessInterceptor;
    private final ObjectProvider<ModuleEntitlementInterceptor> moduleEntitlementInterceptor;
    private final ObjectProvider<TabPermissionInterceptor> tabPermissionInterceptor;
    private final ObjectProvider<ModuleAccessInterceptor> moduleAccessInterceptor;

    public WebConfig(
        AppWebProperties appWebProperties,
        ObjectProvider<AuthSessionTimeoutInterceptor> authSessionTimeoutInterceptor,
        ObjectProvider<EntitlementShadowInterceptor> entitlementShadowInterceptor,
        ObjectProvider<CommercialLifecycleInterceptor> commercialLifecycleInterceptor,
        ObjectProvider<SubscriptionAccessInterceptor> subscriptionAccessInterceptor,
        ObjectProvider<ModuleEntitlementInterceptor> moduleEntitlementInterceptor,
        ObjectProvider<TabPermissionInterceptor> tabPermissionInterceptor,
        ObjectProvider<ModuleAccessInterceptor> moduleAccessInterceptor
    ) {
        this.appWebProperties = appWebProperties;
        this.authSessionTimeoutInterceptor = authSessionTimeoutInterceptor;
        this.entitlementShadowInterceptor = entitlementShadowInterceptor;
        this.commercialLifecycleInterceptor = commercialLifecycleInterceptor;
        this.subscriptionAccessInterceptor = subscriptionAccessInterceptor;
        this.moduleEntitlementInterceptor = moduleEntitlementInterceptor;
        this.tabPermissionInterceptor = tabPermissionInterceptor;
        this.moduleAccessInterceptor = moduleAccessInterceptor;
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
        authSessionTimeoutInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/**").order(-200)
        );
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
        moduleAccessInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/**").order(-25)
        );
        tabPermissionInterceptor.ifAvailable((interceptor) ->
            registry.addInterceptor(interceptor).addPathPatterns("/api/**").order(-20)
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
