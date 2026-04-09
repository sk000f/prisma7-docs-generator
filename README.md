# Prisma 7 Documentation Generator

Automatically generate an interactive HTML reference from your Prisma Schema. This package contains a Prisma generator so the reference will automatically update every time you run `prisma generate`.

![screenshot](https://user-images.githubusercontent.com/22195362/89097596-edeadc00-d3fd-11ea-91ea-86d5d8076da0.png)

> This is a fork of the original [`prisma-docs-generator`](https://github.com/pantharshit00/prisma-docs-generator) updated for **Prisma ORM 7**. The upstream project has not been maintained since Prisma 4, and Prisma's DMMF, generator APIs, and schema loader changed significantly in versions 5–7. See [What changed in the Prisma 7 fork](#what-changed-in-the-prisma-7-fork) below for details.

## What's in the generated docs

Each run of `prisma generate` produces the following files in the output directory:

- `index.html` — the main documentation page (interactive, with dark mode)
- `styles/main.css` — Tailwind-based stylesheet used by `index.html`
- `data-dictionary.pdf` — a printable PDF of just the Data Dictionary, generated via headless Chromium

`index.html` contains two top-level sections, linked from a sticky sidebar table of contents:

1. **Data Dictionary** — a compact, database-centric reference of every table and column. Physical names are used throughout: if a model has `@@map("posts")` it appears as `posts`; if a field has `@map("author_id")` it appears as `author_id`. When no `@@map`/`@map` is set, Prisma's logical names are used as the fallback. Each model gets a four-column table: Column, Type, Required, Description. No operations, no Prisma Client boilerplate — just the shape of the data as the database sees it.
2. **Model Details** — the full Prisma-centric per-model view using the schema's logical names: documentation comments, `@@id`/`@@unique`/`@@index` directives, a five-column field table (Name, Type, Attributes, Required, Comment), and every Prisma Client operation (`findUnique`, `findMany`, `create`, `update`, `upsert`, `delete`, `updateMany`, `deleteMany`, …) with usage snippets and input/output argument tables. This is where you go when you want to understand how to interact with a model through Prisma Client.

The sidebar TOC mirrors these two sections. Under each heading it lists only the tables (by physical name for Data Dictionary, by Prisma model name for Model Details) — field and operation sublists have been deliberately omitted to keep the navigation scannable for real-world schemas with dozens of models.

### The PDF

`data-dictionary.pdf` is a standalone, print-friendly rendering of just the Data Dictionary — no sidebar, no Model Details, no styling from the main page. It's generated during `prisma generate` by handing a print-optimised HTML document to headless Chromium (via [Puppeteer](https://pptr.dev/)), so it comes out ready to share with a DBA, email to a stakeholder, or drop into a wiki without needing to open a browser.

PDF generation is **best-effort**: if Puppeteer fails to launch (e.g. no bundled Chromium, sandboxed CI, missing system libraries), the generator logs a warning and continues — you still get `index.html`, you just don't get the PDF. See [Troubleshooting](#troubleshooting).

## Requirements

- **Prisma ORM 7.x** (`prisma`, `@prisma/client`, `@prisma/generator-helper`, `@prisma/internals` all on `^7.7.0`).
- Node.js 18+ (Prisma 7 requires it).

If you are still on Prisma 4–6, use the original upstream package — this fork dropped backward compatibility in favor of a simpler, v7-native codebase.

## Getting Started

1. Install this package as a dev dependency:

   ```shell
   npm install -D prisma7-docs-generator
   # or
   pnpm add -D prisma7-docs-generator
   # or
   yarn add -D prisma7-docs-generator
   ```

2. Add the generator to your schema:

   ```prisma
   generator docs {
     provider = "node node_modules/prisma7-docs-generator"
     output   = "../docs"
   }
   ```

   > **Note:** Prisma 7 requires an explicit `output` field on every generator block.

3. Run `npx prisma generate` to trigger the generator. This will write `index.html` plus a `styles/` folder to the configured output path.

4. Serve the docs locally:

   ```shell
   npx prisma7-docs-generator serve
   ```

## Multi-file schemas (`prismaSchemaFolder`)

Prisma 7 makes multi-file schemas the default. This generator works transparently with either layout — Prisma merges all files into a single DMMF before handing it to the generator, so no extra configuration is needed on the generator side.

A typical multi-file layout looks like:

```
prisma/
  schema/
    schema.prisma     # datasource + generators
    user.prisma       # User, Profile models
    post.prisma       # Post model
```

Generate and serve with:

```shell
npx prisma generate --schema=prisma/schema
npx prisma7-docs-generator serve --schema=prisma/schema
```

If you have a `prisma.config.ts` that configures the schema path, both commands will pick it up automatically. The `serve` CLI also falls back to `./prisma/schema` if the default single-file locations aren't found, so in most projects no `--schema` flag is needed.

## Options

### `output` (required)

Where the generated HTML and CSS will be written. Resolved relative to the schema file the generator block is declared in.

```prisma
generator docs {
  provider = "node node_modules/prisma7-docs-generator"
  output   = "../docs"
}
```

### `includeRelationFields`

Whether to render relation fields in model tables. Default: `true`.

```prisma
generator docs {
  provider              = "node node_modules/prisma7-docs-generator"
  output                = "../docs"
  includeRelationFields = "false"
}
```

## CLI

This package ships a small CLI with a single subcommand today:

### `serve`

Serves the static HTML that the generator wrote to its `output` path.

```
prisma7-docs-generator serve [flags]

  --port, -p      Port for the express server (default: 5858)
  --schema        Path to the Prisma schema file or multi-file schema folder
                  (defaults to ./schema.prisma, ./prisma/schema.prisma, or
                   ./prisma/schema for multi-file layouts)
  --generator     Name of the docs generator block in your schema (default: "docs")
```

Under the hood, `serve` reads the generator's output path straight from the schema context rather than spawning all configured generators — so it will not try to re-run Prisma's built-in `prisma-client` generator when you just want to view docs.

## Troubleshooting

### `Cannot read properties of undefined (reading 'map')` with a multi-file schema

**Symptom:** `prisma generate` fails with an error like:

```
✔ Generated Prisma Client (7.x.x) to ./src/generated/prisma in 12ms

Cannot read properties of undefined (reading 'map')
```

The Prisma client generator runs successfully, but `prisma7-docs-generator` crashes immediately afterwards. Confusingly, no stack trace from the generator itself is shown.

**Cause:** If you're using Prisma's multi-file schema layout (a primary `schema.prisma` plus model definitions split across `prisma/models/*.prisma`), and you don't have an explicit `schema` entry in your `prisma.config.ts`, Prisma 7 will pass an empty datamodel (`datamodel.models.length === 0`) to third-party generators. The built-in `prisma-client` generator has its own multi-file discovery path, so it works regardless — but external generators, including this one, receive only the primary file, which typically contains nothing but `generator` and `datasource` blocks.

When this generator then tries to render docs from an empty model list, an internal `.map(...)` call fails on a downstream field that was expected to be populated from the datamodel.

**Fix:** Add an explicit `schema` entry to your `prisma.config.ts` pointing at the folder (or file) containing your schema:

```ts
// prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma', // <-- add this line
  // ... rest of your config
});
```

After this change, Prisma will treat the whole `prisma/` folder as the schema source for all consumers (client + third-party generators), and the full datamodel will be passed through correctly.

**How to confirm this is your issue:** If you're unsure whether you're hitting the empty-datamodel case, you can check quickly by temporarily patching `node_modules/prisma7-docs-generator/dist/index.js` at the top of `onGenerate` with:

```js
console.error('models length:', options.dmmf?.datamodel?.models?.length);
```

If it logs `0`, this is the issue and the `schema:` fix above will resolve it. If it logs a non-zero number, the crash is from something else and is worth opening an issue with the output of that log line.

### `data-dictionary.pdf` is missing after `prisma generate`

**Symptom:** `index.html` is generated but `data-dictionary.pdf` is not present, and the `prisma generate` output contains a line like:

```
prisma7-docs-generator: failed to generate data-dictionary.pdf: Failed to launch the browser process!
```

**Cause:** PDF output is produced by headless Chromium via Puppeteer. Puppeteer downloads Chromium into `~/.cache/puppeteer` the first time it's installed, and launches it with `--no-sandbox`. Common failure modes:

- **Chromium was never downloaded** — e.g. because the install happened in an environment that set `PUPPETEER_SKIP_DOWNLOAD=true`, or the download was interrupted. Fix: `npx puppeteer browsers install chrome`.
- **Missing system libraries on Linux** — headless Chromium needs a handful of shared objects (`libnss3`, `libatk-1.0`, `libcups2`, etc.). On Debian/Ubuntu: `apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2`.
- **Sandboxed CI/CD environment** — some CI runners block the sandbox. We already launch with `--no-sandbox`, so this is usually fine, but certain locked-down containers still refuse. In that case, fall back to opening `index.html` in a real browser and using File → Print → Save as PDF.

PDF generation is best-effort by design — any failure logs a warning and the rest of the generator keeps working, so your HTML docs are always up to date regardless of whether the PDF succeeds.

## What changed in the Prisma 7 fork

Compared to the original upstream package (which targeted Prisma 4.14), this fork contains the following changes needed to work with Prisma ORM 7, plus a couple of small feature additions:

- **New Data Dictionary section** (feature add) — a dedicated top-level section that lists every table and column using the **physical database names** (`@@map` / `@map` values from the schema, falling back to Prisma logical names when no mapping is set). Appears above the existing "Model Details" section, which retains the Prisma-centric logical view.
- **PDF output** (feature add) — `prisma generate` now also emits `data-dictionary.pdf`, a standalone print-friendly rendering of the dictionary produced via headless Chromium (Puppeteer). Best-effort: falls back to HTML-only output if Puppeteer can't launch.
- **Types section removed** — the upstream "Input Types" / "Output Types" reference has been dropped in favor of a cleaner two-section layout (Data Dictionary + Model Details). The field and operation tables in Model Details no longer hyperlink to type pages.
- **Simplified TOC** — the sidebar now lists only the top-level tables under each section. The upstream TOC also listed every field and every operation per model, which became unusable on schemas with dozens of models.
- **DMMF types are now `ReadonlyDeep`** (via the new `@prisma/dmmf` package). `transformDMMF` no longer mutates the incoming DMMF in place — it builds a fresh document when filtering out relation fields.
- **`DMMF.SchemaArgInputType` was renamed to `DMMF.InputTypeRef`.** The `model.ts` and `apitypes.ts` generators were updated accordingly.
- **`DMMF.ModelAction` is no longer exported as a runtime enum** from `@prisma/generator-helper`. The switch in `model.ts` now uses string literals (`'create'`, `'findUnique'`, …), which are the canonical v7 operation names.
- **`DMMF.ModelMapping` dropped its v4/v5 aliases** (`findSingle`, `findOne`, `createOne`, `deleteOne`, `upsertOne`, …). The mapping-transformation layer no longer carries the old back-compat fallback chain.
- **`getSchemaPath()` was removed from `@prisma/internals`.** The CLI now uses `loadSchemaContext()`, which transparently handles both single-file and multi-file (`prismaSchemaFolder`) schemas and returns all loaded files plus parsed generator configs.
- **`getGenerators()` changed signature** (now requires `schemaContext` + `registry`) and will try to spawn the built-in `prisma-client` generator. The CLI was rewritten to skip it entirely: since `serve` only needs the docs generator's output directory, it now reads that directly from `schemaContext.generators` and resolves it against the generator's `sourceFilePath`.
- **Example schema split into a multi-file layout** (`prisma/schema/schema.prisma` + `user.prisma` + `post.prisma`) using the new `prisma-client` provider, to exercise v7's default behavior end-to-end.
- **Test suite updated:** `getDMMF` is now properly typed; a new regression test feeds `getDMMF` a multi-file `SchemaFileInput` array; fixtures were updated where Prisma 7's validator rejected the old single-file schemas (e.g. `url = env(...)` is no longer allowed inside datasource blocks, and `@default(cuid())` is now emitted as `@default(cuid(1))`).

---

## License

MIT — Prisma 7 fork maintained independently; this is not an official Prisma project.
