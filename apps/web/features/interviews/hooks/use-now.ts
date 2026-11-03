import * as React from "react";

/**
 * Current time that re-renders on an interval, so time-based UI (join links,
 * start windows, cancel cutoffs) updates without a reload and render stays pure.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
