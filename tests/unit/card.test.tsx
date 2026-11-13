import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AboutSheet } from "@/components/AboutSheet";
import { comparison, RouteCard } from "@/components/RouteCard";
import type { Route } from "@/lib/routes";

const route: Route = {
  profiles: ["safer"],
  label: "Menor risco",
  time_s: 780,
  length_m: 1040,
  time_delta_s: 180,
  time_delta_pct: 30,
  exposure_delta_pct: -28,
  segments: [],
};

test("o cartão mostra tempo, distância e a comparação", () => {
  render(<RouteCard route={route} selected single={false} onSelect={() => {}} />);
  expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("Menor risco");
  expect(screen.getByText("+3 min · −28% de exposição")).toBeInTheDocument();
  expect(screen.getByText("1 km")).toBeInTheDocument();
});

test("a rota mais rápida é a referência", () => {
  expect(comparison({ ...route, profiles: ["fast"] })).toBe("Referência de tempo");
});

test("a tela sobre os dados traz as limitações e nunca promete rota segura", () => {
  const { container } = render(<AboutSheet meta={null} onClose={() => {}} />);
  const text = container.textContent?.toLowerCase() ?? "";
  expect(text).toContain("não garante segurança");
  expect(text).toContain("ligue 190");
  expect(text).not.toContain("rota segura");
  expect(text).not.toContain("perigoso");
});
