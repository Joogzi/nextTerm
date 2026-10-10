# Shared GitHub Pages deployment

This is a template for the **`Joogzi/Joogzi.github.io` repository**, not a workflow to enable in the NextTerm source repository. It builds both source forks and serves:

- `/nextTerm/` — the static NextTerm backend-snapshot demo.
- `/dataio2026/` — the Data I/O 3D campus visualizer.

The source repositories retain their existing names. Publishing `dataio-26` directly as a project Pages site would use `/dataio-26/`, which is why these two outputs are combined in the user-site repository.

## First publication

1. Populate NextTerm's backend and commit a nonempty `app/src/lib/demo-snapshot.json`, following the source README. The workflow deliberately fails if the snapshot has no courses or sections.
2. Ensure the changes in both source forks are pushed to `main`.
3. Create `Joogzi/Joogzi.github.io` if it does not exist. If it already hosts a site, integrate these two subdirectories into its existing deployment instead of replacing its workflow or root content.
4. Copy this template's `.github/workflows/pages.yml` to `.github/workflows/pages.yml` in that user-site repository and push it to `main`.
5. In that repository's **Settings → Pages**, select **GitHub Actions** as the source. Run **Deploy portfolio projects** in Actions if it was not automatically started, and wait for the deployment job to pass.
6. Verify the deployed pages, NextTerm hash-route refreshes, and Data I/O dataset/model requests before putting the URLs on a resume.

The default workflow can check out public source repositories without an extra token. If either source fork is private, configure a repository Actions secret named `SOURCE_READ_TOKEN` with read access to those source repositories. Never put credentials in source code or built assets.

## Updates

After pushing a new source version or refreshed snapshot, manually run **Deploy portfolio projects** in the user-site repository. The workflow uses the latest `main` from each source fork. Changes in a source fork do not automatically trigger a different repository's workflow.

The build deploys only static assets. It does not run the importer against OSU, start the backend, or include the SQLite database. It does not need an AI key.

## Current preparation status

The workflow template and builds can be prepared locally without GitHub API access. They are not proof of a published site. The NextTerm catalog must be populated and the user-site repository must be created/configured before the requested public URLs can be verified.
