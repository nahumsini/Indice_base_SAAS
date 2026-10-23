import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, FolderOpen, RefreshCw, X } from 'lucide-react';
import { IndiceTitleBar, IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect, IndiceViewState } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import { DataTablePagination } from '../../components/table/DataTablePagination';
import { useWorkspaceNavigationMemory } from '../../hooks/useWorkspaceNavigationMemory';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import { OriginalModuleEmoji } from '../../components/icons/OriginalModuleEmoji';
import { ideaWorkspaceApi, type Project, type ProjectPage, type ProjectSummary } from './ideaWorkspaceApi';
import { fromSystemDocument } from './systemBoardModel';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { workspaceCopy } from './workspaceCopy';
import { ProjectActions, projectActionError } from './ProjectActions';
import { projectManagementApi, type ProjectScope } from './projectManagementApi';
import { projectManagementCopy } from './projectManagementCopy';
import { projectWorkspaceCopy } from './projectWorkspaceCopy';
import { projectLibraryDefaults, restoreProjectFilters, type ProjectLibraryFilters } from './projectLibraryModel';

export function IdeaProjects({ locale, active, revision, onUseProject, onOpenBoard }: {
  locale: string; active: boolean; revision: number;
  onUseProject?: (project: Project) => void; onOpenBoard?: () => void;
}) {
  const c = workspaceCopy(locale), m = projectManagementCopy(locale), ui = projectWorkspaceCopy(locale);
  const [params, setParams] = useSearchParams(), selected = params.get('project'), owner = params.get('owner');
  const [filters, setFilters] = useState<ProjectLibraryFilters>(projectLibraryDefaults);
  const { scope, search, kind, sort, page, pageSize } = filters;
  const [data, setData] = useState<ProjectPage | null>(null), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [project, setProject] = useState<Project | null>(null), [notice, setNotice] = useState(''), [using, setUsing] = useState(false);
  useWorkspaceNavigationMemory({ moduleKey: 'ideas_board', tabKey: 'projects', defaults: projectLibraryDefaults,
    state: filters, enabled: active, onRestore: value => setFilters(restoreProjectFilters(value)) });
  function filter(key: 'search' | 'kind' | 'sort' | 'scope', value: string) {
    setFilters(previous => ({ ...previous, [key]: value, page: 1 })); setNotice('');
  }
  function clearFilters() { setFilters(previous => ({ ...previous, search: '', kind: 'ALL', sort: 'NEWEST', page: 1 })); }
  const filtered = !!search.trim() || kind !== 'ALL' || sort !== 'NEWEST';
  const scopeLabel = scope === 'SHARED' ? m.shared : scope === 'TRASH' ? m.trash : m.mine;
  useEffect(() => {
    if (!active || selected) return;
    const abort = new AbortController(); setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      ideaWorkspaceApi.list(search.trim(), page, abort.signal, pageSize, scope, kind, sort).then(result => {
        if (abort.signal.aborted) return;
        setData(result); const last = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (page > last) setFilters(previous => ({ ...previous, page: last }));
      }).catch(failure => { if (!abort.signal.aborted) setError(projectActionError(failure, locale)); })
        .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }, search ? 300 : 0);
    return () => { abort.abort(); window.clearTimeout(timer); };
  }, [active, search, page, pageSize, scope, kind, sort, revision, retry, selected, locale]);
  useEffect(() => {
    if (!active || !selected) { setProject(null); return; }
    const abort = new AbortController(); setProject(null); setLoading(true); setError('');
    if (!/^[0-9a-f-]{36}$/.test(selected) || owner !== null && !/^[1-9]\d*$/.test(owner)) {
      setError(m.missing); setLoading(false); return () => abort.abort();
    }
    ideaWorkspaceApi.get(selected, abort.signal, owner === null ? undefined : Number(owner)).then(value => {
      if (!abort.signal.aborted) setProject(value);
    }).catch(failure => { if (!abort.signal.aborted) setError(projectActionError(failure, locale)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [active, selected, owner, revision, retry, locale]);
  const activeRef = useRef(active); activeRef.current = active;
  useEffect(() => () => { activeRef.current = false; }, []);
  useEffect(() => { if (!active) setUsing(false); }, [active]);
  function open(item: ProjectSummary) {
    const next = new URLSearchParams(params); next.set('project', item.id);
    if (item.ownerId != null) next.set('owner', String(item.ownerId)); else next.delete('owner');
    setParams(next); setNotice('');
  }
  function back() { const next = new URLSearchParams(params); next.delete('project'); next.delete('owner'); setParams(next); setProject(null); }
  function changed(message: string, next?: Project) {
    setNotice(message); if (message === m.linkCopied) return;
    if (next?.summary.deletedAt) { back(); setFilters(previous => ({ ...previous, scope: 'TRASH', page: 1 })); }
    else if (next && next.summary.id !== selected) {
      if (selected) open(next.summary); else setFilters(previous => ({ ...previous, scope: 'OWNED', page: 1 }));
    }
    setRetry(value => value + 1);
  }
  async function use(item: ProjectSummary) {
    if (using || !onUseProject) return;
    setUsing(true);
    try { const value = await ideaWorkspaceApi.get(item.id, undefined, item.ownerId); if (activeRef.current) onUseProject(value); }
    catch (failure) { if (activeRef.current) setNotice(projectActionError(failure, locale)); }
    finally { if (activeRef.current) setUsing(false); }
  }
  if (!active) return <section hidden className="idea-board idea-projects" data-idea-projects />;
  const openBoard = onOpenBoard && <Button type="button" className="min-h-11 rounded-xl bg-[#FF6B5E] text-slate-950 hover:bg-[#F56053]" onClick={onOpenBoard}><IndiceEmoji name="whiteboard" className="size-5" />{ui.openBoard}</Button>;
  return <section className="idea-board idea-projects space-y-5" data-idea-projects>
    <IndiceTitleBar tone="coral" title={selected && project ? project.summary.name : c.projects} subtitle={selected ? m.viewOnly : m.hint} icon={<IndiceEmoji name="folder" className="size-8" />}
      actions={selected ? <div className="project-preview-actions"><Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={back}><ArrowLeft size={17} />{c.back}</Button>{project && <ProjectActions key={`${project.summary.ownerId}:${project.summary.id}:${project.summary.version}`} item={project.summary} locale={locale} primaryCopy onChanged={changed} onUse={project.summary.owned !== false && onUseProject ? () => void use(project.summary) : undefined} />}</div> : <><Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => setRetry(value => value + 1)} disabled={loading}><RefreshCw size={17} />{m.refresh}</Button>{openBoard}</>} />
    {notice && <div className="workspace-success" role="status"><span>{notice}</span><Button type="button" variant="ghost" className="size-11 shrink-0 p-0" aria-label={m.close} onClick={() => setNotice('')}><X size={17} /></Button></div>}
    {using && <p role="status">{m.working}</p>}
    {!selected && <>
      <div className="project-scope-tabs" role="group" aria-label={ui.library}>{([['OWNED', m.mine, 'folder'], ['SHARED', m.shared, 'people'], ['TRASH', m.trash, 'documents']] as const).map(([value, label, icon]) => <button type="button" key={value} aria-pressed={scope === value} onClick={() => filter('scope', value)}><IndiceEmoji name={icon} className="size-6" />{label}</button>)}</div>
      <IndiceFilterBar title={ui.filters} gridClassName="md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_minmax(180px,1fr)]" summary={<div className="flex flex-wrap items-center gap-3"><span aria-live="polite">{loading || error ? '—' : data?.total ?? 0} {ui.results} · {scopeLabel}</span>{filtered && <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={clearFilters}><X className="size-4" />{ui.clear}</Button>}</div>}>
        <IndiceFilterSearch label={c.search} placeholder={ui.searchHint} value={search} tone="coral" onValueChange={value => filter('search', value.slice(0, 120))} onClear={() => filter('search', '')} clearLabel={ui.clearSearch} />
        <IndiceFilterSelect label={c.projectKind} value={kind} tone="coral" onValueChange={value => filter('kind', value)} options={[{ value: 'ALL', label: ui.allTypes }, { value: 'FREEFORM', label: c.myBoard }, { value: 'SYSTEM', label: c.system }]} />
        <IndiceFilterSelect label={ui.sort} value={sort} tone="coral" onValueChange={value => filter('sort', value)} options={[{ value: 'NEWEST', label: ui.newest }, { value: 'OLDEST', label: ui.oldest }, { value: 'NAME_ASC', label: ui.nameAsc }, { value: 'NAME_DESC', label: ui.nameDesc }]} />
      </IndiceFilterBar>
    </>}
    {loading ? <IndiceViewState variant="loading" tone="coral" title={c.loading} /> : error ? <IndiceViewState variant="error" tone="coral" title={error} action={<Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>{c.retry}</Button>} /> : selected && project ? <ProjectPreview key={`${project.summary.ownerId}:${project.summary.id}`} project={project} locale={locale} /> : !selected && <>
      {data?.items.length ? <div className="workspace-project-grid">{data.items.map(item => <article key={`${item.ownerId}:${item.id}`} className="workspace-project-card">
        <div className={`workspace-project-art ${item.kind === 'SYSTEM' ? 'workspace-project-art-system' : ''}`} aria-hidden="true">{item.kind === 'SYSTEM' ? <><span /><span /><span /><span /><b>↻</b></> : <OriginalModuleEmoji id="ideas-board" className="size-16" />}</div>
        <div className="workspace-project-card-body">
          <div className="project-card-topline"><span className="workspace-project-type">{item.kind === 'SYSTEM' ? c.system : c.myBoard}</span><ProjectActions item={item} locale={locale} onChanged={changed} onUse={onUseProject ? () => void use(item) : undefined} /></div>
          <h3>{item.name}</h3>
          <div className={`project-access-badge ${item.owned === false || item.shareCount ? 'is-shared' : ''}`}><IndiceEmoji name={item.owned === false || item.shareCount ? 'people' : 'check'} className="size-4" />{item.owned === false ? `${m.from} ${item.ownerName ?? ''}` : item.shareCount ? `${m.withTeam} · ${item.shareCount}` : m.private}</div>
          <p>{item.nodeCount} {c.ideas} · {item.connectionCount} {c.links}</p>
          <time dateTime={item.createdAt}>{c.savedOn} {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(item.createdAt))}</time>
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" aria-label={`${c.open}: ${item.name}`} onClick={() => open(item)}><FolderOpen size={17} />{c.open}</Button>
        </div>
      </article>)}</div> : <IndiceViewState className="min-h-64" variant="empty" tone="coral" title={filtered ? ui.noResults : scopeLabel} description={filtered ? ui.noResultsHint : scope === 'SHARED' ? m.emptyShared : scope === 'TRASH' ? m.emptyTrash : m.emptyMine} icon={<FolderOpen className="size-6" />} action={filtered ? <Button type="button" variant="outline" onClick={clearFilters}>{ui.clear}</Button> : scope === 'OWNED' ? openBoard : undefined} />}
      {!!data?.total && <DataTablePagination attached={false} className="project-library-pagination" currentPage={page} pageSize={pageSize} pageSizeOptions={[12, 24, 48]} itemLabel={ui.results} totalCount={data.total} totalPages={Math.max(1, Math.ceil(data.total / pageSize))} pageStart={(page - 1) * pageSize + 1} pageEnd={Math.min(page * pageSize, data.total)} labels={{ rowsPerPage: ui.perPage }} onPageChange={value => setFilters(previous => ({ ...previous, page: value }))} onPageSizeChange={value => setFilters(previous => ({ ...previous, pageSize: value, page: 1 }))} />}
    </>}
  </section>;
}
function ProjectPreview({ project, locale }: { project: Project; locale: string }) {
  const [content, setContent] = useState(() => project.system ? fromSystemDocument(project.system) : project.freeform!), m = projectManagementCopy(locale);
  return <WorkspaceCanvas content={content} onChange={setContent} readonly system={project.summary.kind === 'SYSTEM'} locale={locale} initialFit assetUrl={id => projectManagementApi.assetUrl(project.summary, id)} privacyLabel={project.summary.owned === false ? `${m.from} ${project.summary.ownerName ?? ''} · ${m.viewOnly}` : project.summary.shareCount ? m.withTeam : m.private} />;
}
