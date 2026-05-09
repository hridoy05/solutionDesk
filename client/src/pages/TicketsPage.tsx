import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Column,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TicketStatus, TicketCategory } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

type Ticket = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
};

const statusStyle: Record<TicketStatus, string> = {
  [TicketStatus.open]: 'inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800',
  [TicketStatus.resolved]: 'inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800',
  [TicketStatus.closed]: 'inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600',
};

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: 'General',
  [TicketCategory.technical_question]: 'Technical',
  [TicketCategory.refund_request]: 'Refund',
};

function SortHeader({ column, children }: { column: Column<Ticket>; children: React.ReactNode }) {
  const sorted = column.getIsSorted();
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'subject',
    header: ({ column }) => <SortHeader column={column}>Subject</SortHeader>,
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'fromEmail',
    header: ({ column }) => <SortHeader column={column}>From</SortHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.fromName
          ? `${row.original.fromName} <${row.original.fromEmail}>`
          : row.original.fromEmail}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
    cell: ({ getValue }) => {
      const s = getValue<TicketStatus>();
      return <span className={statusStyle[s]}>{s}</span>;
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortHeader column={column}>Category</SortHeader>,
    cell: ({ getValue }) => {
      const c = getValue<TicketCategory | null>();
      return <span className="text-muted-foreground">{c ? categoryLabel[c] : '—'}</span>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortHeader column={column}>Date</SortHeader>,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {new Date(getValue<string>()).toLocaleDateString()}
      </span>
    ),
  },
];

const SELECT_CLASS = 'flex h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

type PaginatedTickets = {
  data: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 10;

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [page, setPage] = useState(1);

  const sortBy = sorting[0]?.id ?? 'createdAt';
  const sortOrder = sorting[0]?.desc === false ? 'asc' : 'desc';

  const { data: response, isPending, isError } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder, statusFilter, categoryFilter, page],
    queryFn: () =>
      axios
        .get<PaginatedTickets>('/api/tickets', {
          params: {
            sortBy,
            sortOrder,
            page,
            pageSize: PAGE_SIZE,
            ...(statusFilter   && { status: statusFilter }),
            ...(categoryFilter && { category: categoryFilter }),
          },
          withCredentials: true,
        })
        .then((res) => res.data),
  });

  const tickets = response?.data ?? [];
  const totalPages = response?.totalPages ?? 1;
  const total = response?.total ?? 0;

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: (updater) => { setSorting(updater); setPage(1); },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(1); }}
              className={SELECT_CLASS}
            >
              <option value="">All statuses</option>
              <option value={TicketStatus.open}>Open</option>
              <option value={TicketStatus.resolved}>Resolved</option>
              <option value={TicketStatus.closed}>Closed</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as TicketCategory | ''); setPage(1); }}
              className={SELECT_CLASS}
            >
              <option value="">All categories</option>
              <option value={TicketCategory.general_question}>General</option>
              <option value={TicketCategory.technical_question}>Technical</option>
              <option value={TicketCategory.refund_request}>Refund</option>
            </select>
          </div>
          {isError && (
            <p className="text-sm text-destructive py-4 text-center">Failed to load tickets.</p>
          )}
          {!isError && (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      No tickets yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {!isError && !isPending && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{total} ticket{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
