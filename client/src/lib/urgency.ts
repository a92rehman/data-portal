import { type DataRequest } from '@shared/schema';

export type UrgencyLevel = 'urgent' | 'high' | 'medium' | 'low';

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  colorClass: string;
  daysRemaining: number | null;
}

export function calculateUrgency(request: Partial<DataRequest>): UrgencyInfo {
  const { dueDate, priority, deliveredAt, status } = request;
  
  // If request is completed/delivered, don't show urgency (return null-like values)
  if (deliveredAt || status === 'completed' || status === 'rejected') {
    return {
      level: 'low',
      label: '',
      colorClass: '',
      daysRemaining: null,
    };
  }
  
  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dueDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Determine urgency level based on days remaining and priority
  let level: UrgencyLevel = 'low';
  let label = 'LOW';
  let colorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';

  // Priority-based urgency (highest priority wins)
  if (priority === 'p0_critical') {
    level = 'urgent';
    label = 'URGENT';
    colorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  } else if (priority === 'p1_high') {
    level = 'high';
    label = 'HIGH';
    colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  } else if (priority === 'p2_medium') {
    level = 'medium';
    label = 'MEDIUM';
    colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }

  // Time-based urgency (overrides priority if more urgent)
  if (daysRemaining !== null) {
    if (daysRemaining <= 1) {
      level = 'urgent';
      label = 'URGENT';
      colorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    } else if (daysRemaining <= 3 && level !== 'urgent') {
      level = 'high';
      label = 'HIGH';
      colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    } else if (daysRemaining <= 7 && level !== 'urgent' && level !== 'high') {
      level = 'medium';
      label = 'MEDIUM';
      colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  }

  return {
    level,
    label,
    colorClass,
    daysRemaining,
  };
}
