package com.indice.erp.observability;

import com.indice.erp.config.AppWebProperties;
import com.indice.erp.storage.ObjectStorageProperties;
import java.util.Arrays;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupDiagnosticsLogger {

    private static final Logger log = LoggerFactory.getLogger(StartupDiagnosticsLogger.class);

    private final Environment environment;
    private final ObjectProvider<Flyway> flywayProvider;
    private final AppWebProperties appWebProperties;
    private final ObjectStorageProperties storageProperties;

    public StartupDiagnosticsLogger(
        Environment environment,
        ObjectProvider<Flyway> flywayProvider,
        AppWebProperties appWebProperties,
        ObjectStorageProperties storageProperties
    ) {
        this.environment = environment;
        this.flywayProvider = flywayProvider;
        this.appWebProperties = appWebProperties;
        this.storageProperties = storageProperties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStartupDiagnostics() {
        log.info(
            "Backend ready application={} profiles={} port={} java={} pid={}",
            environment.getProperty("spring.application.name", "indice-erp-api"),
            activeProfiles(),
            environment.getProperty("server.port", "8082"),
            System.getProperty("java.version", "unknown"),
            ProcessHandle.current().pid()
        );
        log.info(
            "Datasource configured url={} driver={}",
            LogSanitizer.sanitizeUrl(environment.getProperty("spring.datasource.url")),
            environment.getProperty("spring.datasource.driver-class-name", "n/a")
        );
        log.info(
            "Web origins configured count={} origins={}",
            appWebProperties.getAllowedOrigins().size(),
            appWebProperties.getAllowedOrigins().stream().map(LogSanitizer::sanitizeUrl).toList()
        );
        log.info(
            "Object storage configured provider={} minioEndpoint={} buckets=[attendance={}, biometric={}, documents={}]",
            LogSanitizer.sanitizeMessage(storageProperties.getProvider()),
            LogSanitizer.sanitizeUrl(storageProperties.getMinio().getEndpoint()),
            LogSanitizer.sanitizeMessage(storageProperties.getMinio().getBucketAttendance()),
            LogSanitizer.sanitizeMessage(storageProperties.getMinio().getBucketBiometric()),
            LogSanitizer.sanitizeMessage(storageProperties.getMinio().getBucketDocuments())
        );
        logFlywayDiagnostics();
    }

    private String activeProfiles() {
        var profiles = environment.getActiveProfiles();
        if (profiles.length == 0) {
            return "default";
        }
        return String.join(",", profiles);
    }

    private void logFlywayDiagnostics() {
        log.info(
            "Flyway configured enabled={} locations={} validateOnMigrate={} baselineOnMigrate={}",
            environment.getProperty("spring.flyway.enabled", "true"),
            environment.getProperty("spring.flyway.locations", "classpath:db/migration"),
            environment.getProperty("spring.flyway.validate-on-migrate", "true"),
            environment.getProperty("spring.flyway.baseline-on-migrate", "false")
        );

        try {
            var flyway = flywayProvider.getIfAvailable();
            if (flyway == null) {
                log.info("Flyway runtime status unavailable reason=no_flyway_bean");
                return;
            }

            var info = flyway.info();
            var failed = Arrays.stream(info.all())
                .filter(migration -> migration.getState().toString().toLowerCase().contains("failed"))
                .toList();
            var pending = info.pending();
            log.info(
                "Flyway runtime status current={} pending={} failed={}",
                migrationLabel(info.current()),
                pending.length,
                failed.size()
            );
            if (!failed.isEmpty()) {
                log.warn("Flyway failed migrations={}", failed.stream().map(this::migrationLabel).toList());
            }
        } catch (Exception ex) {
            log.warn("Flyway runtime status unavailable reason={}", LogSanitizer.sanitizeMessage(ex.getMessage()));
            log.debug("Flyway diagnostics failure", ex);
        }
    }

    private String migrationLabel(MigrationInfo migrationInfo) {
        if (migrationInfo == null) {
            return "none";
        }
        return LogSanitizer.sanitizeMessage(
            migrationInfo.getVersion() + ":" + migrationInfo.getDescription() + ":" + migrationInfo.getState()
        );
    }
}
