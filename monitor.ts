import { statSync } from "fs";

interface SizeMetrics {
  currentSize: number;
  ratePerMinute: number;
}

class FileSizeMonitor {
  private lastSizes: { size: number; timestamp: number }[] = [];
  private readonly maxHistoryLength = 60; // Keep last 60 measurements

  getMetrics(filePath: string): SizeMetrics {
    const currentSize = this.getCurrentSize(filePath);
    this.updateHistory(currentSize);
    return {
      currentSize,
      ratePerMinute: this.calculateRatePerMinute(),
    };
  }

  private getCurrentSize(filePath: string): number {
    const stats = statSync(filePath);
    return stats.size;
  }

  private updateHistory(size: number) {
    this.lastSizes.push({ size, timestamp: Date.now() });
    if (this.lastSizes.length > this.maxHistoryLength) {
      this.lastSizes.shift();
    }
  }

  private calculateRatePerMinute(): number {
    if (this.lastSizes.length < 2) return 0;

    const newest = this.lastSizes[this.lastSizes.length - 1];
    const oldest = this.lastSizes[0];

    const timeDiffMinutes = (newest.timestamp - oldest.timestamp) / (1000 * 60);
    if (timeDiffMinutes === 0) return 0;

    const sizeDiff = newest.size - oldest.size;
    return Math.round(sizeDiff / timeDiffMinutes);
  }
}

export const monitor = new FileSizeMonitor();
