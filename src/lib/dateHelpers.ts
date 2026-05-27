/**
 * Days remaining in the current calendar month (today excluded).
 * Example: on March 28 of a 31-day month → returns 3.
 */
export function getDaysRemaining(now: Date = new Date()): number {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}
