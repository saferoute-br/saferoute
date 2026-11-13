import { expect, test } from "vitest";
import { bucketFromDate, describeBucket, toBucket } from "@/lib/bucket";

test("bucket = período * 2 + fim de semana", () => {
  expect(toBucket(0, false)).toBe(0);
  expect(toBucket(3, false)).toBe(6);
  expect(toBucket(3, true)).toBe(7);
});

test("converte data e hora em faixa", () => {
  // 12/11/2026 é quinta-feira; 14/11/2026 é sábado.
  expect(bucketFromDate(new Date(2026, 10, 12, 5, 59))).toBe(0);
  expect(bucketFromDate(new Date(2026, 10, 12, 6, 0))).toBe(2);
  expect(bucketFromDate(new Date(2026, 10, 12, 19, 30))).toBe(6);
  expect(bucketFromDate(new Date(2026, 10, 14, 19, 30))).toBe(7);
  expect(bucketFromDate(new Date(2026, 10, 15, 13, 0))).toBe(5);
});

test("descreve a faixa em português", () => {
  expect(describeBucket(6)).toBe("noite de dia útil");
  expect(describeBucket(1)).toBe("madrugada de fim de semana");
});
