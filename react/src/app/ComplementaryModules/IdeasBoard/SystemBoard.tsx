import {useMemo} from 'react';
import {IdeasBoard} from '../../BasicModules/Sales/Funneling/IdeasBoard';
import type {BoardContent} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {systemBoardApi} from './ideaWorkspaceApi';
import {personalBoardSymbols,systemBoardLayout} from './systemBoardLayout';
import type {BoardFileTools} from '../../BasicModules/Sales/Funneling/boardFileTools';
import {workspaceCopy} from './workspaceCopy';
export function SystemBoard({locale,active,onSaveProject,fileTools}:{locale:string;active:boolean;onSaveProject:(content:BoardContent,actor:string)=>void;fileTools?:BoardFileTools}) {
 const layout=useMemo(()=>systemBoardLayout(locale),[locale]),symbols=useMemo(()=>personalBoardSymbols(locale),[locale]);
 return <IdeasBoard fileTools={fileTools} locale={locale} active={active} customizable api={systemBoardApi} layout={layout} symbols={symbols} onSaveProject={onSaveProject} saveProjectLabel={workspaceCopy(locale).saveProject}/>;
}
