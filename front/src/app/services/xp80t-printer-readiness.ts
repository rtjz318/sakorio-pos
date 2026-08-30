export interface Xp80tReadinessInput {
  nativeReady: boolean;
  bluetoothConnected: boolean;
  tokenConfigured: boolean;
  workerRunning: boolean;
  lastHeartbeatAt: string | null;
  lastPrintedJobId: number | null;
  lastError: string | null;
  secureStorageReady: boolean;
}

export interface Xp80tReadinessItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface Xp80tReadinessSummary {
  ready: boolean;
  score: number;
  label: string;
  items: Xp80tReadinessItem[];
  nextAction: string;
}

export function evaluateXp80tReadiness(input: Xp80tReadinessInput): Xp80tReadinessSummary {
  const items: Xp80tReadinessItem[] = [
    {
      id: 'native-plugin',
      label: 'Tablet app plugin',
      ok: input.nativeReady,
      detail: input.nativeReady
        ? 'Native XP-80T plugin detected.'
        : 'Open Sakorio through the native Android tablet app, not browser mode.',
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth printer',
      ok: input.bluetoothConnected,
      detail: input.bluetoothConnected
        ? 'XP-80T printer is connected.'
        : 'Allow Bluetooth, scan, then connect the XP-80T printer.',
    },
    {
      id: 'token',
      label: 'Printer token',
      ok: input.tokenConfigured,
      detail: input.tokenConfigured
        ? 'Printer-agent token is configured.'
        : 'Paste the one-time printer-agent token created in Settings > Printing.',
    },
    {
      id: 'secure-storage',
      label: 'Secure token storage',
      ok: input.secureStorageReady,
      detail: input.secureStorageReady
        ? 'Android Keystore is available for encrypted token storage.'
        : 'Token will only live in the current session until secure app storage is available.',
    },
    {
      id: 'worker',
      label: 'Print worker',
      ok: input.workerRunning,
      detail: input.workerRunning
        ? 'Worker is polling for leased print jobs.'
        : 'Start the worker after connecting the printer and configuring the token.',
    },
    {
      id: 'heartbeat',
      label: 'Backend heartbeat',
      ok: Boolean(input.lastHeartbeatAt),
      detail: input.lastHeartbeatAt
        ? `Last heartbeat: ${input.lastHeartbeatAt}`
        : 'No backend heartbeat yet. Start the worker and keep the tablet online.',
    },
    {
      id: 'last-print',
      label: 'Last print confirmation',
      ok: Boolean(input.lastPrintedJobId),
      detail: input.lastPrintedJobId
        ? `Last completed print job: #${input.lastPrintedJobId}`
        : 'No completed print job yet. Run a dry-run or live receipt test before service.',
    },
    {
      id: 'errors',
      label: 'Worker errors',
      ok: !input.lastError,
      detail: input.lastError || 'No current worker error.',
    },
  ];

  const passed = items.filter((item) => item.ok).length;
  const score = Math.round((passed / items.length) * 100);
  const ready =
    input.nativeReady &&
    input.bluetoothConnected &&
    input.tokenConfigured &&
    input.workerRunning &&
    Boolean(input.lastHeartbeatAt) &&
    !input.lastError;

  const firstMissing = items.find((item) => !item.ok);
  return {
    ready,
    score,
    label: ready ? 'Ready for XP-80T service' : 'XP-80T setup incomplete',
    items,
    nextAction: firstMissing?.detail || 'Run a real receipt print test before launch.',
  };
}
