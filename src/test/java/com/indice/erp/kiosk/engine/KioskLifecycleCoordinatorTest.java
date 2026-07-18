package com.indice.erp.kiosk.engine;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KioskLifecycleCoordinatorTest {

    @Test
    void delegatesToTheSingleFunctionalOwnerAndNormalizesReason() {
        var handler = new RecordingHandler("SALES", "public_catalog");
        var coordinator = new KioskLifecycleCoordinator(List.of(handler));
        var definition = definition("SALES", "public_catalog", 91L);

        coordinator.transition(definition, 7L, KioskDefinitionStatus.DISABLED, "  maintenance  ");

        assertThat(handler.last).isNotNull();
        assertThat(handler.last.definition()).isSameAs(definition);
        assertThat(handler.last.actorId()).isEqualTo(7L);
        assertThat(handler.last.target()).isEqualTo(KioskDefinitionStatus.DISABLED);
        assertThat(handler.last.reason()).isEqualTo("maintenance");
        assertThat(handler.last.legacyReferenceId()).isEqualTo(91L);
    }

    @Test
    void rejectsUnownedDefinitionsInsteadOfMutatingOnlyTheRegistry() {
        var coordinator = new KioskLifecycleCoordinator(List.of(
            new RecordingHandler("SALES", "public_catalog")));

        assertThatThrownBy(() -> coordinator.transition(
                definition("UNKNOWN", "future", 44L), 7L,
                KioskDefinitionStatus.REVOKED, null))
            .isInstanceOf(KioskUnavailableException.class);
    }

    @Test
    void rejectsAmbiguousOwnershipWithoutInvokingEitherHandler() {
        var first = new RecordingHandler("SALES", "public_catalog");
        var second = new RecordingHandler("SALES", "public_catalog");
        var coordinator = new KioskLifecycleCoordinator(List.of(first, second));

        assertThatThrownBy(() -> coordinator.transition(
                definition("SALES", "public_catalog", 44L), 7L,
                KioskDefinitionStatus.REVOKED, "security"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Multiple lifecycle handlers");
        assertThat(first.last).isNull();
        assertThat(second.last).isNull();
    }

    @Test
    void validatesActorAndBoundedReasonBeforeDispatch() {
        var coordinator = new KioskLifecycleCoordinator(List.of(
            new RecordingHandler("SALES", "public_catalog")));
        var definition = definition("SALES", "public_catalog", 44L);

        assertThatThrownBy(() -> coordinator.transition(
                definition, 0L, KioskDefinitionStatus.DISABLED, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("actorId");
        assertThatThrownBy(() -> coordinator.transition(
                definition, 7L, KioskDefinitionStatus.DISABLED, "x".repeat(501)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("500");
    }

    private KioskResolvedDefinition definition(String owner, String type, Long legacyId) {
        return new KioskResolvedDefinition(
            10L, 20L, owner, type, legacyId, "K-01", "Kiosk",
            KioskDefinitionStatus.ACTIVE, null, null, null,
            KioskAccessLevel.CONTROLLED, null, "hint", false, 1, 1);
    }

    private static final class RecordingHandler implements KioskLifecycleHandler {
        private final String owner;
        private final String type;
        private KioskLifecycleTransition last;

        private RecordingHandler(String owner, String type) {
            this.owner = owner;
            this.type = type;
        }

        @Override
        public boolean supports(KioskResolvedDefinition definition) {
            return owner.equals(definition.ownerModule()) && type.equals(definition.kioskType());
        }

        @Override
        public void transition(KioskLifecycleTransition transition) {
            last = transition;
        }
    }
}
