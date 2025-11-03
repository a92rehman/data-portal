import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import PowerBIDashboard from '@/components/PowerBIDashboard';
import AIAssistantPanel from '@/components/AIAssistantPanel';
import { getDashboardConfig } from '@/config/dashboards';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboards() {
  // Get authenticated user (if available) - dashboard is accessible without auth too
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const dashboardId = params.dashboardId || "program-delivery";
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Get dashboard config
  const dashboard = getDashboardConfig(dashboardId);

  return (
    <div className="h-screen flex flex-col">
      <Header user={user || null} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user || undefined} />
        
        {/* Main content - Side by side layout */}
        <main className="flex-1 md:ml-64 relative flex h-full overflow-hidden">
          {/* Dashboard - Takes most of the width */}
          <div className="flex-1 h-full overflow-hidden relative">
            <PowerBIDashboard
              embedUrl={dashboard.embedUrl}
              reportId={dashboard.reportId}
              title={dashboard.title}
              showAiInsights={false}
              height="100%"
            />
            
            {/* Collapsed State - Toggle Button on Bottom Right Edge */}
            {!aiPanelOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-0 bottom-6 z-20"
              >
                <Button
                  onClick={() => setAiPanelOpen(true)}
                  className="h-20 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-l-xl shadow-lg hover:shadow-xl transition-all duration-300 group px-6 py-6"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                    <ChevronLeft className="w-5 h-5 group-hover:translate-x-[-2px] transition-transform duration-300" />
                  </div>
                </Button>
              </motion.div>
            )}
          </div>

          {/* AI Assistant - Right Sidebar */}
          <motion.div
            initial={false}
            animate={{
              width: aiPanelOpen ? '450px' : '0px',
            }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
          >
            {/* Expanded State - Full Sidebar */}
            <AnimatePresence>
              {aiPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-[450px] flex flex-col"
                >
                  {/* Header with Collapse Button */}
                  <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-between shadow-lg flex-shrink-0">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Assistant
                    </h3>
                    <Button
                      onClick={() => setAiPanelOpen(false)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 rounded-lg transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Assistant Panel Content */}
                  <div className="flex-1 overflow-hidden min-h-0">
                    <AIAssistantPanel
                      dashboardId={dashboard.id}
                      dashboardTitle={dashboard.title}
                      reportId={dashboard.reportId}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

