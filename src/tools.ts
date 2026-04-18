import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simpleParser } from "mailparser";
import { getClient } from "./imap-client.js";

export function registerTools(server: McpServer): void {
  server.tool(
    "list_folders",
    "List all IMAP mailbox folders",
    {},
    async () => {
      const client = await getClient();
      const folders = await client.list();
      const result = folders.map((f) => ({
        name: f.name,
        path: f.path,
        specialUse: f.specialUse || "",
        messages: f.status?.messages ?? 0,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "list_messages",
    "List recent messages in a folder with subject, from, date. Default folder is INBOX.",
    {
      folder: z.string().default("INBOX").describe("Mailbox folder path"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Max messages to return"),
    },
    async ({ folder, limit }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        const messages: Array<{
          uid: number;
          subject: string;
          from: string;
          date: string;
          seen: boolean;
        }> = [];

        const mailbox = client.mailbox;
        const totalMessages = mailbox ? mailbox.exists : 0;
        if (totalMessages === 0) {
          return {
            content: [{ type: "text", text: "No messages in folder." }],
          };
        }

        const startSeq = Math.max(1, totalMessages - limit + 1);
        const range = `${startSeq}:*`;

        for await (const msg of client.fetch(range, {
          envelope: true,
          flags: true,
        })) {
          messages.push({
            uid: msg.uid,
            subject: msg.envelope?.subject || "(no subject)",
            from:
              msg.envelope?.from
                ?.map((a) =>
                  a.name ? `${a.name} <${a.address}>` : a.address || ""
                )
                .join(", ") || "",
            date: msg.envelope?.date?.toISOString() || "",
            seen: msg.flags?.has("\\Seen") || false,
          });
        }

        messages.reverse();
        return {
          content: [
            { type: "text", text: JSON.stringify(messages, null, 2) },
          ],
        };
      } finally {
        lock.release();
      }
    }
  );

  server.tool(
    "get_message",
    "Fetch a single email by UID. Returns headers and text body (prefers plain text).",
    {
      folder: z.string().default("INBOX").describe("Mailbox folder path"),
      uid: z.number().describe("Message UID"),
    },
    async ({ folder, uid }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        const msg = await client.fetchOne(String(uid), {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        });

        if (!msg) {
          return { content: [{ type: "text", text: "Message not found." }] };
        }

        if (!msg.source) {
          return { content: [{ type: "text", text: "Message source not available." }] };
        }

        const parsed = await simpleParser(msg.source);

        const body = parsed.text || parsed.html || "(empty body)";
        const truncated =
          body.length > 10000 ? body.substring(0, 10000) + "\n...(truncated)" : body;

        const result = {
          uid: msg.uid,
          subject: parsed.subject || "(no subject)",
          from: parsed.from?.text || "",
          to: parsed.to
            ? Array.isArray(parsed.to)
              ? parsed.to.map((t: { text: string }) => t.text).join(", ")
              : parsed.to.text
            : "",
          date: parsed.date?.toISOString() || "",
          flags: Array.from(msg.flags || []),
          body: truncated,
          attachments: parsed.attachments?.map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
          })),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } finally {
        lock.release();
      }
    }
  );

  server.tool(
    "search_messages",
    "Search messages in a folder by criteria (subject, from, since date, unseen only)",
    {
      folder: z.string().default("INBOX").describe("Mailbox folder path"),
      subject: z.string().optional().describe("Search in subject"),
      from: z.string().optional().describe("Search by sender"),
      since: z
        .string()
        .optional()
        .describe("Messages since date (YYYY-MM-DD)"),
      unseen: z
        .boolean()
        .default(false)
        .describe("Only unseen messages"),
      limit: z.number().min(1).max(100).default(20).describe("Max results"),
    },
    async ({ folder, subject, from, since, unseen, limit }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        const searchCriteria: Record<string, unknown> = {};
        if (subject) searchCriteria.subject = subject;
        if (from) searchCriteria.from = from;
        if (since) searchCriteria.since = new Date(since);
        if (unseen) searchCriteria.seen = false;

        const searchResult = await client.search(searchCriteria, { uid: true });
        const uids = Array.isArray(searchResult) ? searchResult : [];
        const limitedUids = uids.slice(-limit);

        if (limitedUids.length === 0) {
          return { content: [{ type: "text", text: "No messages found." }] };
        }

        const messages: Array<{
          uid: number;
          subject: string;
          from: string;
          date: string;
        }> = [];

        for await (const msg of client.fetch(
          limitedUids.map(String).join(","),
          { envelope: true, uid: true }
        )) {
          messages.push({
            uid: msg.uid,
            subject: msg.envelope?.subject || "(no subject)",
            from:
              msg.envelope?.from
                ?.map((a) =>
                  a.name ? `${a.name} <${a.address}>` : a.address || ""
                )
                .join(", ") || "",
            date: msg.envelope?.date?.toISOString() || "",
          });
        }

        return {
          content: [
            { type: "text", text: JSON.stringify(messages, null, 2) },
          ],
        };
      } finally {
        lock.release();
      }
    }
  );

  server.tool(
    "mark_message",
    "Set or remove flags on a message (e.g., mark as read/unread, flag/unflag)",
    {
      folder: z.string().default("INBOX").describe("Mailbox folder path"),
      uid: z.number().describe("Message UID"),
      flags: z
        .array(z.string())
        .describe('Flags to set, e.g. ["\\\\Seen", "\\\\Flagged"]'),
      action: z
        .enum(["add", "remove", "set"])
        .default("add")
        .describe("add, remove, or set flags"),
    },
    async ({ folder, uid, flags, action }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        if (action === "add") {
          await client.messageFlagsAdd(String(uid), flags, { uid: true });
        } else if (action === "remove") {
          await client.messageFlagsRemove(String(uid), flags, { uid: true });
        } else {
          await client.messageFlagsSet(String(uid), flags, { uid: true });
        }
        return {
          content: [
            {
              type: "text",
              text: `Flags ${action}: ${flags.join(", ")} on UID ${uid}`,
            },
          ],
        };
      } finally {
        lock.release();
      }
    }
  );

  server.tool(
    "move_message",
    "Move a message to another folder",
    {
      folder: z.string().default("INBOX").describe("Source folder"),
      uid: z.number().describe("Message UID"),
      destination: z.string().describe("Destination folder path"),
    },
    async ({ folder, uid, destination }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        await client.messageMove(String(uid), destination, { uid: true });
        return {
          content: [
            {
              type: "text",
              text: `Moved UID ${uid} from ${folder} to ${destination}`,
            },
          ],
        };
      } finally {
        lock.release();
      }
    }
  );

  server.tool(
    "delete_message",
    "Delete a message (move to Trash or permanently delete)",
    {
      folder: z.string().default("INBOX").describe("Mailbox folder path"),
      uid: z.number().describe("Message UID"),
      permanent: z
        .boolean()
        .default(false)
        .describe("Permanently delete (expunge) instead of moving to Trash"),
    },
    async ({ folder, uid, permanent }) => {
      const client = await getClient();
      const lock = await client.getMailboxLock(folder);
      try {
        if (permanent) {
          await client.messageFlagsAdd(String(uid), ["\\Deleted"], {
            uid: true,
          });
          await client.messageDelete(String(uid), { uid: true });
        } else {
          await client.messageMove(String(uid), "Trash", { uid: true });
        }
        return {
          content: [
            {
              type: "text",
              text: permanent
                ? `Permanently deleted UID ${uid}`
                : `Moved UID ${uid} to Trash`,
            },
          ],
        };
      } finally {
        lock.release();
      }
    }
  );
}
