import {
  locationInputSchema,
  providerInputSchema,
  resourceInputSchema,
} from "@booking/contracts";
export type Catalog = {
  organization: { id: string; name: string };
  locations: unknown[];
  resources: unknown[];
  providers: unknown[];
};
export interface AdminRepository {
  organization(id: string): Promise<{ id: string; name: string } | null>;
  catalog(id: string): Promise<Catalog | null>;
  createLocation(
    input: ReturnType<typeof locationInputSchema.parse>,
  ): Promise<unknown>;
  createResource(
    input: ReturnType<typeof resourceInputSchema.parse>,
  ): Promise<unknown | "LOCATION_MISMATCH">;
  createProvider(
    input: ReturnType<typeof providerInputSchema.parse>,
  ): Promise<unknown | "LOCATION_MISMATCH">;
}
export class AdminError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}
export class AdminService {
  constructor(
    private repository: AdminRepository,
    private telemetry: { record(event: Record<string, unknown>): void } = {
      record: () => undefined,
    },
  ) {}
  async catalog(id: string) {
    const result = await this.repository.catalog(id);
    if (!result) throw new AdminError("ORGANIZATION_NOT_FOUND", 404);
    return result;
  }
  async createLocation(raw: unknown) {
    const input = locationInputSchema.parse(raw);
    await this.requireOrg(input.organizationId);
    const value = await this.repository.createLocation(input);
    this.telemetry.record({
      event: "admin.location_created",
      organizationId: input.organizationId,
    });
    return value;
  }
  async createResource(raw: unknown) {
    const input = resourceInputSchema.parse(raw);
    await this.requireOrg(input.organizationId);
    const value = await this.repository.createResource(input);
    if (value === "LOCATION_MISMATCH")
      throw new AdminError("LOCATION_MISMATCH");
    return value;
  }
  async createProvider(raw: unknown) {
    const input = providerInputSchema.parse(raw);
    await this.requireOrg(input.organizationId);
    const value = await this.repository.createProvider(input);
    if (value === "LOCATION_MISMATCH")
      throw new AdminError("LOCATION_MISMATCH");
    return value;
  }
  private async requireOrg(id: string) {
    if (!(await this.repository.organization(id)))
      throw new AdminError("ORGANIZATION_NOT_FOUND", 404);
  }
}
