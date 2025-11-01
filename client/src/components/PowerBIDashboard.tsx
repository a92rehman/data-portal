import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, Maximize2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface PowerBIDashboardProps {
  embedUrl: string;
  title: string;
  description?: string;
  width?: string;
  height?: string;
  showAiInsights?: boolean;
  onAiInsightGenerated?: (insight: string) => void;
}

export default function PowerBIDashboard({
  embedUrl,
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <Card className="gradient-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDashboard}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </Button>
            </div>
          </div>

          {/* AI Insights Badge */}
          {showAiInsights && (
            <div className="mt-4">
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered Insights
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* AI Insight Display */}
          {showAiInsights && aiInsight && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">AI Insight</h4>
                  <p className="text-sm text-muted-foreground">{aiInsight}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateAIInsight}
                  disabled={loadingInsight}
                  className="flex-shrink-0"
                >
                  {loadingInsight ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Dashboard Embed Container */}
          <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-border">
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

            <iframe
              ref={iframeRef}
              title={title}
              width={width}
              height={height}
              src={embedUrl}
              frameBorder="0"
              allowFullScreen={true}
              className="w-full"
              style={{
                minHeight: '400px',
              }}
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

