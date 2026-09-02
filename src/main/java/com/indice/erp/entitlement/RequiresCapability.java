package com.indice.erp.entitlement;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ ElementType.TYPE, ElementType.METHOD })
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresCapability {

    String value();

    CapabilityOperation operation() default CapabilityOperation.AUTO;

    /**
     * Allows a mixed-capability controller to use the exact capability selected
     * by {@link CapabilityRouteClassifier}. The declared {@link #value()} stays
     * the fail-closed fallback when the route has no more specific mapping.
     *
     * <p>Method-level requirements remain authoritative and are never replaced.
     */
    boolean allowRouteOverride() default false;
}
