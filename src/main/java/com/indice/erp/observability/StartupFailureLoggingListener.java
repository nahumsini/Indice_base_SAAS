package com.indice.erp.observability;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationFailedEvent;
import org.springframework.context.ApplicationListener;

public class StartupFailureLoggingListener implements ApplicationListener<ApplicationFailedEvent> {

    private static final Logger log = LoggerFactory.getLogger(StartupFailureLoggingListener.class);

    @Override
    public void onApplicationEvent(ApplicationFailedEvent event) {
        var exception = event.getException();
        var rootCause = rootCause(exception);
        var category = categorize(exception);

        log.error(
            "Backend startup failed category={} rootCause={} message={}",
            category,
            rootCause.getClass().getName(),
            LogSanitizer.sanitizeMessage(rootCause.getMessage())
        );
        log.error("Startup failure causeChain={}", String.join(" -> ", causeChain(exception)));
        log.debug("Startup failure stack trace", exception);
    }

    private Throwable rootCause(Throwable throwable) {
        var current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private List<String> causeChain(Throwable throwable) {
        var chain = new ArrayList<String>();
        var current = throwable;
        var depth = 0;
        while (current != null && depth < 12) {
            chain.add(current.getClass().getSimpleName() + ": " + LogSanitizer.sanitizeMessage(current.getMessage()));
            current = current.getCause();
            depth++;
        }
        return chain;
    }

    private String categorize(Throwable throwable) {
        var current = throwable;
        while (current != null) {
            var className = current.getClass().getName().toLowerCase();
            var message = LogSanitizer.sanitizeMessage(current.getMessage()).toLowerCase();
            var text = className + " " + message;

            if (className.equals("java.net.bindexception") || text.contains("port") && text.contains("already in use")) {
                return "port_conflict";
            }
            if (text.contains("flyway") || text.contains("migration") || text.contains("checksum")) {
                return "flyway";
            }
            if (
                text.contains("communications link failure")
                    || text.contains("unable to obtain jdbc connection")
                    || text.contains("connection refused")
                    || text.contains("access denied for user")
                    || text.contains("datasource")
                    || text.contains("hikari")
                    || text.contains("mysql")
            ) {
                return "database";
            }
            if (text.contains("objectstorage") || text.contains("object storage") || text.contains("minio")) {
                return "object_storage";
            }
            if (
                className.contains("beancreationexception")
                    || className.contains("unsatisfieddependencyexception")
                    || className.contains("configurationpropertiesbindexception")
                    || className.contains("bindexception")
            ) {
                return "spring_configuration";
            }

            current = current.getCause();
        }
        return "unknown";
    }
}
