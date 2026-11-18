# Changelog

All notable changes to this plugin are documented here. Versions follow [Semantic Versioning](https://semver.org).

## 1.0.1

- Skills synced from `mondaycom/skills` with every tool call matched to the current monday.com MCP tool schemas
  (parameter names, required fields and return values).
- MCP UI widgets are used only when the client lists them; otherwise skills answer in markdown with the board link.

## 1.0.0

- First release for Gemini Agent: the monday.com MCP server (`https://mcp.monday.com/mcp`) and six skills,
  `monday-onboard-to-monday`, `monday-board-setup`, `monday-task-management`, `monday-project-status-report`,
  `monday-docs-collaborator` and `monday-forms-builder`.
