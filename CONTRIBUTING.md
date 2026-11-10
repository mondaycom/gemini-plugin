# Contributing

This repository is the monday.com plugin for Gemini Agent.

- **Skills** (`skills/`) are copied from [mondaycom/skills](https://github.com/mondaycom/skills) and must not be
  edited here. `scripts/sync-skills.sh` adds the `prefix` from `skills.json` to each skill's folder and `name`,
  because Gemini requires skill names to start with the partner brand. To change a skill, open a pull request in
  mondaycom/skills. Once it is merged, bump `ref` in `skills.json` (and `skills`, to add or remove one), run
  `scripts/sync-skills.sh` and open a pull request here with the result.
- **Everything else** (manifest, README, MCP configuration) is edited directly here through a pull request. Bump
  `version` in `.gemini-plugin/plugin.json` and add a `CHANGELOG.md` entry with every release, then tag it
  `v<version>`.
- **Product support:** [support.monday.com](https://support.monday.com).
