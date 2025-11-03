import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [finalEmbedUrl, setFinalEmbedUrl] = useState<string>(embedUrl);
  const [embedToken, setEmbedToken] = useState<string | null>(null);

  // Fetch embed token on mount if reportId is provided
  useEffect(() => {
    const fetchEmbedToken = async () => {
      if (!reportId) {
        // If no reportId, use original embedUrl
        setFinalEmbedUrl(embedUrl);
        setIsLoading(false);
        return;
      }

      // Set a timeout to prevent hanging forever
      const timeoutId = setTimeout(() => {
        console.warn('[PowerBI] Token fetch timeout - using fallback URL');
        setFinalEmbedUrl(embedUrl);
        setIsLoading(false);
      }, 10000); // 10 second timeout

      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors
        console.log('[PowerBI] Fetching embed token for report:', reportId);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8 second fetch timeout
        
        const response = await fetch(`/api/powerbi/embed-token/${reportId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));
        
        clearTimeout(timeoutId); // Clear the component timeout
        
        // Check if response is HTML (error page) instead of JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
            throw new Error('Server returned HTML instead of JSON. Falling back to autoAuth.');
          }
        }
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: Server error`);
          }
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch embed token`);
        }

        const data = await response.json();
        
        if (!data.token) {
          throw new Error('No token received from server');
        }
        
        setEmbedToken(data.token);
        
        // Construct embed URL with token (remove autoAuth if present)
        try {
          const url = new URL(data.embedUrl || embedUrl);
          url.searchParams.delete('autoAuth'); // Remove autoAuth if present
          url.searchParams.set('token', data.token); // Add token
          setFinalEmbedUrl(url.toString());
          console.log('[PowerBI] Embed token fetched successfully, URL updated with token');
        } catch (urlError) {
          console.error('[PowerBI] Error constructing URL:', urlError);
          // Fallback: just use the token directly
          setFinalEmbedUrl(`${embedUrl}&token=${data.token}`);
        }
        
        setIsLoading(false);
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
          console.warn('[PowerBI] Token fetch aborted due to timeout');
        } else {
          console.error('[PowerBI] Error fetching embed token:', err);
        }
        
        // IMPORTANT: Since embed token generation failed, we'll use autoAuth as a fallback
        // This requires users to sign in to Power BI, but allows them to see the dashboard
        console.error('[PowerBI] Token generation failed - falling back to autoAuth');
        console.error('[PowerBI] Error details:', err);
        
        // Build fallback URL with autoAuth - this will prompt users to sign in to Power BI
        try {
          const url = new URL(embedUrl);
          url.searchParams.set('autoAuth', 'true');
          // Remove token if it exists
          url.searchParams.delete('token');
          setFinalEmbedUrl(url.toString());
          setError('Embed token generation failed. Dashboard will require Power BI sign-in. Please ensure Service Principal is configured with workspace permissions in Power BI.');
          setIsLoading(false);
        } catch (urlError) {
          console.error('[PowerBI] Error building fallback URL:', urlError);
          setError('Unable to load dashboard. Please check Power BI Service Principal configuration.');
          setFinalEmbedUrl('');
          setIsLoading(false);
        }
      }
    };

    fetchEmbedToken();
  }, [reportId, embedUrl]);

  // Define generateAIInsight BEFORE it's used in useEffect
  const generateAIInsight = useCallback(async () => {
    if (!embedToken || !reportId) return;
    
    setLoadingInsight(true);
    try {
      const response = await fetch('/api/powerbi/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId: reportId,
          dashboardId: 'program-delivery',
        }),
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
  }, [embedToken, reportId, onAiInsightGenerated]);

  // Suppress Power BI Application Insights telemetry errors from console
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Intercept console errors to filter out Application Insights telemetry errors
    const errorInterceptor = (...args: any[]) => {
      const errorString = String(args.join(' ')).toLowerCase();
      // Filter out Application Insights 429 errors (telemetry rate limiting)
      // These are harmless Power BI telemetry errors and can be safely ignored
      if ((errorString.includes('applicationinsights') || 
           errorString.includes('application-insights')) && 
          (errorString.includes('429') || 
           errorString.includes('too many requests') ||
           errorString.includes('rate limit'))) {
        // Silently ignore - this is Power BI telemetry rate limiting, not a functional error
        return;
      }
      // Log other errors normally
      originalError.apply(console, args);
    };

    const warnInterceptor = (...args: any[]) => {
      const warnString = String(args.join(' ')).toLowerCase();
      // Also filter warnings from Application Insights
      if (warnString.includes('applicationinsights') && warnString.includes('429')) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = errorInterceptor;
    console.warn = warnInterceptor;

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Set up iframe load handlers
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
      if (showAiInsights && embedToken) {
        generateAIInsight().catch(console.error);
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
  }, [finalEmbedUrl, showAiInsights, embedToken, generateAIInsight]);

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
        {/* Show error as warning banner (non-blocking) */}
        {error && !error.includes('Failed to load dashboard') && (
          <div className="absolute top-2 left-2 right-2 z-30 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded p-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        )}

        {/* Show iframe if we have a valid URL (with token or autoAuth fallback) */}
        {finalEmbedUrl && finalEmbedUrl.length > 0 && (
          <iframe
            ref={iframeRef}
            title={title}
            src={finalEmbedUrl}
            frameBorder="0"
            allowFullScreen={true}
            className="w-full h-full"
            style={{ minHeight: '100%', width: '100%' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => {
              if (embedToken) {
                console.log('[PowerBI] Iframe loaded successfully with embed token');
              } else {
                console.log('[PowerBI] Iframe loaded with autoAuth fallback (user will need to sign in)');
              }
              setIsLoading(false);
              // Only clear error if we have a token - keep error message visible for autoAuth
              if (embedToken) {
                setError(null);
              }
            }}
          />
        )}

        {/* Show error banner (non-blocking) if token generation failed but we have fallback */}
        {error && finalEmbedUrl && finalEmbedUrl.includes('autoAuth=true') && (
          <div className="absolute top-2 left-2 right-2 z-30 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded p-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-yellow-700 dark:text-yellow-300" />
            <span className="text-yellow-800 dark:text-yellow-200">{error}</span>
          </div>
        )}
        
        {/* Show full error screen only if we have no URL at all */}
        {error && !isLoading && (!finalEmbedUrl || finalEmbedUrl.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
            <div className="p-8 text-center bg-card rounded-lg border border-border max-w-md">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-destructive mb-4">{error}</p>
              <p className="text-xs text-muted-foreground mb-4">
                The dashboard requires embed token authentication. Please ensure Power BI Service Principal is configured correctly with workspace permissions.
              </p>
              <Button onClick={() => {
                // Retry by reloading the page
                window.location.reload();
              }} variant="outline">
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

