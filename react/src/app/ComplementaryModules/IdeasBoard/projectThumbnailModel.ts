import type {BoardContent} from '../../BasicModules/Sales/Funneling/ideasBoardModel';

/** Fit the saved document, not its last camera position. Includes outside annotations. */
export function projectThumbnailViewport(content:BoardContent,system:boolean,width:number,height:number){
 const boxes=content.nodes.map(node=>({x:node.x,y:node.y,width:node.width,height:node.height}));
 if(system)boxes.push({x:0,y:0,width:2200,height:1600});
 if(!boxes.length)return{x:width/2,y:height/2,zoom:1};
 const left=Math.min(...boxes.map(b=>b.x))-40,top=Math.min(...boxes.map(b=>b.y))-40;
 const right=Math.max(...boxes.map(b=>b.x+b.width))+40,bottom=Math.max(...boxes.map(b=>b.y+b.height))+40;
 const zoom=Math.min(Math.max(1,width-16)/(right-left),Math.max(1,height-16)/(bottom-top),1);
 return{x:width/2-(left+right)/2*zoom,y:height/2-(top+bottom)/2*zoom,zoom};
}
