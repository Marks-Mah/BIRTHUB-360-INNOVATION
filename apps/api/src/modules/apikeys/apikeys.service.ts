import type { ApiConfig } from "@birthub/config";

import {
  createTenantApiKey,
  introspectApiKey,
  listTenantApiKeys,
  revokeTenantApiKey,
  rotateTenantApiKey
} from "../auth/auth.service.js";

export {
  createTenantApiKey,
  introspectApiKey,
  listTenantApiKeys,
  revokeTenantApiKey,
  rotateTenantApiKey
};

export type { ApiConfig };
