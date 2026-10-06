package com.indice.erp.storage;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class OperationalReportFormatterTest {
    @Test void csvNeutralizesFormulasPreservesUnicodeAndNativeAmounts(){
        String csv=new String(OperationalReportFormatter.csv(List.of("name","amount","currency"),List.of(List.of(" =HYPERLINK(\"evil\")","10.250","CAD"),List.of("México","200.00","MXN"))),StandardCharsets.UTF_8);
        assertThat(csv).contains("' =HYPERLINK","México","10.250","CAD","200.00","MXN");
    }
    @Test void pdfContainsAllRecordsAcrossPageBoundaries()throws Exception{
        var rows=java.util.stream.IntStream.range(0,100).mapToObj(i->List.of("row-"+i,"10.25","CAD")).toList();
        try(var pdf=org.apache.pdfbox.Loader.loadPDF(OperationalReportFormatter.pdf("Synthetic report",List.of("name","amount","currency"),rows))){
            assertThat(pdf.getNumberOfPages()).isGreaterThan(1);assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(pdf)).contains("row-0","row-99","records: 100","CAD");
        }
    }
}
