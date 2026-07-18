package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class ProcessTaskKioskAdapterTest {

    @Mock
    private ProcessTaskKioskService kioskService;

    private ProcessTaskKioskAdapter adapter;
    private KioskExecutionContext context;

    @BeforeEach
    void setUp() {
        adapter = new ProcessTaskKioskAdapter(kioskService);
        context = KioskExecutionContext.publicLink(ProcessTaskKioskCapabilities.OWNER_MODULE, "device-token");
    }

    @Test
    void publishesVersionedControlledCapabilities() {
        assertThat(adapter.ownerModule()).isEqualTo("PROCESS_TASKS");
        assertThat(adapter.capabilities())
            .hasSize(7)
            .allSatisfy(capability -> {
                assertThat(capability.version()).isEqualTo(1);
                assertThat(capability.ownerModule()).isEqualTo("PROCESS_TASKS");
                assertThat(capability.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED);
                assertThat(capability.versionedKey()).endsWith("@1");
            });
        assertThat(ProcessTaskKioskCapabilities.require(ProcessTaskKioskCapabilities.TASKS_READ).operationPolicy())
            .isEqualTo(KioskOperationPolicy.INFORMATION_ONLY);
    }

    @Test
    void delegatesBootstrapWithoutChangingPayload() {
        var response = Map.<String, Object>of("kiosk", Map.of("name", "Lobby"));
        given(kioskService.publicBootstrap("device-token")).willReturn(response);

        assertThat(adapter.bootstrap(context)).isSameAs(response);
    }

    @Test
    void delegatesIdentityAndTaskCollectionActions() {
        var payload = Map.<String, Object>of("identification_token", "id");
        given(kioskService.publicIdentify("device-token", payload)).willReturn(Map.of("identified", true));
        given(kioskService.publicTasks("device-token", payload)).willReturn(Map.of("items", java.util.List.of()));
        given(kioskService.publicCreateTask("device-token", payload)).willReturn(Map.of("id", 41));

        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.IDENTITY_VERIFY, payload));
        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.TASKS_READ, payload));
        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_CREATE, payload));

        then(kioskService).should().publicIdentify("device-token", payload);
        then(kioskService).should().publicTasks("device-token", payload);
        then(kioskService).should().publicCreateTask("device-token", payload);
    }

    @Test
    void delegatesTaskResourceActions() {
        var payload = Map.<String, Object>of("identification_token", "id");
        given(kioskService.publicCompleteTask("device-token", 41L, payload)).willReturn(Map.of("completed", true));
        given(kioskService.publicAssignTaskResponsible("device-token", 41L, payload)).willReturn(Map.of("assigned", true));
        given(kioskService.publicCreateAttachmentUpload("device-token", 41L, payload)).willReturn(Map.of("upload", true));
        given(kioskService.publicRegisterAttachment("device-token", 41L, payload)).willReturn(Map.of("attachment", true));

        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_COMPLETE, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER, 41L, payload));

        then(kioskService).should().publicCompleteTask("device-token", 41L, payload);
        then(kioskService).should().publicAssignTaskResponsible("device-token", 41L, payload);
        then(kioskService).should().publicCreateAttachmentUpload("device-token", 41L, payload);
        then(kioskService).should().publicRegisterAttachment("device-token", 41L, payload);
    }

    @Test
    void rejectsUnknownCapabilityAndInvalidContext() {
        assertThatThrownBy(() -> adapter.execute(context, KioskActionRequest.of("unknown", Map.of())))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported");

        var wrongContext = KioskExecutionContext.publicLink("PETTY_CASH", "device-token");
        assertThatThrownBy(() -> adapter.bootstrap(wrongContext))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong");
    }

    @Test
    void resourceCapabilitiesRequireAValidResourceId() {
        assertThatThrownBy(() -> adapter.execute(
            context,
            KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_COMPLETE, Map.of())
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("resourceId");
    }
}
