package com.indice.erp.ai.access;

import java.util.List;

public record AiToolCapabilitiesResponse(
    String version,
    List<String> tools
) {
}
