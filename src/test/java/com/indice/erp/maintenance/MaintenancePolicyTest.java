package com.indice.erp.maintenance;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;

class MaintenancePolicyTest {
    @Test void monthlyRecurrenceKeepsOriginalAnchorAndLeapYear(){
        var anchor=LocalDate.of(2028,1,31);
        assertThat(MaintenancePolicy.cycle(anchor,"MONTHLY",1,1)).isEqualTo(LocalDate.of(2028,2,29));
        assertThat(MaintenancePolicy.cycle(anchor,"MONTHLY",1,2)).isEqualTo(LocalDate.of(2028,3,31));
        assertThat(MaintenancePolicy.cycle(anchor,"MONTHLY",12,1)).isEqualTo(LocalDate.of(2029,1,31));
    }
    @Test void invalidRecurrenceAndCurrencyAreRejected(){
        assertThatThrownBy(()->MaintenancePolicy.cycle(LocalDate.now(),"DAILY",0,1)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(()->MaintenancePolicy.currency("ZZZ")).isInstanceOf(RuntimeException.class);
        assertThat(MaintenancePolicy.money(new BigDecimal("1.23456"))).isEqualByComparingTo("1.2346");
    }
    @Test void falseImageTypeAndActivePdfAreRejected()throws Exception{
        assertThatThrownBy(()->MaintenanceEvidenceService.validateBytes("<svg/>".getBytes(),"image/png",6)).isInstanceOf(RuntimeException.class);
        var output=new java.io.ByteArrayOutputStream();
        try(var pdf=new org.apache.pdfbox.pdmodel.PDDocument()){
            pdf.addPage(new org.apache.pdfbox.pdmodel.PDPage());
            pdf.getDocumentCatalog().setOpenAction(new org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript("alert(1)"));pdf.save(output);
        }
        assertThatThrownBy(()->MaintenanceEvidenceService.validateBytes(output.toByteArray(),"application/pdf",output.size())).isInstanceOf(RuntimeException.class);
    }
    @Test void validBoundedPngIsAccepted()throws Exception{
        var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",output);
        assertThatCode(()->MaintenanceEvidenceService.validateBytes(output.toByteArray(),"image/png",output.size())).doesNotThrowAnyException();
    }
}
