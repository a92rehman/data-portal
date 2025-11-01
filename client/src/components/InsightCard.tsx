import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface InsightCardProps {
  title: string;
  description: string;
  metric?: string;
  trend?: "up" | "down" | "neutral";
  change?: number;
  icon?: React.ReactNode;
}

export function InsightCard({ title, description, trend, change, icon }: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 
                 dark:from-purple-950/20 dark:to-blue-950/20 
                 rounded-lg border border-purple-200 dark:border-purple-800 mb-3"
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r 
                        from-purple-600 to-blue-600 flex items-center 
                        justify-center flex-shrink-0">
          {icon || <Sparkles className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" && <TrendingUp className="w-4 h-4 text-green-600" />}
              {trend === "down" && <TrendingDown className="w-4 h-4 text-red-600" />}
              {trend === "neutral" && <div className="w-4 h-4" />}
              <span className={`text-xs font-semibold ${
                trend === "up" ? "text-green-600" : 
                trend === "down" ? "text-red-600" : 
                "text-muted-foreground"
              }`}>
                {change > 0 ? "+" : ""}{change}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

