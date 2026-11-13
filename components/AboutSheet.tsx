function year(date?: string): string {
  return date ? date.slice(0, 4) : "";
}

// Texto obrigatório do item 11.3 da SPEC.
export function AboutSheet({
  meta,
  onClose,
}: {
  meta: { run: { data_from: string; data_to: string } | null } | null;
  onClose: () => void;
}) {
  const from = year(meta?.run?.data_from);
  const to = year(meta?.run?.data_to);
  const span = from && to ? (from === to ? from : `${from} e ${to}`) : "2024 e 2025";
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="sobre-titulo">
      <div className="sheet">
        <h2 id="sobre-titulo">Sobre os dados e limitações</h2>
        <ul>
          <li>
            O SafeRoute mostra onde houve mais registros de roubo e furto. Ele não prevê crimes e
            não garante segurança em nenhum caminho.
          </li>
          <li>
            Os dados são boletins de ocorrência da SSP-SP de {span}. Muitos crimes não são
            registrados, e parte dos registros não tem localização.
          </li>
          <li>
            O risco é calculado por trecho de rua e por período. O app não classifica bairros.
          </li>
          <li>
            Mais registros não significa mais perigo por pessoa: ruas movimentadas concentram
            registros. Esta versão ainda não corrige isso.
          </li>
          <li>Use como uma informação a mais. Em emergência, ligue 190.</li>
        </ul>
        <p className="fine">
          Versão de demonstração, só para o modo a pé. Os tempos consideram caminhada a 4,8 km/h.
          Mapa: © OpenStreetMap (ODbL), OpenFreeMap. Ocorrências: SSP-SP. Código aberto, licença
          MIT. O app não tem login, não guarda rotas e não usa rastreadores.
        </p>
        <button type="button" className="primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
