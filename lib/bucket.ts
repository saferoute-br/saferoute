// Faixas de tempo do modelo: 4 períodos do dia x (dia útil / fim de semana).
// bucket = período * 2 + (1 se fim de semana). Ver D8 e item 10.6 da SPEC.

export const PERIODS = [
  { index: 0, label: "Madrugada", hours: "0h–6h" },
  { index: 1, label: "Manhã", hours: "6h–12h" },
  { index: 2, label: "Tarde", hours: "12h–18h" },
  { index: 3, label: "Noite", hours: "18h–24h" },
] as const;

export function toBucket(period: number, weekend: boolean): number {
  return period * 2 + (weekend ? 1 : 0);
}

export function bucketFromDate(date: Date): number {
  const period = Math.floor(date.getHours() / 6);
  const day = date.getDay(); // 0 domingo, 6 sábado
  return toBucket(period, day === 0 || day === 6);
}

export function describeBucket(bucket: number): string {
  const period = PERIODS[Math.floor(bucket / 2)];
  const day = bucket % 2 === 1 ? "fim de semana" : "dia útil";
  return `${period.label.toLowerCase()} de ${day}`;
}
