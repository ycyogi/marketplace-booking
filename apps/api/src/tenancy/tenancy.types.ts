export type TenantRole = 'owner' | 'admin' | 'staff';

export type RequestContext = {
  sub: string; // Keycloak subject
  userId: string; // users.id
  tenantId: string; // active tenant
  role: TenantRole;
};
