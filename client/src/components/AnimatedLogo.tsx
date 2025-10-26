import React from 'react';
import { ChartLine, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8', 
  xl: 'w-10 h-10'
};

export default function AnimatedLogo({ 
  size = 'md', 
  showText = false, 
  className = '' 
}: AnimatedLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Animated Logo Container */}
      <motion.div 
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden`}
        style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{
          scale: 1.1,
          rotate: 5,
          transition: { duration: 0.3 }
        }}
      >
        {/* Background Animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Main Icon */}
        <motion.div
          animate={{
            y: [0, -2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ChartLine className={`${iconSizes[size]} text-white`} />
        </motion.div>
        
        {/* Floating Sparkles */}
        <motion.div
          className="absolute top-1 right-1"
          animate={{
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.5,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-2 h-2 text-yellow-200" />
        </motion.div>
        
        <motion.div
          className="absolute bottom-1 left-1"
          animate={{
            scale: [0, 1, 0],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: 1,
            ease: "easeInOut"
          }}
        >
          <TrendingUp className="w-2 h-2 text-blue-200" />
        </motion.div>
      </motion.div>
      
      {/* Optional Text */}
      {showText && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Taleemabad DataHub
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Request Management System
          </p>
        </motion.div>
      )}
    </div>
  );
}






