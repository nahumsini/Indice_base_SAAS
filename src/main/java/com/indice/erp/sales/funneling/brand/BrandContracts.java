package com.indice.erp.sales.funneling.brand;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public final class BrandContracts {
    private BrandContracts() {}
    public record Answers(
        @Pattern(regexp="|RETAIL|FOOD|HEALTH|PROFESSIONAL|TOURISM|TECHNOLOGY|EDUCATION|BEAUTY|REAL_ESTATE|CONSTRUCTION|MANUFACTURING|OTHER") String industry,
        @Size(max=100) String industryOther,
        @Pattern(regexp="|PRODUCTS|SERVICES|BOTH") String offeringType,
        @Size(max=20) List<@NotBlank @Size(max=80) String> offerNames,
        @Size(max=4) List<@NotNull @Pattern(regexp="PEOPLE|SMALL_BUSINESSES|LARGE_COMPANIES|INSTITUTIONS") String> customerTypes,
        @Size(max=1000) String customerNeed,
        @Size(max=3) List<@NotNull @Pattern(regexp="ATTENTION|QUALITY|SPEED|EXPERTISE|CUSTOMIZATION|PRICE|CONVENIENCE|OTHER") String> differences,
        @Size(max=4) List<@NotNull @Pattern(regexp="IN_STORE|AT_CUSTOMER|ONLINE|HYBRID") String> serviceModes,
        @Pattern(regexp="|LOCAL|REGIONAL|NATIONAL|INTERNATIONAL") String reach,
        @Size(max=7) List<@NotNull @Pattern(regexp="WHATSAPP|STORE|WEBSITE|PHONE|APPOINTMENT|DISTRIBUTOR|SOCIAL") String> contactChannels,
        @Size(max=2) List<@NotNull @Pattern(regexp="FRIENDLY|PROFESSIONAL|PRACTICAL|INSPIRING|PLAYFUL|TECHNICAL") String> tones,
        @Pattern(regexp="|INFORMAL|FORMAL") String addressStyle,
        @Pattern(regexp="|es|en|fr|pt|ko|zh|OTHER") String language,
        @Size(max=15) List<@NotBlank @Size(max=50) String> preferredWords,
        @Size(max=1000) String avoidSaying,
        boolean usePrimaryLogo) {
        public Answers {
            industry=industry==null?"":industry;industryOther=industryOther==null?"":industryOther;
            offeringType=offeringType==null?"":offeringType;offerNames=offerNames==null?List.of():offerNames;
            customerTypes=customerTypes==null?List.of():customerTypes;customerNeed=customerNeed==null?"":customerNeed;
            differences=differences==null?List.of():differences;serviceModes=serviceModes==null?List.of():serviceModes;
            reach=reach==null?"":reach;contactChannels=contactChannels==null?List.of():contactChannels;
            tones=tones==null?List.of():tones;addressStyle=addressStyle==null?"":addressStyle;
            language=language==null?"":language;preferredWords=preferredWords==null?List.of():preferredWords;avoidSaying=avoidSaying==null?"":avoidSaying;
        }
        @com.fasterxml.jackson.annotation.JsonIgnore @AssertTrue public boolean isSelectionUnique(){return List.of(offerNames,customerTypes,differences,serviceModes,contactChannels,tones,preferredWords).stream().allMatch(values->new java.util.HashSet<>(values).size()==values.size());}
    }
    public static Answers emptyAnswers(){return new Answers("","","",List.of(),List.of(),"",List.of(),List.of(),"",List.of(),List.of(),"","",List.of(),"",false);}
    public record Details(
        @NotNull @Size(max=2000) String description,
        @NotNull @Size(max=1500) String offer,
        @NotNull @Size(max=1500) String difference,
        @NotNull @Size(max=1000) String audience,
        @NotNull @Size(max=300) String region,
        @NotNull @Size(max=500) String contact,
        @NotNull @Size(max=500) String voice,
        @NotNull @Size(max=1000) String guidance,
        @NotNull @Size(max=3) List<@NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String> colors,
        @Valid Answers answers) {
        public Details {answers=answers==null?emptyAnswers():answers;}
        public Details(String description,String offer,String difference,String audience,String region,String contact,String voice,String guidance,List<String> colors){this(description,offer,difference,audience,region,contact,voice,guidance,colors,emptyAnswers());}
    }
    public record Profile(String companyName,String logoUrl,Details details,long version,String actorKey) {}
    public record ProfileInput(@NotNull @Valid Details details,@Min(0) long version,@NotBlank String mutationId) {}
    public record Asset(String id,String name,String contentType,long sizeBytes,String category,String status,String description,String logoVariant) {
        public Asset(String id,String name,String contentType,long sizeBytes,String category,String status){this(id,name,contentType,sizeBytes,category,status,"","");}
    }
    public record Library(Profile profile,List<Asset> assets) {}
    public record UploadInput(@NotBlank String requestId,@NotBlank @Size(max=180) String filename,
        @NotBlank String contentType,@Min(1) @Max(5242880) long sizeBytes,
        @NotBlank @Pattern(regexp="PHOTO|DOCUMENT|REFERENCE|LOGO_VARIANT") String category,
        @Size(max=500) String description,
        @Pattern(regexp="|LIGHT|DARK|HORIZONTAL|SYMBOL|OTHER") String logoVariant) {
        public UploadInput {description=description==null?"":description;logoVariant=logoVariant==null?"":logoVariant;}
        public UploadInput(String requestId,String filename,String contentType,long sizeBytes,String category){this(requestId,filename,contentType,sizeBytes,category,"","");}
    }
    public record Upload(String id,String uploadUrl,java.util.Map<String,String> uploadHeaders,Asset ready) {}
    public record AssetState(@NotNull Boolean archived) {}
    public record Selection(@Min(0) long version,@Min(0) long profileVersion,boolean includeProfile,
        @NotNull @Size(max=10) List<@NotBlank String> assetIds,@NotBlank String mutationId) {}
    public record Snapshot(String companyName,Details details,List<Asset> assets,long version,long profileVersion,boolean includeProfile) {}
    public static Details empty(){return new Details("","","","","","","","",List.of());}
}
