# mcp-imap-server

MCP (Model Context Protocol) server for IMAP email access. Connect Claude to your mailbox directly.

## Setup

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and fill in your IMAP credentials:

```bash
cp .env.example .env
```

## Claude Desktop / Claude Code Integration

Add to your MCP config (`~/.claude.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "imap": {
      "command": "node",
      "args": ["/path/to/mcp-imap-server/dist/index.js"],
      "env": {
        "IMAP_HOST": "mail.datatp.cloud",
        "IMAP_PORT": "993",
        "IMAP_USER": "your-email",
        "IMAP_PASSWORD": "your-password"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_folders` | List all mailbox folders |
| `list_messages` | List recent messages in a folder |
| `get_message` | Fetch a single email by UID |
| `search_messages` | Search by subject, from, date, unseen |
| `mark_message` | Set/remove flags (read, flagged) |
| `move_message` | Move message to another folder |
| `delete_message` | Delete or trash a message |
