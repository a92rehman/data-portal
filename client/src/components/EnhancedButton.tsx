import React from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import LoadingSpinner from './LoadingSpinner';

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  animation?: 'none' | 'bounce' | 'pulse' | 'scale';
}

export default function EnhancedButton({
  loading = false,
  loadingText,
  icon,
  animation = 'scale',
  children,
  className = '',
  disabled,
  ...props
}: EnhancedButtonProps) {
  const getAnimationProps = () => {
    switch (animation) {
      case 'bounce':
        return {
          whileHover: { y: -2 },
          whileTap: { y: 0 },
          transition: { type: "spring", stiffness: 400, damping: 10 }
        };
      case 'pulse':
        return {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
          transition: { type: "spring", stiffness: 400, damping: 10 }
        };
      case 'scale':
        return {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
          transition: { type: "spring", stiffness: 400, damping: 10 }
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      {...getAnimationProps()}
      className="inline-block"
    >
      <Button
        disabled={disabled || loading}
        className={`relative overflow-hidden ${className}`}
        {...props}
      >
        {loading ? (
          <LoadingSpinner 
            size="sm" 
            text={loadingText} 
            className="text-current" 
          />
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
        
        {/* Ripple effect on click */}
        {!loading && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-md"
            initial={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </Button>
    </motion.div>
  );
}















