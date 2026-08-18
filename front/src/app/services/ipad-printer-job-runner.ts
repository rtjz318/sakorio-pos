import {
  EscposReceiptPayload,
  renderEscposReceipt,
} from './escpos-receipt-renderer';

export interface LeasedPrintJob {
  id: number;
  lease_token: string;
  job_type: string;
  order_id: number;
  kitchen_station_id: number | null;
  payload: EscposReceiptPayload;
}

export interface IpadPrintJobRunner {
  printEscPos(jobId: number, bytes: Uint8Array): Promise<void>;
  complete(jobId: number, leaseToken: string): Promise<void>;
  fail(jobId: number, leaseToken: string, error: string): Promise<void>;
}

export interface IpadPrintJobResult {
  jobId: number;
  printed: boolean;
  byteLength: number;
  error: string | null;
}

export async function runIpadPrintJob(
  job: LeasedPrintJob,
  runner: IpadPrintJobRunner,
): Promise<IpadPrintJobResult> {
  const bytes = renderEscposReceipt(job.payload || {});
  try {
    await runner.printEscPos(job.id, bytes);
    await runner.complete(job.id, job.lease_token);
    return {
      jobId: job.id,
      printed: true,
      byteLength: bytes.length,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : 'XP-80T print failed.';
    await runner.fail(job.id, job.lease_token, message);
    return {
      jobId: job.id,
      printed: false,
      byteLength: bytes.length,
      error: message,
    };
  }
}
