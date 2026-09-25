package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class MpSecretsTest {
    @TempDir Path directory;
    @Test void disabledByDefaultAndInvalidEnvironmentFailClosed() {
        var properties = new MpProperties();
        var secrets = new MpSecrets(properties);
        assertThrows(PosApiException.class, secrets::requireEnabled);
        properties.setEnabled(true);
        properties.setEnvironment("unexpected");
        assertThrows(PosApiException.class, secrets::requireEnabled);
    }
    @Test void unreadableSecretFileNeverFallsBackToDirectSecret() {
        var properties = new MpProperties();
        properties.setEnabled(true);
        properties.setApplicationSecret("synthetic-direct");
        properties.setApplicationSecretFile(directory.resolve("missing-secret").toString());
        assertThrows(PosApiException.class, new MpSecrets(properties)::applicationSecret);
    }
    @Test void readsProtectedFileAndRequiresExplicitProtectionKey() throws Exception {
        var properties = new MpProperties();
        properties.setEnabled(true);
        var secrets = new MpSecrets(properties);
        assertThrows(PosApiException.class, secrets::tokenProtectionSecret);
        Path file = directory.resolve("synthetic-key");
        Files.writeString(file, "synthetic-test-protection-key-at-least-32-characters\n");
        properties.setTokenProtectionSecretFile(file.toString());
        assertEquals("synthetic-test-protection-key-at-least-32-characters", secrets.tokenProtectionSecret());
        assertFalse(properties.toString().contains("synthetic"));
    }
}
