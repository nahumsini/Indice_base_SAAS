import {channelCatalog,diagnosticLabels} from './systemCatalog';
export const channelIcons=channelCatalog.map(item=>item.id);
export const channelGlyphs=Object.fromEntries(channelCatalog.map(item=>[item.id,item.glyph]));
export const systemIconLabels=diagnosticLabels;
