package com.indice.erp.kiosk.engine;

import java.util.List;
import org.springframework.stereotype.Service;

/** Routes Kiosk Center lifecycle commands to exactly one functional owner. */
@Service
public class KioskLifecycleCoordinator {

    private final List<KioskLifecycleHandler> handlers;

    public KioskLifecycleCoordinator(List<KioskLifecycleHandler> handlers) {
        this.handlers = List.copyOf(handlers);
    }

    public void transition(
            KioskResolvedDefinition definition,
            long actorId,
            KioskDefinitionStatus target,
            String reason) {
        var transition = new KioskLifecycleTransition(definition, actorId, target, reason);
        var matches = handlers.stream()
            .filter(handler -> handler.supports(definition))
            .toList();
        if (matches.isEmpty()) {
            throw new KioskUnavailableException();
        }
        if (matches.size() > 1) {
            throw new IllegalStateException(
                "Multiple lifecycle handlers claim " + definition.ownerModule()
                    + "/" + definition.kioskType() + ".");
        }
        matches.getFirst().transition(transition);
    }
}
