import { TenantRequiredError } from "../errors/tenant-required.error.js";
import { requireTenantId } from "../tenant-context.js";

type TenantScopedWhere = { tenantId?: string } & Record<string, unknown>;
type TenantScopedData = { tenantId?: string } & Record<string, unknown>;

type FindArgs<TWhere extends TenantScopedWhere> = {
  where?: Omit<TWhere, "tenantId">;
} & Record<string, unknown>;

type MutationArgs<TWhere extends TenantScopedWhere, TData extends TenantScopedData> = {
  data: Omit<TData, "tenantId">;
  where?: Omit<TWhere, "tenantId">;
} & Record<string, unknown>;

type TenantScopedDelegate<
  TWhere extends TenantScopedWhere,
  TData extends TenantScopedData,
  TResult
> = {
  create(args: { data: TData } & Record<string, unknown>): Promise<TResult>;
  deleteMany(args: { where: TWhere } & Record<string, unknown>): Promise<{ count: number }>;
  findFirst(args: { where?: TWhere } & Record<string, unknown>): Promise<TResult | null>;
  findMany(args: { where?: TWhere } & Record<string, unknown>): Promise<TResult[]>;
  updateMany(args: { data: Partial<TData>; where: TWhere } & Record<string, unknown>): Promise<{
    count: number;
  }>;
};

function omitTenantId<T extends TenantScopedWhere | TenantScopedData | undefined>(value: T): T {
  if (!value) {
    return value;
  }

  const { tenantId: _tenantId, ...rest } = value;
  return rest as T;
}

function getScopedTenantId(operation: string): string {
  try {
    return requireTenantId(operation);
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error;
    }

    throw new TenantRequiredError(operation);
  }
}

// @see ADR-008
export class BaseRepository<
  TWhere extends TenantScopedWhere,
  TData extends TenantScopedData,
  TResult
> {
  constructor(private readonly delegate: TenantScopedDelegate<TWhere, TData, TResult>) {}

  async create(args: MutationArgs<TWhere, TData>): Promise<TResult> {
    const tenantId = getScopedTenantId("create");
    const sanitizedData = omitTenantId(args.data);

    return this.delegate.create({
      ...args,
      data: {
        ...(sanitizedData ?? {}),
        tenantId
      } as TData
    });
  }

  async delete(args: FindArgs<TWhere>): Promise<TResult> {
    const tenantId = getScopedTenantId("delete");
    const where = {
      ...(omitTenantId(args.where) ?? {}),
      tenantId
    } as TWhere;

    const existingRecord = await this.delegate.findFirst({ where });

    if (!existingRecord) {
      throw new Error("Scoped record not found.");
    }

    await this.delegate.deleteMany({ where });

    return existingRecord;
  }

  findFirst(args: FindArgs<TWhere> = {}): Promise<TResult | null> {
    const tenantId = getScopedTenantId("findFirst");
    return this.delegate.findFirst({
      ...args,
      where: {
        ...(omitTenantId(args.where) ?? {}),
        tenantId
      } as TWhere
    });
  }

  findMany(args: FindArgs<TWhere> = {}): Promise<TResult[]> {
    const tenantId = getScopedTenantId("findMany");
    return this.delegate.findMany({
      ...args,
      where: {
        ...(omitTenantId(args.where) ?? {}),
        tenantId
      } as TWhere
    });
  }

  async update(args: MutationArgs<TWhere, TData>): Promise<TResult> {
    const tenantId = getScopedTenantId("update");
    const where = {
      ...(omitTenantId(args.where) ?? {}),
      tenantId
    } as TWhere;

    const data = {
      ...(omitTenantId(args.data) ?? {}),
      tenantId
    } as Partial<TData>;

    const updateResult = await this.delegate.updateMany({
      ...args,
      data,
      where
    });

    if (updateResult.count === 0) {
      throw new Error("Scoped record not found.");
    }

    const updatedRecord = await this.delegate.findFirst({ where });

    if (!updatedRecord) {
      throw new Error("Scoped record not found after update.");
    }

    return updatedRecord;
  }
}
