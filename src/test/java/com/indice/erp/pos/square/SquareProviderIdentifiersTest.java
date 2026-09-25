package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SquareProviderIdentifiersTest {
    private final ObjectMapper mapper=new ObjectMapper();
    @Test void acceptsOpaqueTextWithinDocumentedLength() throws Exception {
        assertThat(SquareProviderIdentifiers.refund(mapper.readTree("\"refund:/+.%\""))).isTrue();
        assertThat(SquareProviderIdentifiers.refund("r".repeat(255))).isTrue();
    }
    @Test void rejectsNonTextEmptyAndOversizedValues() throws Exception {
        assertThat(SquareProviderIdentifiers.refund(mapper.readTree("42"))).isFalse();
        assertThat(SquareProviderIdentifiers.refund("")).isFalse();
        assertThat(SquareProviderIdentifiers.refund("r".repeat(256))).isFalse();
    }
}
