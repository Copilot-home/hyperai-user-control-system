import { useEffect, useState } from "react";

type MetricPoint = {
  timestamp: string;
  value: number;
};

type MetricsError = Error | null;

export function useMetrics() {
  const [metricsData, setMetricsData] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MetricsError>(null);

  useEffect(() => {
    try {
      const now = Date.now();
      const points: MetricPoint[] = Array.from({ length: 6 }, (_, index) => ({
        timestamp: new Date(now - (5 - index) * 60_000).toLocaleTimeString(),
        value: 60 + index * 7,
      }));
      setMetricsData(points);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Metrics bootstrap failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  return { metricsData, loading, error };
}
