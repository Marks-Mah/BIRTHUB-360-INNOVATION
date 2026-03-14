import { Prisma } from "@birthub/database";

function toPrismaNestedJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case "boolean":
    case "number":
    case "string":
      return value;
    case "bigint":
      return value.toString();
    default:
      break;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => (entry === undefined ? null : toPrismaNestedJsonValue(entry)));
  }

  if (typeof value === "object") {
    const jsonObject: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        jsonObject[key] = toPrismaNestedJsonValue(entry);
      }
    }

    return jsonObject as Prisma.InputJsonObject;
  }

  return String(value);
}

export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) {
    return Prisma.JsonNull;
  }

  const normalized = toPrismaNestedJsonValue(value);
  return normalized === null ? Prisma.JsonNull : normalized;
}
