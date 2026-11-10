# monday.com for Gemini

Bring monday.com into Gemini. Set up boards, create, update and assign items, get status reports, write docs and set up forms from a conversation.

## What you get

- **monday.com MCP server**: the official monday.com MCP server (`https://mcp.monday.com/mcp`, Streamable HTTP,
  OAuth), with tools for boards, items, columns, docs, forms, dashboards, workspaces and more.
- **Skills**
  - `monday-onboard-to-monday`: first-run setup. Builds a board tailored to your work, with starter items and an automation.
  - `monday-board-setup`: create a board with the right groups, columns and starter items.
  - `monday-task-management`: create, update, assign and move items, with correct column-value formats.
  - `monday-project-status-report`: status reports across boards: overdue items, blockers, workload and recent activity.
  - `monday-docs-collaborator`: create, read, edit and comment on monday docs, including live column embeds and mentions.
  - `monday-forms-builder`: create, edit and publish monday WorkForms.

## Prerequisites

- A monday.com account. On first use you sign in to monday.com and approve access (OAuth). No API token is needed.
- You only get access to what your monday.com user can already see.
- Account admins control AI connector access in **Administration → AI governance → AI permissions**. Admins can
  also limit MCP to specific workspaces in **Administration → Apps → monday MCP**.

## Links

- Documentation: [developer.monday.com](https://developer.monday.com/api-reference/docs/compatible-mcp-clients)
- Privacy policy: [monday.com/l/privacy/privacy-policy](https://monday.com/l/privacy/privacy-policy/)
- Terms of service: [monday.com/l/legal/tos](https://monday.com/l/legal/tos/)
- Help: [support.monday.com](https://support.monday.com)
- Contact: support@monday.com
