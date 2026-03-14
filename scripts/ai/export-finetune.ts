import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { prisma } from "@birthub/database";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function redactString(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(sk|pk|rk|whsec|sg)\_[A-Za-z0-9_\-]+\b/g, "[redacted-token]")
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, "Bearer [redacted-token]")
    .replace(/\b[A-F0-9]{32,}\b/gi, "[redacted-secret]");
}

function redactValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        redactValue(nested)
      ])
    );
  }

  return redactString(String(value));
}

function stableJson(value: JsonValue): string {
  return JSON.stringify(value);
}

function parseFlag(name: string): string | undefined {
  const flag = process.argv.find((item) => item.startsWith(`${name}=`));
  return flag ? flag.slice(name.length + 1) : undefined;
}

async function uploadDatasetIfConfigured(fileContent: string, fileName: string): Promise<string> {
  const uploadUrl = process.env.DATASET_EXPORT_UPLOAD_URL;

  if (!uploadUrl) {
    return fileName;
  }

  const response = await fetch(uploadUrl, {
    body: fileContent,
    headers: {
      ...(process.env.DATASET_EXPORT_UPLOAD_TOKEN
        ? {
            authorization: `Bearer ${process.env.DATASET_EXPORT_UPLOAD_TOKEN}`
          }
        : {}),
      "content-type": "application/jsonl"
    },
    method: "PUT"
  });

  if (!response.ok) {
    throw new Error(`Dataset upload failed with status ${response.status}`);
  }

  return uploadUrl;
}

async function main() {
  const version = parseFlag("--version") ?? "v1";
  const outputPath =
    parseFlag("--output") ??
    resolve(process.cwd(), "artifacts", "ai", `dataset-${version}.jsonl`);
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const feedbackRows = hasDatabase
    ? await prisma.agentFeedback.findMany({
        include: {
          execution: true
        },
        orderBy: {
          createdAt: "asc"
        },
        where: {
          rating: 1
        }
      })
    : [];

  const lines = feedbackRows.map((row) =>
    stableJson({
      messages: [
        {
          content: `Agent ${row.agentId}`,
          role: "system"
        },
        {
          content: stableJson(redactValue(row.execution.input)),
          role: "user"
        },
        {
          content: row.expectedOutput
            ? redactString(row.expectedOutput)
            : stableJson(redactValue(row.execution.output)),
          role: "assistant"
        }
      ],
      metadata: {
        agentId: row.agentId,
        executionId: row.executionId,
        rating: row.rating,
        tenantId: row.tenantId
      }
    })
  );

  for (const line of lines) {
    JSON.parse(line);
  }

  const fileContent = `${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`;
  const fileHash = createHash("sha256").update(fileContent, "utf8").digest("hex");
  await mkdir(dirname(outputPath), {
    recursive: true
  });
  await writeFile(outputPath, fileContent, "utf8");

  const storageUrl = await uploadDatasetIfConfigured(fileContent, outputPath);

  if (hasDatabase) {
    await prisma.datasetExport.create({
      data: {
        datasetHash: fileHash,
        fileName: `dataset-${version}.jsonl`,
        recordCount: lines.length,
        storageUrl
      }
    });
  }

  console.log(
    JSON.stringify(
      {
        databaseConnected: hasDatabase,
        fileHash,
        outputPath,
        recordCount: lines.length,
        storageUrl
      },
      null,
      2
    )
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
