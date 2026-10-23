package com.indice.erp.scheduling;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;

class SchedulingLogoTest {
    static String png(int width,int height)throws Exception {
        var image=new BufferedImage(width,height,BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0,0,0x78567890);
        var output=new ByteArrayOutputStream();ImageIO.write(image,"png",output);
        return "data:image/png;base64,"+Base64.getEncoder().encodeToString(output.toByteArray());
    }
    @Test void validRasterIsStableAndEmptyExplicitlyClears()throws Exception {
        String logo=png(32,24),normalized=SchedulingLogo.normalize(logo);
        assertThat(normalized).startsWith("data:image/png;base64,");
        assertThat(SchedulingLogo.normalize(normalized)).isEqualTo(normalized);
        assertThat(SchedulingLogo.normalize("")).isNull();assertThat(SchedulingLogo.normalize(null)).isNull();
    }
    @Test void arbitraryUrlsActiveFormatsMalformedAndOversizedImagesFailClosed()throws Exception {
        for(String invalid:java.util.List.of("javascript:alert(1)","https://example.com/logo.png","data:image/svg+xml;base64,PHN2Zz4=","data:image/png;base64,!!!!","data:image/png;base64,SGVsbG8=",png(513,1),png(1,513),"data:image/png;base64,"+"A".repeat(175000)))
            assertThatThrownBy(()->SchedulingLogo.normalize(invalid)).isInstanceOf(IllegalArgumentException.class).hasMessage("scheduling_logo_invalid");
    }
    @Test void appendedContentDoesNotSurviveTheStoredRepresentation()throws Exception {
        String logo=png(4,3);byte[] data=Base64.getDecoder().decode(logo.substring(logo.indexOf(',')+1));
        var altered=new ByteArrayOutputStream();altered.write(data);altered.write("<script>untrusted</script>".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String cleaned=SchedulingLogo.normalize("data:image/png;base64,"+Base64.getEncoder().encodeToString(altered.toByteArray()));
        assertThat(cleaned).isEqualTo(SchedulingLogo.normalize(logo));
    }
}
