import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Loader2, AlertTriangle } from "lucide-react";

export default function Observability() {
  const { user } = useAuth();
  // Guard order matters: check null first, then role.
  // If user is null (auth loading), skip to the fetch — the Express route
  // will 403 and `isError` handles it. Without this, `!user` skips the
  // role check entirely and an unauthenticated render briefly appears.
  if (!user) return <Redirect to="/" />;
  if ((user as any).role !== "team_lead") return <Redirect to="/" />;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["observability"],
    queryFn: async () => (await apiRequest("GET", "/api/insightflow/observability")).json(),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (isError || !data) return <p className="p-6 text-destructive">Could not load observability data.</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Platform Observability</h1>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { label: "Avg Confidence", value: `${Math.round((data.avg_confidence ?? 0) * 100)}%` },
          { label: "Cache Hit Rate", value: `${Math.round((data.cache_hit_rate ?? 0) * 100)}%` },
          { label: "Total Queries",  value: data.total_queries ?? 0 },
          { label: "Low Confidence", value: data.low_confidence_count ?? 0, warn: true },
        ].map(({ label, value, warn }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                {warn && <AlertTriangle className="h-4 w-4 text-yellow-500" />}{label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${warn ? "text-yellow-600" : ""}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Satisfaction vs confidence */}
      {data.satisfaction_vs_confidence?.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>User Satisfaction vs Confidence Band</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.satisfaction_vs_confidence}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="band" />
                <YAxis domain={[0, 5]} />
                <Tooltip formatter={(v: any) => [`${v}/5`, "Avg Rating"]} />
                <Bar dataKey="avg_rating" fill="#6366f1" name="Avg Rating" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top questions */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Top 20 Most Asked Questions</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-2">Question</th>
              <th className="text-right py-2">Hits</th>
              <th className="text-right py-2">Confidence</th>
            </tr></thead>
            <tbody>
              {(data.top_questions ?? []).map((q: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/50">
                  <td className="py-2 pr-4 max-w-xs truncate">{q.question}</td>
                  <td className="py-2 text-right">{q.hit_count}</td>
                  <td className="py-2 text-right">{Math.round(q.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Per-user activity */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Per-User Activity</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.per_user_activity ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="user_id" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="query_count" fill="#6366f1" name="Queries" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent feedback */}
      <Card>
        <CardHeader><CardTitle>Recent User Feedback</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.recent_feedback ?? []).slice(0, 20).map((f: any) => (
              <div key={f.id} className="border rounded p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{f.owner_user_id}</span>
                  <span className="text-muted-foreground">Rating: {f.rating}/5</span>
                </div>
                <p className="text-sm">{f.feedback_text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
