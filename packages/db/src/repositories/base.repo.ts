import { TenantRequiredError } from '../errors/tenant-required.error';

type TenantScopedWhere = { tenantId?: string } & Record<string, unknown>;

type TenantScopedDelegate<TWhere extends TenantScopedWhere, TCreateData extends { tenantId?: string }, TResult> = {
  findMany(args: { where: TWhere } & Record<string, unknown>): Promise<TResult[]>;
  findFirst(args: { where: TWhere } & Record<string, unknown>): Promise<TResult | null>;
  create(args: { data: TCreateData } & Record<string, unknown>): Promise<TResult>;
  update(args: { where: TWhere; data: Partial<TCreateData> } & Record<string, unknown>): Promise<TResult>;
  delete(args: { where: TWhere } & Record<string, unknown>): Promise<TResult>;
};

const assertTenantId = (tenantId: string | undefined, operation: string): string => {
  const normalized = tenantId?.trim();
  if (!normalized) {
    throw new TenantRequiredError(operation);
  }
  return normalized;
};

export class BaseTenantRepository<
  TWhere extends TenantScopedWhere,
  TCreateData extends { tenantId?: string },
  TResult,
> {
  constructor(private readonly delegate: TenantScopedDelegate<TWhere, TCreateData, TResult>) {}

  findMany(tenantId: string | undefined, args: Omit<Parameters<TenantScopedDelegate<TWhere, TCreateData, TResult>['findMany']>[0], 'where'> & { where?: Omit<TWhere, 'tenantId'> } = {}): Promise<TResult[]> {
    const scopedTenantId = assertTenantId(tenantId, 'findMany');
    const where = { ...(args.where ?? {}), tenantId: scopedTenantId } as TWhere;
    return this.delegate.findMany({ ...args, where });
  }

  findFirst(tenantId: string | undefined, args: Omit<Parameters<TenantScopedDelegate<TWhere, TCreateData, TResult>['findFirst']>[0], 'where'> & { where?: Omit<TWhere, 'tenantId'> } = {}): Promise<TResult | null> {
    const scopedTenantId = assertTenantId(tenantId, 'findFirst');
    const where = { ...(args.where ?? {}), tenantId: scopedTenantId } as TWhere;
    return this.delegate.findFirst({ ...args, where });
  }

  create(tenantId: string | undefined, data: Omit<TCreateData, 'tenantId'>): Promise<TResult> {
    const scopedTenantId = assertTenantId(tenantId, 'create');
    return this.delegate.create({ data: { ...data, tenantId: scopedTenantId } as TCreateData });
  }

  update(tenantId: string | undefined, args: { where: Omit<TWhere, 'tenantId'>; data: Partial<Omit<TCreateData, 'tenantId'>> } & Record<string, unknown>): Promise<TResult> {
    const scopedTenantId = assertTenantId(tenantId, 'update');
    const where = { ...args.where, tenantId: scopedTenantId } as TWhere;
    return this.delegate.update({ ...args, where, data: args.data as Partial<TCreateData> });
  }

  delete(tenantId: string | undefined, where: Omit<TWhere, 'tenantId'>): Promise<TResult> {
    const scopedTenantId = assertTenantId(tenantId, 'delete');
    return this.delegate.delete({ where: { ...where, tenantId: scopedTenantId } as TWhere });
  }
}
