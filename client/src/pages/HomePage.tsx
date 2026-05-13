import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Ticket, TicketCheck, Clock, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

type DashboardData = {
  totalTickets: number;
  openTickets: number;
  avgResolveTimeHours: number | null;
  byCategory: { category: string; count: number }[];
  resolvedByAgent: { agentId: string; agentName: string; count: number }[];
};

const BAR_COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)'];

function formatAvgTime(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return '< 1 hr';
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      axios.get<DashboardData>('/api/dashboard', { withCredentials: true }).then((r) => r.data),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {isError && (
        <p className="text-sm text-destructive">Failed to load dashboard data.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Tickets"
          value={data?.totalTickets ?? 0}
          icon={Ticket}
          loading={isPending}
        />
        <StatCard
          title="Open Tickets"
          value={data?.openTickets ?? 0}
          icon={TicketCheck}
          loading={isPending}
        />
        <StatCard
          title="Avg Resolve Time"
          value={formatAvgTime(data?.avgResolveTimeHours ?? null)}
          icon={Clock}
          loading={isPending}
        />
      </div>

      {/* Bar chart — tickets by category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tickets by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.byCategory.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No ticket data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byCategory} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} maxBarSize={80}>
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Resolved by agent table */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tickets Resolved by Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.resolvedByAgent.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No resolved tickets yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Agent</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {data.resolvedByAgent.map((row) => (
                  <tr key={row.agentId} className="border-b last:border-0">
                    <td className="py-3 font-medium">{row.agentName}</td>
                    <td className="py-3 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
