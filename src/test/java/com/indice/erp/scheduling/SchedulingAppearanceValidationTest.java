package com.indice.erp.scheduling;

import static org.assertj.core.api.Assertions.assertThat;
import static com.indice.erp.scheduling.SchedulingDtos.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

class SchedulingAppearanceValidationTest {
    @Test void acceptsCatalogListAndEditorialAndRejectsUnsafePresentation() {
        try (var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            for (String layout:java.util.List.of("cards","compact","showcase"))
                assertThat(validator.validate(new PageRequest("synthetic-agenda","Synthetic agenda","",false,null,
                    new PageAppearance("Synthetic brand","#2563EB","#F8FAFC","Request",layout)))).isEmpty();
            assertThat(validator.validate(new PageRequest("synthetic-agenda","Synthetic agenda","",false,null,
                new PageAppearance("Synthetic brand","url(unsafe)","#FFFFFF","Request","invented"))))
                .extracting(issue->issue.getPropertyPath().toString())
                .contains("appearance.accentColor","appearance.layout");
        }
    }
}
