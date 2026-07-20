import { expect, test } from "@playwright/test";

test("navigates the customer journey with keyboard-visible structure", async ({
  page,
}) => {
  await page.route("**/v1/customer/search**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/v1/analytics/events", (route) =>
    route.fulfill({ status: 202, json: { accepted: true } }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every location",
  );
  await page.getByRole("link", { name: "Find a resource" }).click();
  await expect(page).toHaveURL(/\/book$/);
  await page.getByLabel("Organization ID").fill("demo-org");
  await page.getByRole("button", { name: "Find resources" }).click();
  await expect(page.getByText("No active resources found.")).toBeVisible();
});

test("renders validated recommendations and confirmation", async ({ page }) => {
  await page.route("**/v1/customer/search**", (route) =>
    route.fulfill({
      json: [
        {
          id: "resource",
          name: "Court One",
          kind: "COURT",
          location: { name: "Arena", timeZone: "Asia/Kolkata" },
        },
      ],
    }),
  );
  await page.route("**/v1/analytics/events", (route) =>
    route.fulfill({ status: 202, json: { accepted: true } }),
  );
  await page.route("**/v1/recommendations", async (route) => {
    const request = route.request().postDataJSON() as {
      candidates: Array<{ id: string; startsAt: string }>;
    };
    await route.fulfill({
      json: {
        source: "deterministic",
        candidates: request.candidates.map((candidate) => ({
          ...candidate,
          reason: "Earliest available time.",
        })),
      },
    });
  });
  await page.route("**/v1/bookings/holds", (route) =>
    route.fulfill({
      status: 201,
      json: { holdToken: "h".repeat(43), expiresInSeconds: 300 },
    }),
  );
  await page.route("**/v1/bookings", (route) =>
    route.fulfill({
      status: 201,
      json: { booking: { id: "booking-1" }, accessToken: "a".repeat(43) },
    }),
  );
  await page.goto("/book");
  await page.getByLabel("Organization ID").fill("demo-org");
  await page.getByRole("button", { name: "Find resources" }).click();
  await page.getByLabel("Resource").selectOption("resource");
  await page.getByLabel("Starts").fill("2030-01-02T10:00");
  await page.getByLabel("Ends").fill("2030-01-02T11:00");
  await page.getByRole("button", { name: "Recommend alternatives" }).click();
  await expect(
    page.getByRole("list", { name: "Recommended alternatives" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Hold and confirm" }).click();
  await expect(page.getByText("Booking confirmed.")).toBeVisible();
  await expect(page.getByText("booking-1")).toBeVisible();
});
