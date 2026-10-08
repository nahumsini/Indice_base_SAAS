import { ArrowRightLeft, MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import { IndiceOperationalTable, IndiceTableActionGroup, IndiceTableColGroup, IndiceTableHeaderRow, IndiceTableShell, type IndiceTableColumnDefinition } from '../../../components/table/IndiceTableEngine';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { TableBody, TableCell, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import type { Reservation, ReservationPage } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, StatusBadge } from './SchedulingPrimitives';
import type { ManagementAction } from './ReservationManagement';
export type ReservationColumn = 'time' | 'attendee' | 'service' | 'consultant' | 'status';
export function ReservationsTable({ data, columns, copy, locale, page, size, canManage, administrator, onPage, onSize, onResize, onReview, onManage }: {
  data: ReservationPage; columns: IndiceTableColumnDefinition<ReservationColumn>[]; copy: SchedulingCopy; locale: string; page: number; size: number;
  canManage: boolean; administrator: boolean; onPage: (page: number) => void; onSize: (size: number) => void;
  onResize: (id: ReservationColumn, width: number) => void; onReview: (record: Reservation) => void; onManage: (record: Reservation, action: ManagementAction) => void;
}) {
  return <IndiceTableShell pagination={<DataTablePagination currentPage={page} totalPages={Math.max(1,Math.ceil(data.total/size))} totalCount={data.total} pageSize={size}
    pageSizeOptions={[10,25,50,100,200]} pageStart={data.total?(page-1)*size+1:0} pageEnd={Math.min(page*size,data.total)} onPageChange={onPage} onPageSizeChange={onSize}/> }>
    <IndiceOperationalTable minimumWidth={columns.reduce((sum,c)=>sum+c.width,210)}><IndiceTableColGroup columns={columns} actionsWidth={210}/>
      <IndiceTableHeaderRow columns={columns} onResize={onResize} tone="coral" actions={{label:copy.actions,width:210}}/>
      <TableBody>{!data.items.length?<TableRow><TableCell colSpan={6} className="h-36 text-center text-slate-500">{copy.empty}</TableCell></TableRow>:data.items.map(record=>{
        const future=new Date(record.startAt)>new Date(),active=['REQUESTED','CONFIRMED'].includes(record.status);
        return <TableRow key={record.id}>
          <TableCell className="px-5 py-4"><p className="text-sm font-medium">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(record.startAt))}</p><p className="mt-1 text-xs text-slate-500">{record.durationMinutes} {copy.minutes}</p></TableCell>
          <TableCell className="px-5 py-4"><p className="truncate font-medium" title={record.attendeeName}>{record.attendeeName}</p><p className="mt-1 truncate text-xs text-slate-500">{record.attendeeEmail}</p></TableCell>
          <TableCell className="px-5 py-4"><span className="block truncate text-sm" title={record.serviceName}>{record.serviceName}</span></TableCell>
          <TableCell className="px-5 py-4"><span className="block truncate text-sm">{record.staffName}</span></TableCell>
          <TableCell className="px-5 py-4"><StatusBadge status={record.status} copy={copy}/>{record.archivedAt&&<p className="mt-2 text-xs text-slate-500">{copy.archived}</p>}</TableCell>
          <TableCell className="px-5 py-4"><IndiceTableActionGroup>
            <ActionButton onClick={()=>onReview(record)} aria-label={`${copy.details}: ${record.attendeeName}`}>{copy.details}</ActionButton>
            {canManage&&!record.archivedAt&&<DropdownMenu><DropdownMenuTrigger asChild><ActionButton aria-label={`${copy.actions}: ${record.attendeeName}`} className="px-3"><MoreHorizontal className="h-4 w-4"/></ActionButton></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {administrator&&<DropdownMenuItem disabled={Boolean(record.eventId)||!future||!['REQUESTED','CONFIRMED','PAUSED'].includes(record.status)} onSelect={()=>onManage(record,'REASSIGN')}><ArrowRightLeft className="h-4 w-4"/>{copy.reassign}</DropdownMenuItem>}
                {record.status==='PAUSED'?<DropdownMenuItem disabled={!future} onSelect={()=>onManage(record,'RESUME')}><Play className="h-4 w-4"/>{copy.resume}</DropdownMenuItem>:
                  <DropdownMenuItem disabled={!active||!future} onSelect={()=>onManage(record,'PAUSE')}><Pause className="h-4 w-4"/>{copy.pause}</DropdownMenuItem>}
                <DropdownMenuItem className="text-red-600 dark:text-red-400" onSelect={()=>onManage(record,'ARCHIVE')}><Trash2 className="h-4 w-4"/>{copy.remove}</DropdownMenuItem>
              </DropdownMenuContent></DropdownMenu>}
          </IndiceTableActionGroup></TableCell>
        </TableRow>;
      })}</TableBody>
    </IndiceOperationalTable>
  </IndiceTableShell>;
}
