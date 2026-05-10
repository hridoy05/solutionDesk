import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Send } from 'lucide-react';
import { TicketStatus, TicketCategory, SenderType } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';

type Agent = { id: string; name: string; email: string; createdAt: string };

type Reply = {
  id: string;
  body: string;
  senderType: SenderType;
  userId: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
};

type PatchPayload = {
  status?: TicketStatus;
  category?: TicketCategory | null;
  assignedAgentId?: string | null;
};

const SELECT_CLASS =
  'flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function ReplyBubble({ reply, fromName }: { reply: Reply; fromName: string | null }) {
  const isAgent = reply.senderType === SenderType.agent;
  return (
    <div className={`flex flex-col gap-1 ${isAgent ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-muted-foreground">
        {isAgent
          ? (reply.user?.name ?? 'Agent')
          : (fromName ?? 'Customer')}
        {' · '}
        {new Date(reply.createdAt).toLocaleString()}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isAgent
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        }`}
      >
        {reply.body}
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: ticket, isPending, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () =>
      axios.get<Ticket>(`/api/tickets/${id}`, { withCredentials: true }).then((r) => r.data),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      axios.get<Agent[]>('/api/agents', { withCredentials: true }).then((r) => r.data),
  });

  const { mutate: update, isPending: isSaving, isError: saveError } = useMutation({
    mutationFn: (payload: PatchPayload) =>
      axios
        .patch<Ticket>(`/api/tickets/${id}`, payload, { withCredentials: true })
        .then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
    },
  });

  const { mutate: sendReply, isPending: isSendingReply, isError: replyError } = useMutation({
    mutationFn: (body: string) =>
      axios
        .post<Reply>(`/api/tickets/${id}/replies`, { body }, { withCredentials: true })
        .then((r) => r.data),
    onSuccess: (newReply) => {
      queryClient.setQueryData(['ticket', id], (prev: Ticket | undefined) =>
        prev ? { ...prev, replies: [...prev.replies, newReply] } : prev,
      );
      setReplyBody('');
      textareaRef.current?.focus();
    },
  });

  function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (replyBody.trim()) sendReply(replyBody);
  }

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
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{ticket.subject}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {saveError && (
                <p className="text-xs text-destructive">Failed to save changes.</p>
              )}

              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Field label="Status">
                  <select
                    className={SELECT_CLASS}
                    value={ticket.status}
                    disabled={isSaving}
                    onChange={(e) => update({ status: e.target.value as TicketStatus })}
                  >
                    <option value={TicketStatus.open}>Open</option>
                    <option value={TicketStatus.resolved}>Resolved</option>
                    <option value={TicketStatus.closed}>Closed</option>
                  </select>
                </Field>

                <Field label="Category">
                  <select
                    className={SELECT_CLASS}
                    value={ticket.category ?? ''}
                    disabled={isSaving}
                    onChange={(e) =>
                      update({ category: (e.target.value as TicketCategory) || null })
                    }
                  >
                    <option value="">Uncategorized</option>
                    <option value={TicketCategory.general_question}>General Question</option>
                    <option value={TicketCategory.technical_question}>Technical Question</option>
                    <option value={TicketCategory.refund_request}>Refund Request</option>
                  </select>
                </Field>

                <Field label="Assigned Agent">
                  <select
                    className={SELECT_CLASS}
                    value={ticket.assignedAgentId ?? ''}
                    disabled={isSaving}
                    onChange={(e) => update({ assignedAgentId: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="From">
                  <span className="text-sm font-medium">
                    {ticket.fromName ?? <span className="text-muted-foreground">—</span>}
                  </span>
                </Field>

                <Field label="Email">
                  <span className="text-sm text-muted-foreground">{ticket.fromEmail}</span>
                </Field>

                <Field label="Created">
                  <span className="text-sm text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </Field>

                <Field label="Updated">
                  <span className="text-sm text-muted-foreground">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </span>
                </Field>
              </dl>
            </CardContent>
          </Card>

          {/* Thread */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Original message — treated as customer */}
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs text-muted-foreground">
                  {ticket.fromName ?? 'Customer'}
                  {' · '}
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
                  {ticket.body}
                </div>
              </div>

              {ticket.replies.map((reply) => (
                <ReplyBubble key={reply.id} reply={reply} fromName={ticket.fromName} />
              ))}
            </CardContent>

            {/* Compose */}
            <div className="border-t px-6 py-4">
              {replyError && (
                <p className="text-xs text-destructive mb-2">Failed to send reply.</p>
              )}
              <form onSubmit={handleReplySubmit} className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReplySubmit(e as never);
                  }}
                  placeholder="Write a reply…"
                  rows={3}
                  disabled={isSendingReply}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                />
                <Button type="submit" size="sm" disabled={isSendingReply || !replyBody.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-1.5">⌘ Enter to send</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
