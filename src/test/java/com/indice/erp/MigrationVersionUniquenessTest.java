package com.indice.erp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

class MigrationVersionUniquenessTest {

    private static final Pattern VERSIONED_MIGRATION =
            Pattern.compile("^(V[0-9]+(?:_[0-9]+)?)__.*\\.sql$");

    @Test
    void versionedMigrationsUseUniqueVersions() throws IOException, URISyntaxException {
        Path migrationDir = Path.of(getClass().getClassLoader().getResource("db/migration").toURI());
        Map<String, String> seenVersions = new LinkedHashMap<>();
        Map<String, String> duplicates = new LinkedHashMap<>();

        try (var files = Files.list(migrationDir)) {
            files.filter(Files::isRegularFile)
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .sorted()
                    .forEach(filename -> recordDuplicateVersion(filename, seenVersions, duplicates));
        }

        assertEquals(Map.of(), duplicates, () -> "Duplicate Flyway migration versions: " + duplicates);
    }

    @Test
    void alreadyReleasedMigrationVersionsRemainPinned() throws IOException, URISyntaxException {
        Path migrationDir = Path.of(getClass().getClassLoader().getResource("db/migration").toURI());

        assertTrue(Files.exists(migrationDir.resolve("V230__billing_selection_change_schedule.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V231__internal_development_registry.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V232__product_usage_analytics.sql")));
    }

    private static void recordDuplicateVersion(
            String filename,
            Map<String, String> seenVersions,
            Map<String, String> duplicates) {
        Matcher matcher = VERSIONED_MIGRATION.matcher(filename);
        if (!matcher.matches()) {
            return;
        }

        String version = matcher.group(1);
        String previous = seenVersions.putIfAbsent(version, filename);
        if (previous != null) {
            duplicates.put(version, previous + ", " + filename);
        }
    }
}
