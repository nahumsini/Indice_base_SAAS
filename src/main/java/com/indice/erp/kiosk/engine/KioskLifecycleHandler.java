package com.indice.erp.kiosk.engine;

/**
 * Module-owned extension point for Kiosk Center lifecycle commands.
 *
 * <p>The engine deliberately does not mutate the Registry as a fallback: an
 * owner without a handler is rejected so its functional row can never drift
 * away from the engine definition.</p>
 */
public interface KioskLifecycleHandler {

    boolean supports(KioskResolvedDefinition definition);

    void transition(KioskLifecycleTransition transition);
}
