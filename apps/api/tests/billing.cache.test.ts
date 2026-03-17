import assert from "node:assert/strict";
import test from "node:test";

import {
  configureCacheStore,
  deleteCacheKeys,
  readCacheValue,
  setCacheStoreForTests,
  writeCacheValue,
  type CacheStore
} from "../src/common/cache/cache-store.js";

function createFailingStore(): CacheStore {
  return {
    async del(): Promise<number> {
      throw new Error("cache_del_failure");
    },
    async get(): Promise<string | null> {
      throw new Error("cache_get_failure");
    },
    async set(): Promise<void> {
      throw new Error("cache_set_failure");
    }
  };
}

void test("cache configuration rejects missing Redis in production", () => {
  assert.throws(
    () => configureCacheStore(undefined, "production"),
    /CACHE_CONFIGURATION_INVALID/
  );

  configureCacheStore(undefined, "test");
  setCacheStoreForTests(null);
});

void test("cache read, write and delete fail closed in production mode", async () => {
  configureCacheStore("redis://unit-test:6379", "production");
  setCacheStoreForTests(createFailingStore());

  try {
    await assert.rejects(() => readCacheValue("billing:tenant_1"), /CACHE_READ_FAILED/);
    await assert.rejects(
      () => writeCacheValue("billing:tenant_1", '{"status":"active"}', 60),
      /CACHE_WRITE_FAILED/
    );
    await assert.rejects(
      () => deleteCacheKeys(["billing:tenant_1"]),
      /CACHE_DELETE_FAILED/
    );
  } finally {
    configureCacheStore(undefined, "test");
    setCacheStoreForTests(null);
  }
});
