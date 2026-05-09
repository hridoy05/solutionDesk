import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { TicketStatus, TicketCategory } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

type Ticket = {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
};

const statusStyle: Record<TicketStatus, string> = {
  [TicketStatus.open]: 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800',
  [TicketStatus.resolved]: 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800',
  [TicketStatus.closed]: 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600',
};

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: 'General Question',
  [TicketCategory.technical_question]: 'Technical Question',
  [TicketCategory.refund_request]: 'Refund Request',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () =>
      axios.get<Ticket>(`/api/tickets/${id}`, { withCredentials: true }).then((res) => res.data),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tickets
      </Link>

      {isError && (
        <p className="text-sm text-destructive py-4 text-center">Failed to load ticket.</p>
      )}

      {isPending && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {ticket && (
        <Card>
          <CardHeader>
            <CardTitle>{ticket.subject}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Field label="Status">
                <span className={statusStyle[ticket.status]}>{ticket.status}</span>
              </Field>
              <Field label="Category">
                <span className="text-sm">{ticket.category ? categoryLabel[ticket.category] : '—'}</span>
              </Field>
              <Field label="From">
                <span className="text-sm">
                  {ticket.fromName ? `${ticket.fromName} <${ticket.fromEmail}>` : ticket.fromEmail}
                </span>
              </Field>
              <Field label="Created">
                <span className="text-sm">{new Date(ticket.createdAt).toLocaleString()}</span>
              </Field>
              <Field label="Updated">
                <span className="text-sm">{new Date(ticket.updatedAt).toLocaleString()}</span>
              </Field>
            </dl>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Message</dt>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {ticket.body}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
