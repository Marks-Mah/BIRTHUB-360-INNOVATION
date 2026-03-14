-- Refresh token and tenant RBAC
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "UserTenantRole" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenantRole_pkey" PRIMARY KEY ("userId", "tenantId", "roleId")
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_tenantId_idx" ON "RefreshToken"("userId", "tenantId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE UNIQUE INDEX "Role_tenantId_key_key" ON "Role"("tenantId", "key");
CREATE UNIQUE INDEX "Permission_tenantId_resource_action_key" ON "Permission"("tenantId", "resource", "action");
CREATE INDEX "UserTenantRole_tenantId_idx" ON "UserTenantRole"("tenantId");

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Role"
    ADD CONSTRAINT "Role_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Permission"
    ADD CONSTRAINT "Permission_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTenantRole"
    ADD CONSTRAINT "UserTenantRole_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTenantRole"
    ADD CONSTRAINT "UserTenantRole_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTenantRole"
    ADD CONSTRAINT "UserTenantRole_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
