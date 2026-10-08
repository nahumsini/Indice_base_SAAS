package com.indice.erp.ai.financeworkflow;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.storage.OperationalReportFormatter;
import com.indice.erp.finance.assistant.FinanceAssistantSupport;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;

class FinanceReportFormattingTest {
    @Test void signedMoneyStaysNumericWhileUntrustedNamesCannotBecomeSpreadsheetFormulas(){
        var csv=new String(OperationalReportFormatter.csv(List.of("name","balance"),
            List.of(List.of("=Synthetic formula","-20.25")),Set.of("balance")),StandardCharsets.UTF_8);
        assertThat(csv).contains("\"'=Synthetic formula\",\"-20.25\"");
        assertThatThrownBy(()->OperationalReportFormatter.csv(List.of("balance"),
            List.of(List.of("-1+CMD")),Set.of("balance"))).isInstanceOf(IllegalArgumentException.class);
        var legacy=new String(OperationalReportFormatter.csv(List.of("name"),List.of(List.of("-Synthetic text"))),StandardCharsets.UTF_8);
        assertThat(legacy).contains("\"'-Synthetic text\"");
    }
    @Test void fractionalTaxRatesAreBoundedBeforeFinancialArithmetic(){
        assertThat(FinanceAssistantSupport.includedTaxRate(new BigDecimal("0.14975"))).isEqualByComparingTo("0.14975");
        assertThatThrownBy(()->FinanceAssistantSupport.includedTaxRate(new BigDecimal("1e-1000"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->FinanceAssistantSupport.includedTaxRate(new BigDecimal("13"))).isInstanceOf(IllegalArgumentException.class);
    }
}
