// Get time-based recency label for items
export function getRecencyLabel(createdAt: Date | string | null): string | null {
  if (!createdAt) return null;
  
  const itemDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - itemDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // Less than 3 hours
  if (diffHours < 3) {
    const hours = Math.floor(diffHours);
    return hours === 0 ? 'Just now' : `${hours}h ago`;
  }
  
  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (itemDate >= todayStart) {
    return 'Today';
  }
  
  // Yesterday
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (itemDate >= yesterdayStart) {
    return 'Yesterday';
  }
  
  // This week (last 7 days)
  if (diffDays < 7) {
    return 'This Week';
  }
  
  // Last week (7-14 days)
  if (diffDays < 14) {
    return 'Last Week';
  }
  
  // Older items don't get a badge
  return null;
}
