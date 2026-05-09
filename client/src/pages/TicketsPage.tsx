import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TicketStatus, TicketCategory } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
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

export default function TicketsPage() {
  const { data: tickets = [], isPending, isError } = useQuery({
    queryKey: ['tickets'],
    queryFn: () =>
      axios.get<Ticket[]>('/api/tickets', { withCredentials: true }).then((res) => res.data),
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
          {isPending && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {isError && (
            <p className="text-sm text-destructive py-4 text-center">Failed to load tickets.</p>
          )}
          {!isPending && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No tickets yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.fromName ? `${ticket.fromName} <${ticket.fromEmail}>` : ticket.fromEmail}
                      </TableCell>
                      <TableCell>
                        <span className={statusStyle[ticket.status]}>{ticket.status}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.category ? categoryLabel[ticket.category] : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
