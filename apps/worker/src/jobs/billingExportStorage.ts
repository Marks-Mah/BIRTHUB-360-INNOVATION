import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { WorkerConfig } from "@birthub/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface BillingExportUploadInput {
  body: string;
  contentType: string;
  key: string;
}

export interface BillingExportStorage {
  uploadJson: (input: BillingExportUploadInput) => Promise<{ storageUrl: string }>;
}

export class LocalBillingExportStorage implements BillingExportStorage {
  constructor(private readonly baseDirectory: string) {}

  async uploadJson(input: BillingExportUploadInput): Promise<{ storageUrl: string }> {
    const targetPath = resolve(this.baseDirectory, input.key);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.body, "utf8");

    return {
      storageUrl: targetPath
    };
  }
}

export class S3BillingExportStorage implements BillingExportStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(config: WorkerConfig) {
    if (!config.BILLING_EXPORT_S3_BUCKET) {
      throw new Error("BILLING_EXPORT_S3_BUCKET is required when BILLING_EXPORT_STORAGE_MODE=s3");
    }

    this.bucket = config.BILLING_EXPORT_S3_BUCKET;
    this.client = new S3Client({
      region: config.BILLING_EXPORT_S3_REGION,
      ...(config.BILLING_EXPORT_S3_ENDPOINT
        ? {
            endpoint: config.BILLING_EXPORT_S3_ENDPOINT,
            forcePathStyle: true
          }
        : {})
    });
  }

  async uploadJson(input: BillingExportUploadInput): Promise<{ storageUrl: string }> {
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.bucket,
        ContentType: input.contentType,
        Key: input.key
      })
    );

    return {
      storageUrl: `s3://${this.bucket}/${input.key}`
    };
  }
}

export function createBillingExportStorage(config: WorkerConfig): BillingExportStorage {
  if (config.BILLING_EXPORT_STORAGE_MODE === "s3") {
    return new S3BillingExportStorage(config);
  }

  return new LocalBillingExportStorage(config.BILLING_EXPORT_LOCAL_DIR);
}
