export const projectLibraryDefaults = {scope:'OWNED',search:'',kind:'ALL',sort:'NEWEST',page:1,pageSize:12};
export type ProjectLibraryFilters = typeof projectLibraryDefaults;
export function restoreProjectFilters(value:Record<string,unknown>):ProjectLibraryFilters {
  return {
    scope:['OWNED','SHARED','TRASH'].includes(String(value.scope))?String(value.scope):'OWNED',
    search:typeof value.search==='string'?value.search.slice(0,120):'',
    kind:['ALL','FREEFORM','SYSTEM'].includes(String(value.kind))?String(value.kind):'ALL',
    sort:['NEWEST','OLDEST','NAME_ASC','NAME_DESC'].includes(String(value.sort))?String(value.sort):'NEWEST',
    page:Number.isInteger(value.page)&&Number(value.page)>=1&&Number(value.page)<=100000?Number(value.page):1,
    pageSize:[12,24,48].includes(Number(value.pageSize))?Number(value.pageSize):12,
  };
}
