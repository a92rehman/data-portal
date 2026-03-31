import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { toast } from "react-toastify";

interface InsightResult {
  id: string;
  result_json: { rows: Record<string, unknown>[] };
  confidence: number;
  confidence_band: "high" | "moderate" | "low";
  confidence_factors: string[];
}

const BAND_STYLE: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  moderate: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

export default function AskData() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<InsightResult | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (q: string) => {
      return apiRequest("POST", "/api/insightflow/query", { question: q });
    },
    onSuccess: (data: { data: { query_id: string } }) => {
      setStreaming(true);
      setResult(null);
      openStream(data.data.query_id);
    },
    onError: () => toast.error("Analytics service unavailable. Try again shortly."),
  });

  function openStream(queryId: string) {
    const es = new EventSource(`/api/insightflow/query/${queryId}/stream`, { withCredentials: true });

    es.addEventListener("answer", (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setResult(parsed as InsightResult);
        setStreaming(false);
        es.close();
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("error", (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        toast.error(parsed.message || "Query failed");
      } catch { toast.error("Query failed"); }
      setStreaming(false);
      es.close();
    });

    es.addEventListener("done", () => { setStreaming(false); es.close(); });

    es.onerror = () => { setStreaming(false); es.close(); };
  }

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!result || !rating) return;
      await apiRequest("POST", "/api/insightflow/feedback", {
        insight_id: result.id,
        feedback_text: feedbackText || "(no comment)",
        rating,
      });
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback!");
      setFeedbackText("");
      setRating(null);
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Ask Data</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Textarea
            placeholder="Ask a question, e.g. 'How many teachers completed training this month?'"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <Button
            onClick={() => submitMutation.mutate(question)}
            disabled={!question.trim() || streaming || submitMutation.isPending}
          >
            {streaming || submitMutation.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Thinking...</>
              : <><Send className="mr-2 h-4 w-4" />Ask</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Answer</CardTitle>
              <Badge className={BAND_STYLE[result.confidence_band]}>
                {result.confidence_band} · {Math.round(result.confidence * 100)}% confident
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground mt-1 list-disc pl-4">
              {result.confidence_factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </CardHeader>
          <CardContent>
            {result.result_json?.rows?.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>{Object.keys(result.result_json.rows[0]).map(c =>
                      <th key={c} className="border px-3 py-2 bg-muted text-left">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.result_json.rows.slice(0, 50).map((row, i) =>
                      <tr key={i}>{Object.values(row).map((v, j) =>
                        <td key={j} className="border px-3 py-1">{String(v ?? "")}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-2">Rate this answer (1–5)</p>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n}
                    onClick={() => setRating(n)}
                    className={`px-3 py-1 rounded border text-sm transition-colors
                      ${rating === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Tell us what's right or wrong about this answer (optional)"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={2}
                className="mb-2"
              />
              <Button size="sm" variant="outline"
                onClick={() => feedbackMutation.mutate()}
                disabled={!rating || feedbackMutation.isPending}>
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
