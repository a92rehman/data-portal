import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, Maximize2, AlertCircle, Copy, Check, X } from 'lucide-react';
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

// Use PowerBI SDK for proper embedding
declare global {
  interface Window {
    powerbi?: any;
  }
}

// Power BI credentials constants
const POWERBI_EMAIL = 'abdur.rehman@taleemabad.com';
const POWERBI_PASSWORD = 'Abdul@6045099';
const STORAGE_KEY_CREDENTIALS_SAVED = 'app_powerbi_credentials_saved';
const STORAGE_KEY_EMAIL = 'app_powerbi_email';
const STORAGE_KEY_PASSWORD = 'app_powerbi_password';

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
  // SDK refs removed - using iframe method only
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [finalEmbedUrl, setFinalEmbedUrl] = useState<string>(embedUrl);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fetchEmbedTokenRef = useRef<(() => Promise<void>) | null>(null);
  
  // Credentials display state
  const [showCredentials, setShowCredentials] = useState(false);
  const [isPowerBILoggedIn, setIsPowerBILoggedIn] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  // Check localStorage on mount
  useEffect(() => {
    const credentialsSaved = localStorage.getItem(STORAGE_KEY_CREDENTIALS_SAVED);
    if (credentialsSaved === 'true') {
      setIsPowerBILoggedIn(true);
      setShowCredentials(false);
    } else {
      // Show credentials if not saved yet
      setShowCredentials(true);
    }
  }, []);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Save credentials to localStorage - use useCallback to make it stable
  const saveCredentials = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_EMAIL, POWERBI_EMAIL);
    localStorage.setItem(STORAGE_KEY_PASSWORD, POWERBI_PASSWORD);
    localStorage.setItem(STORAGE_KEY_CREDENTIALS_SAVED, 'true');
    setIsPowerBILoggedIn(true);
    setShowCredentials(false);
  }, []);

  // Fetch embed token on mount if reportId is provided
  useEffect(() => {
    const fetchEmbedToken = async (forceRefresh = false) => {
      if (!reportId) {
        // If no reportId, use original embedUrl
        setFinalEmbedUrl(embedUrl);
        setIsLoading(false);
        return;
      }
      
      // If embedUrl already has autoAuth=true, use it directly (for PPU)
      if (embedUrl.includes('autoAuth=true')) {
        console.log('[PowerBI] Using autoAuth URL directly (PPU mode)');
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
        
        // Add forceRefresh query param if retrying or forced refresh
        const url = forceRefresh || retryCount > 0
          ? `/api/powerbi/embed-token/${reportId}?forceRefresh=true`
          : `/api/powerbi/embed-token/${reportId}`;
        
        const response = await fetch(url, {
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
        
        // Always use iframe method - no SDK
        console.log('[PowerBI] ✅ Using iframe embedding method');
        console.log('[PowerBI] Embed URL:', data.embedUrl || embedUrl);
        console.log('[PowerBI] Token received:', !!data.token);
        
        try {
          // Use the embedUrl from server exactly as provided - don't modify it
          // PowerBI embed URLs are carefully constructed by the API
          const baseEmbedUrl = data.embedUrl || embedUrl;
          
          // Simply append the token parameter - don't modify anything else
          // PowerBI handles the rest of the URL construction
          const separator = baseEmbedUrl.includes('?') ? '&' : '?';
          const finalUrl = `${baseEmbedUrl}${separator}token=${encodeURIComponent(data.token)}`;
          console.log('[PowerBI] Final embed URL prepared (length:', finalUrl.length, ')');
          console.log('[PowerBI] URL preview:', finalUrl.substring(0, 100) + '...');
          
          setFinalEmbedUrl(finalUrl);
          setIsLoading(false); // Set to false - iframe will trigger onLoad
        } catch (urlError) {
          console.error('[PowerBI] Error building embed URL:', urlError);
          // Fallback: build URL manually
          const baseUrl = data.embedUrl || embedUrl;
          const separator = baseUrl.includes('?') ? '&' : '?';
          const finalUrl = `${baseUrl}${separator}token=${encodeURIComponent(data.token)}`;
          setFinalEmbedUrl(finalUrl);
          setIsLoading(false);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
          console.warn('[PowerBI] Token fetch aborted due to timeout');
        } else {
          console.error('[PowerBI] Error fetching embed token:', err);
        }
        
        // Exponential backoff retry with max 3 attempts
        const maxRetries = 3;
        const baseDelayMs = 2000; // 2 seconds
        const currentRetryDelay = baseDelayMs * Math.pow(2, retryCount); // 2s, 4s, 8s
        
        if (retryCount < maxRetries && !forceRefresh) {
          console.log(`[PowerBI] Retry ${retryCount + 1}/${maxRetries} - waiting ${currentRetryDelay / 1000}s before retry`);
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            fetchEmbedToken(true).catch(console.error);
          }, currentRetryDelay);
          return; // Don't fall back to autoAuth yet
        }
        
        // IMPORTANT: Since embed token generation failed, we'll use autoAuth as a fallback
        // This requires users to sign in to Power BI, but allows them to see the dashboard
        console.error('[PowerBI] Token generation failed after all retries - falling back to autoAuth');
        console.error('[PowerBI] Error details:', err);
        
        // Build fallback URL with autoAuth - this will prompt users to sign in to Power BI
        try {
          const url = new URL(embedUrl);
          url.searchParams.set('autoAuth', 'true');
          // Remove token if it exists
          url.searchParams.delete('token');
          setFinalEmbedUrl(url.toString());
          setError(null); // Clear error since we have a working fallback
          setIsLoading(false);
        } catch (urlError) {
          console.error('[PowerBI] Error building fallback URL:', urlError);
          setError('Unable to load dashboard. Please check Power BI Service Principal configuration.');
          setFinalEmbedUrl('');
          setIsLoading(false);
        }
      }
    };
    
    // Store ref so we can call it manually for retry
    fetchEmbedTokenRef.current = () => fetchEmbedToken(true);

    fetchEmbedToken();
  }, [reportId, embedUrl, retryCount]);

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

  // Suppress Power BI Application Insights telemetry errors and Vite HMR WebSocket errors from console
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Intercept console errors to filter out Application Insights telemetry errors and Vite HMR WebSocket errors
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
      // Filter out Vite HMR WebSocket errors - these are dev server issues, not app issues
      if ((errorString.includes('websocket') || errorString.includes('connection')) && 
          (errorString.includes('localhost:undefined') || 
           errorString.includes('failed to construct \'websocket\'') ||
           errorString.includes('err_connection_timed_out') ||
           errorString.includes('24678') ||
           errorString.includes('vite') ||
           errorString.includes('server connection lost') ||
           errorString.includes('polling for restart'))) {
        // Silently ignore - these are Vite dev server HMR issues, not functional errors
        // The actual application WebSocket (for notifications) works fine
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

  // Set up iframe load handlers with improved detection
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !finalEmbedUrl) return;

    let loadHandled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    let loadCheckCount = 0;
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const maxChecks = 30; // Check every 2 seconds for 60 seconds total

    const markAsLoaded = () => {
      if (loadHandled) return;
      loadHandled = true;
      
      if (timeoutId) clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
      
      setIsLoading(false);
      setError(null);
      
      // If report loaded successfully and credentials not saved yet, save them
      const credentialsSaved = localStorage.getItem(STORAGE_KEY_CREDENTIALS_SAVED);
      if (credentialsSaved !== 'true') {
        console.log('[PowerBI] Report loaded successfully - saving credentials');
        saveCredentials();
      }
      
      if (showAiInsights && embedToken) {
        generateAIInsight().catch(console.error);
      }
    };

    const handleLoad = () => {
      console.log('[PowerBI] Iframe onLoad event fired');
      console.log('[PowerBI] Iframe current src:', iframe.src?.substring(0, 200));
      
      // Check if the iframe actually loaded PowerBI or if it redirected/errored
      // We can't access cross-origin content, but we can check the URL
      const currentSrc = iframe.src || '';
      if (!currentSrc.includes('app.powerbi.com')) {
        console.error('[PowerBI] Iframe src does not point to PowerBI! Current src:', currentSrc);
        setError('PowerBI iframe failed to load correctly');
        handleError();
        return;
      }
      
      // Don't mark as loaded immediately - PowerBI needs significant time to authenticate and render
      // The iframe loads quickly, but PowerBI content inside takes 10-30 seconds to fully render
      console.log('[PowerBI] Iframe loaded - PowerBI is authenticating and rendering (this can take 15-30 seconds)...');
      
      // Listen for PowerBI postMessage events to detect actual load completion
      messageHandler = (event: MessageEvent) => {
        // PowerBI sends postMessage events when content is loaded
        // We can detect these even from cross-origin iframes
        if (event.origin.includes('powerbi.com') || event.origin.includes('powerbi.microsoft.com')) {
          console.log('[PowerBI] Received postMessage from PowerBI:', event.type, event.data);
          
          // Check for various PowerBI load events
          const data = event.data;
          if (data && (
            (typeof data === 'object' && (
              data.eventName === 'loaded' ||
              data.type === 'reportLoaded' ||
              data.name === 'loaded'
            )) ||
            (typeof data === 'string' && data.includes('loaded'))
          )) {
            console.log('[PowerBI] ✅ PowerBI report loaded successfully (detected via postMessage)');
            
            markAsLoaded();
            if (messageHandler) {
              window.removeEventListener('message', messageHandler);
              messageHandler = null;
            }
          }
        }
      };
      
      // Listen for PowerBI postMessage events
      window.addEventListener('message', messageHandler);
      
      // Also set a longer timeout as fallback - PowerBI can take 20-30 seconds on slow connections
      // Especially with Service Principal authentication
      timeoutId = setTimeout(() => {
        if (!loadHandled) {
          markAsLoaded();
          if (messageHandler) {
            window.removeEventListener('message', messageHandler);
            messageHandler = null;
          }
          console.log('[PowerBI] Loading timeout reached (30s) - hiding loader');
          console.log('[PowerBI] If report is still not visible, the token may have insufficient permissions');
          console.log('[PowerBI] Click "Open in New Tab" to verify the URL works directly');
        }
      }, 30000); // 30 seconds - give PowerBI plenty of time
    };

    const handleError = () => {
      console.error('[PowerBI] Iframe onError event fired');
      if (loadHandled) return;
      loadHandled = true;
      
      if (timeoutId) clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
      
      setIsLoading(false);
      setError('Failed to load dashboard. Please check your Power BI access.');
    };

    // Add event listeners
    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // Poll to check if iframe is actually loaded and PowerBI is rendering
    checkInterval = setInterval(() => {
      loadCheckCount++;
      try {
        // Try to access iframe content - if accessible, check for PowerBI errors
        // Note: This will throw if CORS blocks it (expected for PowerBI)
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const iframeWindow = iframe.contentWindow;
        
        if (iframeDoc && iframeDoc.readyState === 'complete') {
          // Check if there's any error message visible in the iframe
          // PowerBI might show error messages that we can detect
          const body = iframeDoc.body;
          if (body) {
            const bodyText = body.innerText || body.textContent || '';
            if (bodyText.toLowerCase().includes('error') || 
                bodyText.toLowerCase().includes('access denied') ||
                bodyText.toLowerCase().includes('sign in')) {
              console.warn('[PowerBI] Potential error detected in iframe:', bodyText.substring(0, 200));
              // Don't mark as loaded if there's an error
              return;
            }
          }
          
          // Iframe document is complete and no errors detected
          if (!loadHandled && loadCheckCount >= 3) {
            // Wait at least 6 seconds before marking as loaded
            console.log('[PowerBI] Iframe content appears ready (polling check)');
            markAsLoaded();
          }
        }
      } catch (e) {
        // CORS error - expected for PowerBI (we can't access cross-origin content)
        // This is actually normal - PowerBI blocks cross-origin access
        // The fact that we can't access it doesn't mean it's not working
        
        // Check if iframe is at least trying to load the URL
        if (iframe.src && iframe.src.includes('app.powerbi.com')) {
          // Iframe has the correct src, even if we can't access content due to CORS
          if (!loadHandled && loadCheckCount >= 15) {
            // After 30 seconds, if we haven't seen errors and iframe has correct src, assume it's working
            console.log('[PowerBI] Iframe appears to be loading (CORS prevents direct check, but iframe src is correct)');
            markAsLoaded();
          }
        }
      }
      
      if (loadCheckCount >= maxChecks) {
        // Stop checking after max attempts
        if (checkInterval) clearInterval(checkInterval);
      }
    }, 2000); // Check every 2 seconds

    // Set a timeout to stop loading state if iframe takes too long
    timeoutId = setTimeout(() => {
      if (!loadHandled) {
        console.warn('[PowerBI] Iframe loading timeout after 60 seconds');
        loadHandled = true;
        if (checkInterval) clearInterval(checkInterval);
        setIsLoading(false);
        // Don't set error - the iframe might still be loading in background
        // User can manually refresh if needed
      }
    }, 60000); // 60 seconds max

    return () => {
      loadHandled = true; // Prevent callbacks after cleanup
      if (iframe) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
      if (timeoutId) clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
      if (messageHandler) {
        window.removeEventListener('message', messageHandler);
        messageHandler = null;
      }
    };
  }, [finalEmbedUrl, showAiInsights, embedToken, saveCredentials]);

  // SDK embedding disabled - using iframe method only

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
    <div 
      className="relative h-full flex flex-col"
      // Prevent clicks inside the dashboard container from affecting sidebar
      onClick={(e) => {
        // Only stop propagation if click is on the container, not children
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
    >
      {/* Dashboard Embed Container */}
      <div className="relative flex-1 bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-border">
        {/* Power BI Credentials Banner - Show when login is required */}
        {showCredentials && !isPowerBILoggedIn && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Please login to Power BI using the following credentials:
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
                  Use these credentials when prompted to sign in to Power BI. They will be saved automatically after successful login.
                </p>
                <div className="space-y-2">
                  {/* Email Field */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded p-2 border border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16">Email:</span>
                    <code className="flex-1 text-xs font-mono text-purple-900 dark:text-purple-100">{POWERBI_EMAIL}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(POWERBI_EMAIL, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-purple-600" />
                      )}
                    </Button>
                  </div>
                  {/* Password Field */}
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded p-2 border border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16">Password:</span>
                    <code className="flex-1 text-xs font-mono text-purple-900 dark:text-purple-100">{POWERBI_PASSWORD}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(POWERBI_PASSWORD, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-purple-600" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCredentials(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* React UI - Error and loading overlays */}
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

        {/* SDK container removed - using iframe method only */}

        {/* Test button - Open PowerBI URL directly in new tab for debugging */}
        {finalEmbedUrl && embedToken && (
          <div className="absolute top-2 right-2 z-40">
            <Button
              onClick={() => {
                window.open(finalEmbedUrl, '_blank', 'noopener,noreferrer');
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Open in New Tab
            </Button>
          </div>
        )}

        {/* Power BI iframe - Always use iframe method (SDK disabled) */}
        {finalEmbedUrl && finalEmbedUrl.length > 0 && (
          <iframe
            key={finalEmbedUrl} // Use URL as key to remount when URL changes
            ref={iframeRef}
            title={title}
            src={finalEmbedUrl}
            frameBorder="0"
            allowFullScreen={true}
            className="absolute inset-0 w-full h-full"
            style={{ 
              pointerEvents: 'auto', 
              border: 'none', 
              zIndex: 10,
              width: '100%',
              height: '100%',
              minHeight: '600px',
              minWidth: '100%',
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            // Removed sandbox attribute - PowerBI requires full functionality including WebSocket connections
            // PowerBI from app.powerbi.com is a trusted Microsoft domain, so removing sandbox is safe
            allow="fullscreen; clipboard-read; clipboard-write; accelerometer; gyroscope; payment; usb; xr-spatial-tracking; autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
            // No sandbox attribute - PowerBI requires full iframe permissions for proper rendering
            // Add debugging - log when iframe src changes
            onLoad={() => {
              console.log('[PowerBI] Iframe src loaded:', iframeRef.current?.src?.substring(0, 150));
              console.log('[PowerBI] Iframe dimensions:', {
                width: iframeRef.current?.offsetWidth,
                height: iframeRef.current?.offsetHeight,
                clientWidth: iframeRef.current?.clientWidth,
                clientHeight: iframeRef.current?.clientHeight
              });
            }}
            // Note: Load/error handlers are managed in useEffect to avoid conflicts and improve reliability
            // Prevent iframe events from bubbling to parent (this prevents sidebar from changing)
            onClick={(e) => {
              // Stop propagation to prevent any parent navigation
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent mouse events from affecting parent
              e.stopPropagation();
            }}
          />
        )}

        {/* Info banner removed - autoAuth is the correct behavior for PPU */}
        
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

