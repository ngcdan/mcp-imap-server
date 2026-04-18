import { ImapFlow } from "imapflow";

export interface ImapConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean;
}

export function getConfigFromEnv(): ImapConfig {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Missing IMAP config. Set IMAP_HOST, IMAP_USER, IMAP_PASSWORD env vars."
    );
  }

  return {
    host,
    port: parseInt(process.env.IMAP_PORT || "993", 10),
    auth: { user, pass },
    secure: process.env.IMAP_TLS !== "false",
  };
}

let client: ImapFlow | null = null;

export async function getClient(): Promise<ImapFlow> {
  if (client && client.usable) {
    return client;
  }

  const config = getConfigFromEnv();
  client = new ImapFlow({
    ...config,
    logger: false,
  });

  await client.connect();
  return client;
}

export async function disconnectClient(): Promise<void> {
  if (client) {
    await client.logout();
    client = null;
  }
}
