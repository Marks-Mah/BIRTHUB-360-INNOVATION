export type StorageProvider = "s3" | "supabase";
export type StorageAction = "download" | "upload";

export interface StorageInput {
  action: StorageAction;
  blob?: string;
  bucket: string;
  key: string;
  provider: StorageProvider;
}

export interface StorageResult {
  action: StorageAction;
  key: string;
  provider: StorageProvider;
  signedUrl: string;
}

function buildSignedUrl(provider: StorageProvider, bucket: string, key: string): string {
  if (provider === "s3") {
    return `https://s3.amazonaws.com/${bucket}/${key}?signature=mock`;
  }

  return `https://project.supabase.co/storage/v1/object/public/${bucket}/${key}?token=mock`;
}

export async function callStorageTool(
  input: StorageInput,
  options?: { simulate?: boolean }
): Promise<StorageResult> {
  if (!(options?.simulate ?? true)) {
    throw new Error("Live storage calls are disabled in this environment.");
  }

  return {
    action: input.action,
    key: input.key,
    provider: input.provider,
    signedUrl: buildSignedUrl(input.provider, input.bucket, input.key)
  };
}
