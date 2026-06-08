class MetricsService {
  constructor() {
    this.operationCounts = {};
    this.latencies = [];
  }

  recordRequest(operation, latency) {
    // Increment operation count
    this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1;
    
    // Store latency
    this.latencies.push(latency);
    
    // Keep a maximum buffer size to prevent memory leaks (e.g., last 10,000 requests)
    if (this.latencies.length > 10000) {
      this.latencies.shift();
    }
  }

  getMetrics() {
    const totalRequests = this.latencies.length;
    if (totalRequests === 0) {
      return {
        operationCounts: this.operationCounts,
        averageLatency: 0,
        p95Latency: 0
      };
    }

    // Average latency
    const sum = this.latencies.reduce((acc, curr) => acc + curr, 0);
    const averageLatency = parseFloat((sum / totalRequests).toFixed(2));

    // p95 latency
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(totalRequests * 0.95);
    // Secure bounds check
    const p95Latency = parseFloat((sortedLatencies[Math.min(p95Index, totalRequests - 1)] || 0).toFixed(2));

    return {
      operationCounts: this.operationCounts,
      averageLatency,
      p95Latency
    };
  }
}

// Export a singleton instance
module.exports = new MetricsService();
