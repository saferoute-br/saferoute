import "server-only";
import { Pool } from "pg";

// Conexão do servidor com o banco, pelo papel app_api (só executa funções).
// A string fica só em variável de ambiente de servidor (DATABASE_URL).
// O pooler do Supabase em modo transação não aceita prepared statements; o
// driver "pg" não os usa em consultas sem nome, que é o caso aqui.
//
// TLS sempre com verificação do certificado. Se o provedor usa autoridade
// certificadora própria (caso do Supabase), o certificado raiz público entra
// em DATABASE_CA_CERT_B64 (conteúdo do .crt em base64).

let pool: Pool | undefined;

export class DatabaseUnavailable extends Error {}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseUnavailable("sem configuração");
  const caB64 = process.env.DATABASE_CA_CERT_B64;
  pool ??= new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
    ssl: caB64
      ? { ca: Buffer.from(caB64, "base64").toString("utf8"), rejectUnauthorized: true }
      : true,
  });
  return pool;
}

export async function callJson<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await getPool().query(sql, params);
  return result.rows[0]?.result as T;
}
