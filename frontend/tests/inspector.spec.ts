import { test, expect } from "@playwright/test";

const mockResult = {
  status: "FAIL",
  summary: "The jackpot amount is incorrect.",
  issues: [
    {
      severity: "HIGH",
      title: "Incorrect jackpot amount",
      description:
        "Expected $50,000,000 but found $5,000,000.",
    },
  ],
  inspection_id: 1,
};

const savedInspection = {
  id: 1,
  filename: "test_jackpot.png",
  expected_content: "Jackpot must be $50,000,000",
  created_at: "2026-11-16T22:00:00+00:00",
  status: "FAIL",
  summary: "The jackpot amount is incorrect.",
  issues: mockResult.issues,
};

async function mockBackend(page: import("@playwright/test").Page) {
  await page.route("**/api/inspections", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        inspections: [savedInspection],
      }),
    });
  });

  await page.route("**/api/inspect", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockResult),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test("dashboard loads successfully", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Visual Inspection",
    })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: "New Inspection",
    })
  ).toBeVisible();
});

test("inspection button requires valid inputs", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", {
      name: /Run AI Inspection/,
    })
  ).toBeDisabled();
});

test("saved inspections appear in history", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Inspection History",
    })
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: /test_jackpot.png/,
    })
  ).toBeVisible();
});

test("selecting history displays saved findings", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", {
    name: /test_jackpot.png/,
  }).click();

  await expect(
    page.getByText("Incorrect jackpot amount", {
      exact: true,
    })
  ).toBeVisible();

  await expect(
    page.getByText("The jackpot amount is incorrect.")
  ).toBeVisible();
});

test("upload and inspection display AI findings", async ({ page }) => {
  await page.goto("/");

  // Small valid PNG fixture.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64"
  );

  await page.locator('input[type="file"]').setInputFiles({
    name: "test_jackpot.png",
    mimeType: "image/png",
    buffer: png,
  });

  await page.getByLabel("Expected Content").fill(
    "The jackpot must display $50,000,000."
  );

  await page.getByRole("button", {
    name: /Run AI Inspection/,
  }).click();

  await expect(
    page.getByText("Incorrect jackpot amount", {
      exact: true,
    })
  ).toBeVisible();

  await expect(
    page.getByText("Expected $50,000,000 but found $5,000,000.")
  ).toBeVisible();
});

test("reset clears the inspection form", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Expected Content").fill(
    "Test expected content"
  );

  await page.getByRole("button", {
    name: "Reset",
  }).click();

  await expect(
    page.getByLabel("Expected Content")
  ).toHaveValue("");

  await expect(
    page.getByRole("button", {
      name: /Run AI Inspection/,
    })
  ).toBeDisabled();
});

test("history API errors display a message", async ({ page }) => {
  await page.route("**/api/inspections", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Service unavailable",
      }),
    });
  });

  await page.goto("/");

  await expect(
    page.getByText(/Could not load history/)
  ).toBeVisible();
});