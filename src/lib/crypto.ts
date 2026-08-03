import crypto from "crypto";

/**
 * Criptografia simétrica (AES-256-GCM) para guardar segredos no banco de
 * controle: connection strings de cada empresa, tokens de Mercado Pago e
 * WhatsApp de cada empresa. Nunca guardamos esses valores em texto puro.
 *
 * Formato armazenado: "<iv-base64>.<authTag-base64>.<dados-base64>"
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY não configurado no .env. Gere com: openssl rand -base64 32"
    );
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY inválido: precisa decodificar para 32 bytes em base64 (openssl rand -base64 32)."
    );
  }
  return buf;
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Payload criptografado inválido (formato inesperado).");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Gera uma senha aleatória forte, usada como db_pass ao provisionar um banco novo. */
export function gerarSenhaForte(tamanho = 32): string {
  return crypto.randomBytes(tamanho).toString("base64url");
}

/** Gera um token de convite/uso único (usado no link de "definir senha"). */
export function gerarToken(tamanho = 32): string {
  return crypto.randomBytes(tamanho).toString("base64url");
}
