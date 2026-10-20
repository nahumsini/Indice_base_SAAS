package com.indice.erp.sales.funneling;

import jakarta.validation.Valid;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class IdeasBoardContracts {
    private IdeasBoardContracts() { }
    public record Appearance(
        @NotNull @Pattern(regexp="SYSTEM|SANS|SERIF|MONO|ROUNDED|HANDWRITING|DISPLAY") String fontFamily,
        @NotNull @DecimalMin("8") @DecimalMax("96") Double fontSize,
        @NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String textColor,
        @NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String fillColor,
        @NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String borderColor,
        @NotNull @DecimalMin("0") @DecimalMax("12") Double borderWidth,
        @NotNull Boolean bold,@NotNull Boolean italic,@NotNull Boolean underline,
        @NotNull Boolean transparentFill,
        @NotNull @Pattern(regexp="CONTAIN|COVER|STRETCH") String imageFit) {}
    public record Node(@NotNull String id,
        @NotNull @Pattern(regexp="TEXT|IMAGE") String kind,
        @NotNull @Size(max=4000) String text,
        @NotNull @DecimalMin("-10000") @DecimalMax("10000") Double x,
        @NotNull @DecimalMin("-10000") @DecimalMax("10000") Double y,
        @NotNull @DecimalMin("40") @DecimalMax("1000") Double width,
        @NotNull @DecimalMin("40") @DecimalMax("800") Double height,
        @NotNull @Pattern(regexp="NOTE|RECTANGLE|ELLIPSE|PLAIN") String shape,
        @NotNull @Pattern(regexp="YELLOW|CORAL|BLUE|MINT|LAVENDER|WHITE") String color,
        String assetId,@Valid @JsonInclude(JsonInclude.Include.NON_NULL) Appearance appearance) {
        // Retain the existing constructor descriptor for older callers and running module classes.
        public Node(String id,String kind,String text,Double x,Double y,Double width,Double height,String shape,String color,String assetId) {
            this(id,kind,text,x,y,width,height,shape,color,assetId,null);
        }
    }
    public record Connection(@NotNull String id,@NotNull String from,@NotNull String to,@NotNull @Size(max=160) String label) { }
    public record Viewport(@NotNull @DecimalMin("-30000") @DecimalMax("30000") Double x,
        @NotNull @DecimalMin("-30000") @DecimalMax("30000") Double y,
        @NotNull @DecimalMin("0.25") @DecimalMax("2") Double zoom) { }
    public record Document(@NotNull @Size(max=100) List<@NotNull @Valid Node> nodes,
        @NotNull @Size(max=200) List<@NotNull @Valid Connection> connections,@NotNull @Valid Viewport viewport) { }
    public record Input(@NotNull @Valid Document content,@Min(0) long version,@NotNull String mutationId) { }
    public record Board(Document content,long version,Instant updatedAt,String actorKey) { }
    public record Asset(String id,String name,String contentType,long size) { }
    public record StoredAsset(Asset asset,String objectKey,String digest) { }
    public static Document empty() { return new Document(List.of(),List.of(),new Viewport(0d,0d,1d)); }
}
