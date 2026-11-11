# Methodology

## Repository Integration

**Project Base** (Planetary Explorer) was originally an independent project
(hosted at `github.com/MDSUWasi/Project-ELMO.git`). It is now a **feature of
Universe Data Booklet**. The two codebases remain independent in source but are
served by a single server.

### How it was synced

1. Project Base's full git history (25 commits) was fetched into the Universe Data
   Booklet repository and rewritten with `git filter-repo --path-rename` so every
   path is prefixed with `Project Base/`. This preserves the original commit
   history under the new location.
2. The rewritten history was merged into Universe Data Booklet with
   `git merge --allow-unrelated-histories`, creating a single merge commit.
   The original Project Base tree is byte-for-byte identical to the merged result
   (differences are only gitignored artifacts).
3. A bridge module (`src/backend/pb_gateway.py`) loads Project Base's backend by
   file path and forwards any `/pb/*` request to its `AppHandler` sub-handler,
   reusing the same socket. Project Base keeps its own frontend, API, SQLite
   cache, and data directory.

### Running

- Universe Data Booklet: `http://localhost:8081/` (default)
- Project Base (integrated): `http://localhost:8081/pb/`

Both are served by the same `python src/backend/server.py` process.

### Why not a submodule / subtree?

A submodule would require the original remote to remain reachable and would split
the deployment story. A `git subtree` merge keeps the code in-tree so the whole
app runs from one clone with no external dependencies. The `/pb` bridge keeps the
two backends decoupled so each can evolve independently.