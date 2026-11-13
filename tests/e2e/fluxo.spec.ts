import { expect, test, type Page } from "@playwright/test";
import { buildRoutes, type RawRoute } from "../../lib/routes";
import fixture from "../fixtures/demo.json";

// O fluxo é testado com respostas de exemplo (rotas reais pré-calculadas), sem banco.
async function mockApi(page: Page) {
  await page.route("**/api/meta", (route) => route.fulfill({ json: fixture.meta }));
  await page.route("**/api/routes", async (route) => {
    const body = route.request().postDataJSON();
    expect(route.request().method()).toBe("POST");
    expect(route.request().url()).not.toContain("?");
    expect(body.mode).toBe("walk");
    await route.fulfill({ json: { routes: buildRoutes(fixture.raw_routes as RawRoute[]) } });
  });
}

async function tapLngLat(page: Page, lngLat: number[]) {
  const map = page.locator(".map");
  await expect(map.locator("canvas")).toBeVisible();
  const point = await page.evaluate(
    ([lng, lat]) => {
      const m = (window as unknown as { __map?: { project: (p: number[]) => { x: number; y: number } } }).__map;
      return m ? m.project([lng, lat]) : null;
    },
    lngLat,
  );
  expect(point).not.toBeNull();
  await map.click({ position: { x: point!.x, y: point!.y } });
}

test("aviso na primeira abertura precisa ser aceito uma vez", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  const aviso = page.getByRole("dialog");
  await expect(aviso).toContainText("não garante segurança");
  await aviso.getByRole("button", { name: "Entendi" }).click();
  await expect(aviso).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "SafeRoute", level: 1 })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("marcar dois pontos mostra três rotas comparadas", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(page.getByText("Toque no mapa para marcar a origem.")).toBeVisible();
  await page.waitForFunction(() => "__map" in window);

  await tapLngLat(page, fixture.origin);
  await expect(page.getByText("Agora toque no destino.")).toBeVisible();
  await tapLngLat(page, fixture.destination);

  const cards = page.locator(".card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Mais rápida");
  await expect(cards.nth(2)).toContainText("Menor risco");
  await expect(cards.nth(2)).toContainText("de exposição");
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "true");
  await cards.nth(0).click();
  await expect(cards.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Legenda: risco registrado por trecho")).toBeVisible();
});

test("servidor fora do ar mostra mensagem e botão de tentar de novo", async ({ page }) => {
  await page.route("**/api/meta", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable", message: "x" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(page.getByText("Não foi possível carregar o mapa agora.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});

test("envia os cabeçalhos de segurança básicos", async ({ request }) => {
  const resposta = await request.get("/");
  expect(resposta.headers()["x-content-type-options"]).toBe("nosniff");
  expect(resposta.headers()["x-powered-by"]).toBeUndefined();
});

test("a API rejeita pedido inválido com mensagem genérica", async ({ request }) => {
  const resposta = await request.post("/api/routes", {
    data: { o: ["x", 1], d: [0, 0], mode: "' OR 1=1 --", bucket: 99 },
  });
  expect(resposta.status()).toBe(400);
  expect(await resposta.json()).toEqual({ error: "invalid_params", message: "Pedido inválido." });
});
