import {questionCopy,questionOptions} from './brandQuestions';
export type BrandAnswers={industry:string;industryOther:string;offeringType:string;offerNames:string[];customerTypes:string[];customerNeed:string;differences:string[];serviceModes:string[];reach:string;contactChannels:string[];tones:string[];addressStyle:string;language:string;preferredWords:string[];avoidSaying:string;usePrimaryLogo:boolean};
export type BrandDetails = {description:string;offer:string;difference:string;audience:string;region:string;contact:string;voice:string;guidance:string;colors:string[];answers?:BrandAnswers};
export type BrandAsset = {id:string;name:string;contentType:string;sizeBytes:number;category:'PHOTO'|'DOCUMENT'|'REFERENCE'|'LOGO_VARIANT';status:'READY'|'ARCHIVED';description?:string;logoVariant?:string};
export type BrandProfile = {companyName:string;logoUrl:string;details:BrandDetails;version:number;actorKey:string};
export type BrandLibrary = {profile:BrandProfile;assets:BrandAsset[]};
export type BrandSnapshot = {companyName:string;details:BrandDetails;assets:BrandAsset[];version:number;profileVersion:number;includeProfile:boolean};
export const emptyBrandAnswers=():BrandAnswers=>({industry:'',industryOther:'',offeringType:'',offerNames:[],customerTypes:[],customerNeed:'',differences:[],serviceModes:[],reach:'',contactChannels:[],tones:[],addressStyle:'',language:'',preferredWords:[],avoidSaying:'',usePrimaryLogo:false});
export const emptyBrandDetails=():BrandDetails=>({description:'',offer:'',difference:'',audience:'',region:'',contact:'',voice:'',guidance:'',colors:[],answers:emptyBrandAnswers()});
export const normalizeBrandDetails=(value:BrandDetails):BrandDetails=>({...value,answers:{...emptyBrandAnswers(),...value.answers}});
export const brandFields=['description','offer','difference','audience','region','contact','voice','guidance'] as const;
export const brandLimits={description:2000,offer:1500,difference:1500,audience:1000,region:300,contact:500,voice:500,guidance:1000};
export function toggleBrandChoice(values:string[],value:string,limit:number){return values.includes(value)?values.filter(item=>item!==value):values.length<limit?[...values,value]:values;}
export function addBrandTag(values:string[],value:string,limit:number,maxLength:number){const next=value.trim();return !next||next.length>maxLength||values.length>=limit||values.some(item=>item.toLocaleLowerCase()===next.toLocaleLowerCase())?values:[...values,next];}
export function brandPromptContext(snapshot:BrandSnapshot|null|undefined,labels:Record<(typeof brandFields)[number]|'colors',string>,locale='en'){
 if(!snapshot||(!snapshot.includeProfile&&!snapshot.assets.length))return null;
 const q=questionCopy(locale),answers=snapshot.details.answers;
 const guided:Record<string,unknown>={};
 if(answers)for(const [key,value]of Object.entries(answers)){
  if(value===''||value===false||Array.isArray(value)&&!value.length||key==='industryOther'&&answers.industry!=='OTHER')continue;
  const choices=questionOptions[key as keyof typeof questionOptions];
  const label=q[key as keyof typeof q]??key;
  const option=(code:string)=>q[`${key}_${code}` as keyof typeof q]??code;
  guided[label]=choices?(Array.isArray(value)?value.map(option):option(String(value))):value;
 }
 return {company:snapshot.companyName,...(snapshot.includeProfile?{...Object.fromEntries(brandFields.map(key=>[labels[key],snapshot.details[key]])),[labels.colors]:snapshot.details.colors,...guided}:{}),materials:snapshot.assets.map(file=>({name:file.name,type:file.contentType,category:file.category,...(file.description?{description:file.description}:{}),...(file.logoVariant?{logoVariant:file.logoVariant}:{})})),notice:'Reference information only. Material names are an index; files are not embedded, read or transmitted automatically.'};
}
