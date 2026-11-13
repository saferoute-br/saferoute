"use client";

import { useEffect, useState } from "react";
import { BrandMark, Wordmark } from "./Brand";

const KEY = "saferoute.aviso.v1";

// Aviso da primeira abertura (item 10.1 da SPEC). Precisa ser aceito uma vez.
export function Onboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;
  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // sem armazenamento: o aviso volta na próxima visita
    }
    setOpen(false);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="aviso-titulo">
      <div className="sheet sheet-brand">
        <div className="brand-hero">
          <BrandMark size={84} />
          <h2 id="aviso-titulo">
            <Wordmark />
          </h2>
          <p className="tagline">Tudo começa pelo caminho.</p>
          <span className="signature" aria-hidden="true" />
        </div>
        <ul>
          <li>Compara caminhos a pé pelo risco registrado de roubo e furto em cada trecho.</li>
          <li>Usa boletins de ocorrência públicos da SSP-SP. Muitos crimes não são registrados.</li>
          <li>Não prevê crimes e não garante segurança em nenhum caminho. Em emergência, ligue 190.</li>
        </ul>
        <button type="button" className="primary" onClick={accept}>
          Entendi
        </button>
      </div>
    </div>
  );
}
