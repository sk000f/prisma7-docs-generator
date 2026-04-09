#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import meow from 'meow';
import kleur from 'kleur';
import express from 'express';
import { loadSchemaContext } from '@prisma/internals';
import type { SchemaPathInput } from '@prisma/internals';
import { Server } from 'http';

const cli = meow(
  `
  Usage
  $ prisma-docs-generator [command] [flags]

  Options
    -v Prints out the version number

    ${kleur.bold('serve')}
      --port -p     Specify the port from which this cli should serve the docs
      --schema      Path to the Prisma schema file or multi-file schema folder
                    (defaults to ./schema.prisma, ./prisma/schema.prisma, or
                     ./prisma/schema for multi-file schemas)
      --generator   Name of the docs generator block in your schema (default: "docs")

`,
  {
    flags: {
      port: {
        type: 'number',
        alias: 'p',
        default: 5858,
      },
      schema: {
        type: 'string',
      },
      generator: {
        type: 'string',
        default: 'docs',
      },
      version: {
        alias: 'v',
      },
    },
  }
);

function resolveSchemaPathInput(cliSchema: string | undefined): SchemaPathInput {
  if (cliSchema) {
    return { cliProvidedPath: cliSchema };
  }
  // Prisma 7's loadSchemaContext only auto-detects single-file defaults
  // (./schema.prisma, ./prisma/schema.prisma). If neither exists, fall back
  // to ./prisma/schema (the default multi-file layout under prismaSchemaFolder).
  const cwd = process.cwd();
  const defaults = [
    path.join(cwd, 'schema.prisma'),
    path.join(cwd, 'prisma', 'schema.prisma'),
  ];
  if (defaults.some((p) => fs.existsSync(p))) {
    return { baseDir: cwd };
  }
  const multiFileDir = path.join(cwd, 'prisma', 'schema');
  if (fs.existsSync(multiFileDir)) {
    return { cliProvidedPath: multiFileDir };
  }
  return { baseDir: cwd };
}

class ExpressService {
  exp: express.Express;
  appInstance: Server | null;
  port: number;
  servePath: string;

  constructor(port: number, path: string) {
    this.port = port;
    this.servePath = path;
    this.exp = express();
    this.appInstance = null;
  }

  start() {
    this.exp.use('/', express.static(this.servePath));
    this.appInstance = this.exp.listen(this.port, () => {
      console.log(
        `Prisma Docs Generator started at http://localhost:${this.port}`
      );
    });
  }

  exit() {
    if (this.appInstance) {
      this.appInstance.close();
    }
  }
}

async function execute<T extends meow.AnyFlags>(cli: meow.Result<T>) {
  const {
    flags: { port, schema, generator: generatorName },
    input,
  } = cli;
  if (input.length < 1) {
    console.error(kleur.red('No sub command was specified'));
    cli.showHelp();
  }

  const mainSubcommand = input[0];

  switch (mainSubcommand) {
    case 'serve': {
      const schemaContext = await loadSchemaContext({
        schemaPath: resolveSchemaPathInput(schema as string | undefined),
        allowNull: true,
      });
      if (!schemaContext) {
        console.error(kleur.red('Unable to find Prisma schema'));
        process.exit(1);
      }
      // Read the docs generator config directly from the schema context
      // instead of spawning all generators (which would try to launch Prisma's
      // built-in `prisma-client` generator as a subprocess).
      const docsGenerator = schemaContext.generators.find(
        (gen) => gen.name === generatorName
      );
      if (!docsGenerator) {
        console.error(
          kleur.red(
            `Generator "${generatorName}" was not found in the schema. ` +
              `Available generators: ${schemaContext.generators
                .map((g) => g.name)
                .join(', ') || '(none)'}`
          )
        );
        process.exit(1);
      }

      const rawOutput = docsGenerator.output?.value;
      if (!rawOutput) {
        console.error(
          kleur.red('Unable to resolve output path for the generator')
        );
        process.exit(1);
      }
      // `output.value` is stored as a path relative to the schema file it was
      // declared in. Resolve it to an absolute path so express can serve it.
      const servePath = path.resolve(
        path.dirname(docsGenerator.sourceFilePath ?? schemaContext.schemaRootDir),
        rawOutput
      );

      const server = new ExpressService(port as number, servePath);
      server.start();

      process.on('SIGTERM', () => {
        server.exit();
      });

      break;
    }
    default: {
      console.error(kleur.red(`Unknown command ${kleur.bold(mainSubcommand)}`));
      cli.showHelp();
    }
  }
}

execute(cli);
