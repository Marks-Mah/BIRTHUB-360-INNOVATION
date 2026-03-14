import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseTenantRepository } from '../base.repo';
import { TenantRequiredError } from '../../errors/tenant-required.error';

type RecordModel = { id: string; tenantId: string; name: string };
type Where = { tenantId?: string; id?: string };
type CreateData = { tenantId?: string; name: string };

const createDelegate = () => {
  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findMany(args: Record<string, unknown>) {
      calls.push({ method: 'findMany', args });
      return [] as RecordModel[];
    },
    async findFirst(args: Record<string, unknown>) {
      calls.push({ method: 'findFirst', args });
      return null as RecordModel | null;
    },
    async create(args: Record<string, unknown>) {
      calls.push({ method: 'create', args });
      return { id: '1', tenantId: 'tenant-1', name: 'n' } as RecordModel;
    },
    async update(args: Record<string, unknown>) {
      calls.push({ method: 'update', args });
      return { id: '1', tenantId: 'tenant-1', name: 'n' } as RecordModel;
    },
    async delete(args: Record<string, unknown>) {
      calls.push({ method: 'delete', args });
      return { id: '1', tenantId: 'tenant-1', name: 'n' } as RecordModel;
    },
  };

  return { delegate, calls };
};

test('injeta tenantId em findMany e create', async () => {
  const { delegate, calls } = createDelegate();
  const repo = new BaseTenantRepository<Where, CreateData, RecordModel>(delegate);

  await repo.findMany('tenant-1', { where: { id: 'abc' } });
  await repo.create('tenant-1', { name: 'Acme' });

  assert.deepEqual(calls[0], { method: 'findMany', args: { where: { id: 'abc', tenantId: 'tenant-1' } } });
  assert.deepEqual(calls[1], { method: 'create', args: { data: { name: 'Acme', tenantId: 'tenant-1' } } });
});

test('lança TenantRequiredError quando tenantId não é informado', async () => {
  const { delegate } = createDelegate();
  const repo = new BaseTenantRepository<Where, CreateData, RecordModel>(delegate);

  assert.throws(() => repo.findMany(undefined), TenantRequiredError);
  assert.throws(() => repo.create('  ', { name: 'Acme' }), TenantRequiredError);
});
