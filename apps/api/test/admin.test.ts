import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  type AdminRepository,
  AdminService,
} from "../src/modules/admin/service.js";

class Memory implements AdminRepository {
  organization(id: string) {
    return Promise.resolve(id === "org" ? { id, name: "Demo" } : null);
  }
  catalog(id: string) {
    return Promise.resolve(
      id === "org"
        ? {
            organization: { id, name: "Demo" },
            locations: [],
            resources: [],
            providers: [],
          }
        : null,
    );
  }
  createLocation(input: unknown) {
    return Promise.resolve(input);
  }
  createResource(input: { locationId: string }) {
    return Promise.resolve(
      input.locationId === "other" ? "LOCATION_MISMATCH" : input,
    );
  }
  createProvider(input: unknown) {
    return Promise.resolve(input);
  }
}
describe("admin catalog", () => {
  const app = createApp({
    adminService: new AdminService(new Memory()),
    adminKey: "a".repeat(32),
  });
  it("rejects requests without the admin credential", async () => {
    expect((await app.request("/v1/admin/catalog/org")).status).toBe(403);
  });
  it("returns tenant-scoped catalog and validates zones", async () => {
    const headers = {
      "x-admin-key": "a".repeat(32),
      "content-type": "application/json",
    };
    expect(
      (await app.request("/v1/admin/catalog/org", { headers })).status,
    ).toBe(200);
    expect(
      (
        await app.request("/v1/admin/locations", {
          method: "POST",
          headers,
          body: JSON.stringify({
            organizationId: "org",
            name: "Arena",
            timeZone: "Bad/Zone",
          }),
        })
      ).status,
    ).toBe(400);
  });
  it("rejects cross-tenant resource locations", async () => {
    const response = await app.request("/v1/admin/resources", {
      method: "POST",
      headers: {
        "x-admin-key": "a".repeat(32),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        organizationId: "org",
        locationId: "other",
        name: "Court",
        kind: "COURT",
        capacity: 1,
      }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "LOCATION_MISMATCH" },
    });
  });
});
