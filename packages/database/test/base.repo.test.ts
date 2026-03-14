import assert from "node:assert/strict";
import test from "node:test";

import { BaseRepository } from "../src/repositories/base.repo.js";
import { TenantRequiredError } from "../src/errors/tenant-required.error.js";
import { runWithTenantContext } from "../src/tenant-context.js";

type RecordModel = { id: string; tenantId: string; name: string };
type Where = { id?: string; tenantId?: string };
type Data = { name: string; tenantId?: string };

function createDelegate() {
  const calls: Array<{ args: Record<string, unknown>; method: string }> = [];

  return {
    calls,
    delegate: {
      async create(args: Record<string, unknown>) {
        calls.push({ args, method: "create" });
        return { id: "rec-1", tenantId: "tenant-alpha", name: "Acme" } as RecordModel;
      },
      async deleteMany(args: Record<string, unknown>) {
        calls.push({ args, method: "deleteMany" });
        return { count: 1 };
      },
      async findFirst(args: Record<string, unknown>) {
        calls.push({ args, method: "findFirst" });
        return { id: "rec-1", tenantId: "tenant-alpha", name: "Acme" } as RecordModel;
      },
      async findMany(args: Record<string, unknown>) {
        calls.push({ args, method: "findMany" });
        return [] as RecordModel[];
      },
      async updateMany(args: Record<string, unknown>) {
        calls.push({ args, method: "updateMany" });
        return { count: 1 };
      }
    }
  };
}

test("query sem tenantId lança TenantRequiredError", async () => {
  const { delegate } = createDelegate();
  const repository = new BaseRepository<Where, Data, RecordModel>(delegate);

  assert.throws(() => repository.findMany(), TenantRequiredError);
  await assert.rejects(repository.create({ data: { name: "Acme" } }), TenantRequiredError);
});

test("injeta tenantId do AsyncLocalStorage e ignora tenantId externo", async () => {
  const { calls, delegate } = createDelegate();
  const repository = new BaseRepository<Where, Data, RecordModel>(delegate);

  await runWithTenantContext(
    {
      source: "header",
      tenantId: "tenant-alpha"
    },
    async () => {
      await repository.findMany({
        where: {
          id: "rec-1",
          tenantId: "tenant-bypass"
        } as Where
      });

      await repository.create({
        data: {
          name: "Acme",
          tenantId: "tenant-bypass"
        } as Data
      });

      await repository.update({
        data: {
          name: "Acme Updated",
          tenantId: "tenant-bypass"
        } as Data,
        where: {
          id: "rec-1",
          tenantId: "tenant-bypass"
        } as Where
      });
    }
  );

  assert.deepEqual(calls[0], {
    args: {
      where: {
        id: "rec-1",
        tenantId: "tenant-alpha"
      }
    },
    method: "findMany"
  });

  assert.deepEqual(calls[1], {
    args: {
      data: {
        name: "Acme",
        tenantId: "tenant-alpha"
      }
    },
    method: "create"
  });

  assert.deepEqual(calls[2], {
    args: {
      data: {
        name: "Acme Updated",
        tenantId: "tenant-alpha"
      },
      where: {
        id: "rec-1",
        tenantId: "tenant-alpha"
      }
    },
    method: "updateMany"
  });
});
