import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function MyReports() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-reports"],
    queryFn: async () => (await apiRequest("GET", "/api/insightflow/reports")).json(),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (isError) return <p className="p-6 text-destructive">Could not load reports.</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Reports</h1>
      {(!data || data.length === 0)
        ? <p className="text-muted-foreground">No reports yet.</p>
        : <div className="grid gap-4">
            {data.map((r: any) => (
              <Card key={r.id}>
                <CardHeader><CardTitle>{r.title}</CardTitle></CardHeader>
                <CardContent>
                  {/* DOMPurify sanitizes content_html before render — prevents stored XSS */}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(r.content_html ?? ""),
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}
