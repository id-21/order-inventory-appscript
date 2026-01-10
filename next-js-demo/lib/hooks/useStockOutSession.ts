import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  aggregateScannedItems,
  type ScannedItem,
} from "@/lib/features/client-scan-validation";

interface AggregatedItem {
  design: string;
  lot: string;
  quantity: number;
  uniqueIdentifiers: string[];
}

interface UseStockOutSessionReturn {
  sessionId: string;
  scannedItems: ScannedItem[];
  scannedItemsRef: React.MutableRefObject<ScannedItem[]>;
  aggregatedItems: AggregatedItem[];
  addLog: (message: string) => void;
  addScannedItem: (item: ScannedItem) => void;
  clearSession: () => void;
  downloadLogs: () => void;
  resetSession: () => void;
}

export function useStockOutSession(): UseStockOutSessionReturn {
  const [sessionId, setSessionId] = useState<string>("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);

  // Use ref to capture logs for download
  const logsRef = useRef<string[]>([]);
  // Use ref to track current scanned items (avoids stale closure in validation)
  const scannedItemsRef = useRef<ScannedItem[]>([]);

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    addLog(`Session started with ID: ${newSessionId}`);
  }, []);

  // Helper function to add logs
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logsRef.current.push(logEntry);
    console.log(logEntry);
  };

  // Keep ref in sync with state
  useEffect(() => {
    scannedItemsRef.current = scannedItems;
  }, [scannedItems]);

  // Update aggregated items whenever scanned items change
  useEffect(() => {
    const aggregated = aggregateScannedItems(scannedItems);
    setAggregatedItems(aggregated);
  }, [scannedItems]);

  const addScannedItem = (item: ScannedItem) => {
    setScannedItems((prev) => [...prev, item]);
  };

  const clearSession = () => {
    if (!confirm("Are you sure you want to clear all scanned items?")) return;

    // Clear local state (no API call needed)
    addLog(`Clearing ${scannedItems.length} scanned items`);
    setScannedItems([]);
  };

  const downloadLogs = () => {
    try {
      // Add session summary to logs
      const summary = [
        "=== SESSION SUMMARY ===",
        `Session ID: ${sessionId}`,
        `Total Items Scanned: ${scannedItems.length}`,
        `Timestamp: ${new Date().toISOString()}`,
        "=== DETAILED LOGS ===",
        ...logsRef.current,
      ];

      const logContent = summary.join("\n");
      const blob = new Blob([logContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `scan-session-${sessionId}-${new Date()
        .toISOString()
        .replace(/:/g, "-")}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog("Logs downloaded successfully");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to download logs";
      addLog(`Error downloading logs: ${errorMsg}`);
    }
  };

  const resetSession = () => {
    addLog("Resetting workflow - returning to order selection");
    setScannedItems([]);
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    // Reset logs for new session
    logsRef.current = [
      `[${new Date().toISOString()}] New session started with ID: ${newSessionId}`,
    ];
  };

  return {
    sessionId,
    scannedItems,
    scannedItemsRef,
    aggregatedItems,
    addLog,
    addScannedItem,
    clearSession,
    downloadLogs,
    resetSession,
  };
}