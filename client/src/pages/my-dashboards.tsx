import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function MyDashboards() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-dashboards"],
    queryFn: async () => (await apiRequest("GET", "/api/insightflow/dashboards")).json(),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (isError) return <p className="p-6 text-destructive">Could not load dashboards. Analytics service may be unavailable.</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Dashboards</h1>
      {(!data || data.length === 0)
        ? <p className="text-muted-foreground">No dashboards yet. Ask a question to get started.</p>
        : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((d: any) => (
              <Card key={d.id}>
                <CardHeader><CardTitle>{d.title}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{d.insight_ids?.length ?? 0} insights</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}
