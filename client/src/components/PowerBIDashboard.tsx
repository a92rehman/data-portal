import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, Maximize2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface PowerBIDashboardProps {
  embedUrl: string;
  reportId?: string;
  title: string;
  description?: string;
  width?: string;
  height?: string;
  showAiInsights?: boolean;
  onAiInsightGenerated?: (insight: string) => void;
}

export default function PowerBIDashboard({
  embedUrl,
  reportId,
  title,
  description,
  width = '100%',
  height = '600px',
  showAiInsights = true,
  onAiInsightGenerated,
}: PowerBIDashboardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    // Set up loading state
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
      if (showAiInsights) {
        generateAIInsight();
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load dashboard. Please check your Power BI access.');
    };

    // Add event listeners
    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // Set a timeout to stop loading state if iframe takes too long
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 30000); // 30 seconds max

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(loadingTimeout);
    };
  }, [embedUrl, showAiInsights]);

  const generateAIInsight = async () => {
    setLoadingInsight(true);
    try {
      const response = await fetch('/api/powerbi/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insight');
      }

      const data = await response.json();
      setAiInsight(data.insight);
      onAiInsightGenerated?.(data.insight);
    } catch (err) {
      console.error('Error generating AI insight:', err);
      // Set a fallback message
      setAiInsight('📊 Keep tracking your data insights!');
    } finally {
      setLoadingInsight(false);
    }
  };

  const refreshDashboard = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      // Force reload of iframe
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
    }
  };

  const toggleFullscreen = () => {
    if (iframeRef.current) {
      if (!document.fullscreenElement) {
        iframeRef.current.requestFullscreen?.().catch((err) => {
          console.error('Error requesting fullscreen:', err);
        });
      } else {
        document.exitFullscreen?.().catch((err) => {
          console.error('Error exiting fullscreen:', err);
        });
      }
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Dashboard Embed Container */}
      <div className="relative flex-1 bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={refreshDashboard} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {!error && (
          <iframe
            ref={iframeRef}
            title={title}
            src={embedUrl}
            frameBorder="0"
            allowFullScreen={true}
            className="w-full h-full"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}

