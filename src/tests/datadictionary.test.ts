import { getDMMF } from '@prisma/internals';
import DataDictionaryGenerator from '../generator/datadictionary';
import transformDMMF from '../generator/transformDMMF';

describe('DataDictionaryGenerator', () => {
  it('falls back to logical names when @@map and @map are absent', async () => {
    const datamodel = /* Prisma */ `
      model User {
        id    String @id @default(cuid())
        email String @unique
      }
    `;

    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );

    expect(dict.data.models).toHaveLength(1);
    const [user] = dict.data.models;
    expect(user.name).toBe('User');
    expect(user.fields.map((f) => f.name)).toEqual(['id', 'email']);
  });

  it('uses @@map as the physical table name', async () => {
    const datamodel = /* Prisma */ `
      model Post {
        id    String @id @default(cuid())
        title String
        @@map("posts")
      }
    `;

    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );

    const [post] = dict.data.models;
    expect(post.name).toBe('posts');

    const html = dict.toHTML();
    expect(html).toContain('id="dict-posts"');
    expect(html).not.toContain('id="dict-Post"'); // logical name should not appear as an anchor
  });

  it('uses @map as the physical column name', async () => {
    const datamodel = /* Prisma */ `
      model User {
        id        String   @id @default(cuid())
        createdAt DateTime @default(now()) @map("created_at")
      }
    `;

    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );

    const fields = dict.data.models[0].fields.map((f) => f.name);
    expect(fields).toEqual(['id', 'created_at']);

    const html = dict.toHTML();
    expect(html).toContain('id="dict-User-created_at"');
    expect(html).not.toContain('id="dict-User-createdAt"'); // logical field name should not appear as an anchor
  });

  it('excludes relation fields when includeRelationFields is false', async () => {
    const datamodel = /* Prisma */ `
      model User {
        id    String @id @default(cuid())
        posts Post[]
      }
      model Post {
        id     String @id @default(cuid())
        userId String
        user   User   @relation(fields: [userId], references: [id])
      }
    `;

    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: false })
    );

    const user = dict.data.models.find((m) => m.name === 'User')!;
    const post = dict.data.models.find((m) => m.name === 'Post')!;

    expect(user.fields.map((f) => f.name)).toEqual(['id']);
    expect(post.fields.map((f) => f.name)).toEqual(['id', 'userId']);
  });

  it('emits a top-level Data Dictionary heading anchor', async () => {
    const datamodel = /* Prisma */ `
      model User {
        id String @id @default(cuid())
      }
    `;
    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );
    expect(dict.toHTML()).toContain('id="data-dictionary"');
  });

  it('produces a standalone print-friendly HTML document', async () => {
    const datamodel = /* Prisma */ `
      model Post {
        id    String @id @default(cuid())
        title String
        @@map("posts")
      }
    `;
    const dmmf = await getDMMF({ datamodel });
    const dict = new DataDictionaryGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );
    const html = dict.toStandaloneHTML();
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>Data Dictionary</title>');
    expect(html).toContain('>posts<');
    // No sidebar / model details content should leak in:
    expect(html).not.toContain('sticky');
    expect(html).not.toContain('Model Details');
  });
});
