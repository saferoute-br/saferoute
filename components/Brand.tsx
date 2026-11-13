import Image from "next/image";

// Marca do SafeRoute: símbolo + nome. As cores vêm do kit de marca
// (ver docs/BRAND.md) e estão declaradas em app/globals.css.
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={Math.round(size * 0.713)}
      height={size}
      unoptimized
      priority
      className="brand-mark"
    />
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-safe">Safe</span>
      <span className="wordmark-route">Route</span>
    </span>
  );
}
