import { getDMMF } from '@prisma/internals';
import TOCGenerator from '../generator/toc';
import transformDMMF from '../generator/transformDMMF';

const datamodel = /* Prisma */ `
  model Post {
    id   String @id @default(cuid())
    name String
    @@map("posts")
  }

  model User {
    userId    String @id @default(cuid())
    something String
  }
`;

describe('TOC', () => {
  it('lists physical table names under Data Dictionary and logical model names under Model Details', async () => {
    const dmmf = await getDMMF({ datamodel });
    const toc = new TOCGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );

    // Data structure
    expect(toc.data.dictionary).toEqual(['posts', 'User']);
    expect(toc.data.models).toEqual(['Post', 'User']);

    // Rendered HTML
    const html = toc.toHTML();
    expect(html).toContain('href="#data-dictionary"');
    expect(html).toContain('href="#dict-posts"');
    expect(html).toContain('href="#dict-User"');
    expect(html).toContain('href="#models"');
    expect(html).toContain('href="#model-Post"');
    expect(html).toContain('href="#model-User"');

    // No fields, operations, or Types sublists should appear anymore
    expect(html).not.toContain('#model-Post-id');
    expect(html).not.toContain('#model-Post-findUnique');
    expect(html).not.toContain('#types');
    expect(html).not.toContain('Input Types');
    expect(html).not.toContain('Output Types');
  });

  it('renders each top-level heading label', async () => {
    const dmmf = await getDMMF({ datamodel });
    const toc = new TOCGenerator(
      transformDMMF(dmmf, { includeRelationFields: true })
    );
    const html = toc.toHTML();
    expect(html).toContain('>Data Dictionary<');
    expect(html).toContain('>Model Details<');
  });
});
