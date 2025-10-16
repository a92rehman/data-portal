import type { Notification } from "@shared/schema";

// Notification priority levels
export type NotificationPriority = 'critical' | 'high' | 'normal';

// Determine notification priority based on type and content
export function getNotificationPriority(notification: Notification): NotificationPriority {
  const title = notification.title?.toLowerCase() || '';
  const message = notification.message?.toLowerCase() || '';
  
  // Critical priority (red) - rejections, blockers, urgent issues
  if (
    title.includes('reject') ||
    title.includes('blocked') ||
    title.includes('critical') ||
    title.includes('urgent') ||
    message.includes('reject') ||
    message.includes('blocked')
  ) {
    return 'critical';
  }
  
  // High priority (orange) - assignments, status changes, deadlines
  if (
    title.includes('assigned') ||
    title.includes('deadline') ||
    title.includes('due') ||
    title.includes('accepted') ||
    title.includes('delivered') ||
    message.includes('assigned to you')
  ) {
    return 'high';
  }
  
  // Normal priority (blue) - comments, general updates
  return 'normal';
}

// Get priority color classes
export function getPriorityColors(priority: NotificationPriority) {
  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-500',
        text: 'text-red-900 dark:text-red-300',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
        badge: 'bg-red-500',
      };
    case 'high':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-500',
        text: 'text-orange-900 dark:text-orange-300',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
        badge: 'bg-orange-500',
      };
    case 'normal':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-purple-500',
        text: 'text-purple-900 dark:text-purple-300',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
        badge: 'bg-purple-600',
      };
  }
}

// Check if notification is new (within last 5 minutes)
export function isNewNotification(notification: Notification): boolean {
  if (!notification.createdAt) return false;
  const createdAt = new Date(notification.createdAt);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return createdAt > fiveMinutesAgo;
}

// Shared AudioContext for reuse
let audioContext: AudioContext | null = null;

// Get or create AudioContext
function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    return audioContext;
  } catch (error) {
    console.warn('Could not create AudioContext:', error);
    return null;
  }
}

// Play notification sound - beautiful chime using Web Audio API
export function playNotificationSound(priority: NotificationPriority = 'normal') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Different frequencies for different priorities
    const frequencies = {
      critical: [800, 600, 400], // Lower, more urgent tone
      high: [600, 800, 1000],    // Rising tone
      normal: [523.25, 659.25, 783.99], // C-E-G major chord (pleasant)
    };
    
    const freqs = frequencies[priority];
    const now = ctx.currentTime;
    
    freqs.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      // Envelope for smooth sound
      const startTime = now + (index * 0.15);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

// Get priority icon
export function getPriorityIcon(priority: NotificationPriority): string {
  switch (priority) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'normal':
      return '🔵';
  }
}
