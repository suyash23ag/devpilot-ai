# Optional GitHub CI

`desktop-checks.yml` is an opt-in GitHub Actions template. Copy it to `.github/workflows/desktop-checks.yml` using a GitHub identity authorized to create workflows. It runs deterministic tests and the frontend build on Node 22.

The GitHub credential available during delivery permits repository writes but does not include the separate `workflow` scope. The template is therefore delivered as documentation without expanding account permissions. Remote CI is not reported as executed. Local tests, build, live model checks and offline acceptance evidence are included in `../testing/VERIFICATION.md`.
