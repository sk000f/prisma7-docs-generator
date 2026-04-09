# Prisma 7 Documentation Generator

Automatically generate an interactive HTML reference from your Prisma Schema. This package contains a Prisma generator so the reference will automatically update every time you run `prisma generate`.

![screenshot](https://user-images.githubusercontent.com/22195362/89097596-edeadc00-d3fd-11ea-91ea-86d5d8076da0.png)

> This is a fork of the original [`prisma-docs-generator`](https://github.com/pantharshit00/prisma-docs-generator) updated for **Prisma ORM 7**. The upstream project has not been maintained since Prisma 4, and Prisma's DMMF, generator APIs, and schema loader changed significantly in versions 5–7. See [What changed in the Prisma 7 fork](#what-changed-in-the-prisma-7-fork) below for details.

## What's in the generated docs

Each generated `index.html` contains three top-level sections, linked from a sticky sidebar table of contents:

1. **Data Dictionary** — a compact, reference-card view of every model and field, with both Prisma (logical) and database (physical) names in separate columns. This is where you go to answer questions like "what's the column name in the database for `User.createdAt`?" without being distracted by CRUD operations. Models that use `@@map` show their physical table name as a muted suffix in the heading (e.g. `Post → posts`); fields with `@map` show their column name in a dedicated `Column` column. Non-scalar field types are hyperlinked to the Types section.
2. **Model Details** — the full per-model view: documentation comments, `@@id`/`@@unique`/`@@index` directives, the same field listing as the dictionary (in the original five-column format), and every Prisma Client operation (`findUnique`, `findMany`, `create`, `update`, `upsert`, `delete`, `updateMany`, `deleteMany`, …) with usage snippets and input/output argument tables. This is where you go when you want to understand both the shape of a model *and* how to interact with it through Prisma Client.
3. **Types** — Prisma Client's generated input and output types (e.g. `UserWhereInput`, `UserCreateInput`), cross-linked from the field and operation tables above.

The sidebar TOC mirrors these three sections so you can jump straight to a specific model, field, operation, or type.

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

## What changed in the Prisma 7 fork

Compared to the original upstream package (which targeted Prisma 4.14), this fork contains the following changes needed to work with Prisma ORM 7, plus a couple of small feature additions:

- **New Data Dictionary section** (feature add) — a dedicated top-level section that lists every model and field with both logical (Prisma) and physical (database) names side-by-side, surfacing `@@map` and `@map` values that the upstream package never displayed. Appears above the existing (renamed) "Model Details" section.
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
