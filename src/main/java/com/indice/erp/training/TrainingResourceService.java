package com.indice.erp.training;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.io.IOException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

@Service
public class TrainingResourceService {
    private static final String DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final Map<String, String> RESOURCE_FILES = Map.of(
        "consulting-guide", "guia-consultoria-comercial-indice",
        "basic-modules", "modulos-basicos-indice",
        "operating-manual", "manual-operativo-distribuidores-indice",
        "income-guide", "guia-ingresos-distribuidores-mxn",
        "agreement-draft", "borrador-contrato-distribucion-indice"
    );

    private final PlatformAdminAccessService platformAccess;
    private final DistributorPortfolioAccessPolicy distributorAccess;

    public TrainingResourceService(
        PlatformAdminAccessService platformAccess,
        DistributorPortfolioAccessPolicy distributorAccess
    ) {
        this.platformAccess = platformAccess;
        this.distributorAccess = distributorAccess;
    }

    public TrainingFile platformResource(long actorUserId, String resourceId, String format) {
        platformAccess.require(actorUserId, "PLATFORM_VIEW");
        return read(resourceId, format);
    }

    public TrainingFile distributorResource(AuthSessionUser actor, String resourceId, String format) {
        distributorAccess.requireDistributor(actor);
        return read(resourceId, format);
    }

    private TrainingFile read(String resourceId, String format) {
        var basename = RESOURCE_FILES.get(normalize(resourceId));
        var normalizedFormat = normalize(format);
        if (basename == null || !(normalizedFormat.equals("pdf") || normalizedFormat.equals("docx"))) {
            throw new NoSuchElementException("El recurso de capacitación no existe.");
        }
        var filename = basename + "." + normalizedFormat;
        var resource = new ClassPathResource("training-resources/" + filename);
        if (!resource.exists()) throw new NoSuchElementException("El recurso de capacitación no está disponible.");
        try (var input = resource.getInputStream()) {
            var mediaType = normalizedFormat.equals("pdf")
                ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType(DOCX_MEDIA_TYPE);
            return new TrainingFile(filename, mediaType, input.readAllBytes());
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible abrir el recurso de capacitación.", exception);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    public record TrainingFile(String filename, MediaType mediaType, byte[] content) {}
}
