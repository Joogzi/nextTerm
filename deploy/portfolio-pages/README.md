# Shared GitHub Pages deployment

The live `Joogzi/joogzi.github.io` site currently publishes from **main → / (root)** using GitHub Pages' branch deployment. To update it, copy the build helper's `site/nextTerm/` and `site/dataio2026/` outputs into the corresponding root folders of that repository and preserve its `.nojekyll` file. Do not add this optional custom workflow to the live branch deployment; its current instructions are in the [site README](https://github.com/Joogzi/joogzi.github.io).

The remaining instructions describe the optional GitHub Actions deployment template for a new site configured to use that mode.

This is a template for the **`Joogzi/Joogzi.github.io` repository**, not a workflow to enable in the NextTerm source repository. It publishes prepared website files and serves:

- `/nextTerm/` — the static NextTerm backend-snapshot demo.
- `/dataio2026/` — the Data I/O 3D campus visualizer.

The source repositories retain their existing names. Publishing `dataio-26` directly as a project Pages site would use `/dataio-26/`, which is why these two outputs are combined in the user-site repository.

## First publication

1. Populate NextTerm's backend and commit a nonempty `app/src/lib/demo-snapshot.json`, following the source README. The build helper deliberately fails if the snapshot has no courses or sections.
2. Keep the `nextTerm` and `dataio-26` source checkouts in the same parent directory. From `nextTerm`, run `node deploy/build-portfolio.mjs` with Bun on your PATH. It installs locked dependencies, runs the checks and builds, and prints a fresh release directory containing `site/`, `.github/`, and this README.
3. Create `Joogzi/Joogzi.github.io` if it does not exist. If it already hosts a site, integrate these two subdirectories into its existing deployment instead of replacing its workflow or root content.
4. Copy the release directory's `site/`, `.github/`, and `README.md` into the new user-site repository and push them to `main`.
5. In that repository's **Settings → Pages**, select **GitHub Actions** as the source. Run **Deploy portfolio projects** in Actions if it was not automatically started, and wait for the deployment job to pass.
6. Verify the deployed pages, NextTerm hash-route refreshes, and Data I/O dataset/model requests before putting the URLs on a resume.

The workflow only needs its own repository's standard GitHub Actions token. Builds run from your source checkouts before publication, so the private Data I/O source fork does not require a cross-repository token. Only built browser assets and display datasets are published; the source checkout, database, and credentials are not copied into the site repository.

## Updates

After changing a source project or refreshing the snapshot, run `node deploy/build-portfolio.mjs` again, update the two corresponding directories in the user-site repository's `site/` folder, and push. That push automatically runs **Deploy portfolio projects**. Keep any unrelated site content when updating an existing deployment.

The build deploys only static assets. It does not run the importer against OSU, start the backend, or include the SQLite database. It does not need an AI key.

The workflow template and local builds are not proof of publication. The user-site repository's Pages configuration and deployment job must succeed before the public URLs are available.
