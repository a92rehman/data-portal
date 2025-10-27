import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface EnhancedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animation?: 'none' | 'lift' | 'glow' | 'tilt';
  delay?: number;
}

export default function EnhancedCard({
  children,
  className = '',
  hover = true,
  animation = 'lift',
  delay = 0,
  ...props
}: EnhancedCardProps) {
  const getAnimationProps = () => {
    const baseProps = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay }
    };

    if (!hover) return baseProps;

    switch (animation) {
      case 'lift':
        return {
          ...baseProps,
          whileHover: { 
            y: -8, 
            transition: { duration: 0.2 } 
          }
        };
      case 'glow':
        return {
          ...baseProps,
          whileHover: { 
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
            transition: { duration: 0.2 }
          }
        };
      case 'tilt':
        return {
          ...baseProps,
          whileHover: { 
            rotateY: 5,
            rotateX: 5,
            transition: { duration: 0.2 }
          }
        };
      default:
        return baseProps;
    }
  };

  return (
    <motion.div {...getAnimationProps()}>
      <Card className={`transition-all duration-300 ${className}`} {...props}>
        {children}
      </Card>
    </motion.div>
  );
}

// Enhanced versions of card sub-components
export const EnhancedCardHeader = motion(CardHeader);
export const EnhancedCardTitle = motion(CardTitle);
export const EnhancedCardDescription = motion(CardDescription);
export const EnhancedCardContent = motion(CardContent);
export const EnhancedCardFooter = motion(CardFooter);







