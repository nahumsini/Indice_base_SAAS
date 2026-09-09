package com.indice.erp.finance.expenses.attachments;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ExpenseAttachmentRulesTest {

    @Test
    void acceptsMexicanInvoiceXmlAndBuildsAnXmlObjectKey() {
        var contentType = ExpenseAttachmentRules.normalizeContentType("text/xml");

        assertThat(contentType).isEqualTo("application/xml");
        assertThat(ExpenseAttachmentRules.buildObjectKey(14L, 28L, "Factura CFDI.xml", contentType))
            .startsWith("finance/expenses/14/28/attachments/")
            .endsWith("-factura-cfdi.xml");
    }
}
