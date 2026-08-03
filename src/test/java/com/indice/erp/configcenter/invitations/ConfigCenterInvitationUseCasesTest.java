package com.indice.erp.configcenter.invitations;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.configcenter.support.InvitationRecord;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConfigCenterInvitationUseCasesTest {

    @Test
    void corporateInvitationDoesNotRequireUnitOrBusinessIds() {
        var invitation = invitation(List.of("human_resources"), null, null);

        assertDoesNotThrow(() -> ConfigCenterInvitationUseCases.validateInvitationPermissions(invitation, true));
    }

    @Test
    void unitInvitationDoesNotRequireBusinessId() {
        var invitation = invitation(List.of("human_resources"), 12L, null);

        assertDoesNotThrow(() -> ConfigCenterInvitationUseCases.validateInvitationPermissions(invitation, true));
    }

    @Test
    void invitationStillRequiresModulePermissions() {
        var invitation = invitation(List.of(), null, null);

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> ConfigCenterInvitationUseCases.validateInvitationPermissions(invitation, true)
        );

        assertEquals("Invitation is missing module permissions.", error.getMessage());
    }

    @Test
    void invitationStillRequiresTabPermissionsForTabModules() {
        var invitation = invitation(List.of("human_resources"), null, null);

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> ConfigCenterInvitationUseCases.validateInvitationPermissions(invitation, false)
        );

        assertEquals("Invitation is missing tab permissions.", error.getMessage());
    }

    private InvitationRecord invitation(List<String> moduleSlugs, Long unitId, Long businessId) {
        return new InvitationRecord(
            42L,
            7L,
            "invite@example.com",
            "Invited User",
            "admin",
            moduleSlugs,
            unitId,
            businessId,
            "token",
            "pending",
            LocalDateTime.now().plusDays(7),
            "Indice Demo"
        );
    }
}
