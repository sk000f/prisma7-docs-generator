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
    expect(user.logicalName).toBe('User');
    expect(user.physicalName).toBe('User');
    expect(user.hasPhysicalName).toBe(false);
    expect(user.fields.map((f) => ({ l: f.logicalName, p: f.physicalName }))).toEqual([
      { l: 'id', p: 'id' },
      { l: 'email', p: 'email' },
    ]);
  });

  it('surfaces @@map as a distinct physical table name', async () => {
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
    expect(post.logicalName).toBe('Post');
    expect(post.physicalName).toBe('posts');
    expect(post.hasPhysicalName).toBe(true);

    // The HTML output should surface both names next to the heading.
    const html = dict.toHTML();
    expect(html).toContain('id="dict-Post"');
    expect(html).toContain('posts');
  });

  it('surfaces @map as a distinct physical column name', async () => {
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

    const createdAt = dict.data.models[0].fields.find(
      (f) => f.logicalName === 'createdAt'
    );
    expect(createdAt).toBeDefined();
    expect(createdAt!.physicalName).toBe('created_at');

    const html = dict.toHTML();
    expect(html).toContain('id="dict-User-createdAt"');
    expect(html).toContain('created_at');
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

    const user = dict.data.models.find((m) => m.logicalName === 'User')!;
    const post = dict.data.models.find((m) => m.logicalName === 'Post')!;

    expect(user.fields.map((f) => f.logicalName)).toEqual(['id']);
    expect(post.fields.map((f) => f.logicalName)).toEqual(['id', 'userId']);
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
});
