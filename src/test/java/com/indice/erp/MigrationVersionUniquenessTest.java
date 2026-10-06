package com.indice.erp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.flywaydb.core.internal.resolver.ChecksumCalculator;
import org.flywaydb.core.internal.resource.classpath.ClassPathResource;

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

        assertTrue(Files.exists(migrationDir.resolve("V230__internal_development_registry.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V231__product_usage_analytics.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V232__sales_meta_lead_import_audit.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V233__billing_selection_change_schedule.sql")));
        assertTrue(Files.exists(migrationDir.resolve("V265__expense_import_batches.sql")));
        assertReleasedChecksum("V288__platform_lead_diagnosis_flow.sql", 1234112480);
        assertReleasedChecksum("V289__platform_lead_plan_interest.sql", 1752329598);
        assertReleasedChecksum("V291__messaging_and_customer_care.sql", -160476949);
        assertReleasedChecksum("V292__messaging_photos.sql", -2011960414);
        assertReleasedChecksum("V293__sales_opportunity_authoritative_flow_assignment.sql", -736416289);
    }

    private void assertReleasedChecksum(String filename, int expected) {
        var resource = new ClassPathResource(null, "db/migration/" + filename,
                getClass().getClassLoader(), StandardCharsets.UTF_8);
        assertEquals(expected, ChecksumCalculator.calculate(resource),
                () -> "Released migration content changed: " + filename);
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
