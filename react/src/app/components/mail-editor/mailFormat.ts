export const MAIL_HTML_LIMIT = 500000;
export const MAIL_FONTS = ['Arial', 'Georgia', 'Verdana', 'Tahoma', 'Times New Roman', 'Courier New', 'system-ui'];
export const plainMailHtml = (text: string) => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>');
export function safeMailLink(value: string) {
  if(value.length>2000||/[\x00-\x20\x7f<>]/.test(value))return false;
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?!!url.hostname&&!url.username&&!url.password:url.protocol==='mailto:'&&/^[^?\s@]+@[^?\s@]+\.[^?\s@]+$/.test(value.slice(7));}catch{return false;}
}
export function mailStyles(source: string) {
  const result=new Map<string,string>();
  for(const item of source.split(';')){const at=item.indexOf(':');if(at<0)continue;const key=item.slice(0,at).trim().toLowerCase(),rawValue=item.slice(at+1).trim().toLowerCase().replace(/["']/g,'');
    const value=key==='font-size'?({'xx-small':'10px','x-small':'10px',small:'13px',medium:'16px',large:'18px','x-large':'24px','xx-large':'32px','xxx-large':'40px'}[rawValue]??rawValue):rawValue;
    const valid=key==='color'||key==='background-color'?/^(#[0-9a-f]{3}([0-9a-f]{3})?|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|black|white|red|blue|green|transparent)$/.test(value)
      :key==='font-family'?MAIL_FONTS.map(f=>f.toLowerCase()).includes(value)
      :key==='font-size'?/^(10|12|13|14|16|18|20|24|28|32|36|40)px$/.test(value)
      :key==='font-weight'?['normal','bold','400','700'].includes(value)
      :key==='font-style'?['normal','italic'].includes(value)
      :['text-decoration','text-decoration-line'].includes(key)?['none','underline','line-through'].includes(value)
      :key==='text-align'?['left','center','right','justify'].includes(value):false;
    if(valid)result.set(key,value);
  }return Array.from(result,([k,v])=>`${k}:${v}`).join(';');
}
/** Matching bounded display contract; the Email server revalidates all markup and image bytes. */
export function cleanEditorHtml(html: string) {
  const template=document.createElement('template');template.innerHTML=html.slice(0,MAIL_HTML_LIMIT);let images=0;
  const clean=(node: Node): string=>{
    if(node.nodeType===Node.TEXT_NODE)return plainMailHtml(node.textContent??'');
    if(!(node instanceof Element))return '';
    let tag=node.tagName.toLowerCase();
    if(['script','style','iframe','object','svg','math','form','input','button','embed','link','meta'].includes(tag))return '';
    if(tag==='img'){const src=node.getAttribute('src')??'';if(images>=3||src.length>140000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(src))return '';images++;return `<img src="${src}" alt="${plainMailHtml((node.getAttribute('alt')??'').slice(0,180))}" style="max-width:100%;height:auto">`;}
    const body=Array.from(node.childNodes).map(clean).join('');
    if(!['p','br','div','span','b','strong','i','em','u','s','blockquote','pre','code','ul','ol','li','h1','h2','h3','h4','table','tbody','tr','td','th','hr','a','font'].includes(tag))return body;
    let attributes='',source=node.getAttribute('style')??'';
    if(tag==='font'){source+=`;font-family:${node.getAttribute('face')??''};color:${node.getAttribute('color')??''}`;const size=Number(node.getAttribute('size'));if(size>=1&&size<=7)source+=`;font-size:${[0,10,13,16,18,24,32,40][size]}px`;tag='span';}
    if(tag==='a'){const href=node.getAttribute('href')??'';if(safeMailLink(href))attributes+=` href="${plainMailHtml(href)}" rel="noopener noreferrer" target="_blank"`;}
    const styles=mailStyles(source);if(styles)attributes+=` style="${plainMailHtml(styles)}"`;
    return ['br','hr'].includes(tag)?`<${tag}>`:`<${tag}${attributes}>${body}</${tag}>`;
  };return Array.from(template.content.childNodes).map(clean).join('');
}
export async function prepareInlineImage(file: File): Promise<string> {
  if(file.size<1||file.size>5*1024*1024)throw new Error('image');
  const header=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((value,i)=>header[i]===value);
  const jpeg=header[0]===255&&header[1]===216&&header[2]===255;
  if(!png&&!jpeg)throw new Error('image');
  const url=URL.createObjectURL(file);
  try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>20000000)throw new Error('image');
    const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('image');
    const fits=(data:string)=>atob(data.slice(data.indexOf(',')+1)).length<=100*1024;
    for(const edge of [640,512,384,256,192,128]){
      const scale=Math.min(1,edge/image.naturalWidth,edge/image.naturalHeight);
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      if(png){const data=canvas.toDataURL('image/png');if(fits(data))return data;}
      // Opaque PNG photos can use JPEG. Keep alpha for transparent logos/images.
      const pixels=png?ctx.getImageData(0,0,canvas.width,canvas.height).data:null;
      let opaque=true;if(pixels)for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255){opaque=false;break;}
      if(opaque)for(const quality of [.86,.74,.62,.5,.38]){const data=canvas.toDataURL('image/jpeg',quality);if(fits(data))return data;}
    }
    throw new Error('image');
  }finally{URL.revokeObjectURL(url);}
}
