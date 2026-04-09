import { generatorHandler } from '@prisma/generator-helper';
import HTMLPrinter from './printer';
import DataDictionaryGenerator from './generator/datadictionary';
import transformDMMF from './generator/transformDMMF';
import * as fs from 'fs';
import * as path from 'path';

async function writeDataDictionaryPdf(
  standaloneHtml: string,
  outPath: string
): Promise<void> {
  // Puppeteer is loaded lazily so that a missing browser install only breaks
  // the PDF step instead of the entire generator.
  let puppeteer: typeof import('puppeteer');
  try {
    puppeteer = await import('puppeteer');
  } catch (e) {
    console.warn(
      'prisma7-docs-generator: puppeteer is not installed; skipping data-dictionary.pdf generation.'
    );
    return;
  }

  let browser: import('puppeteer').Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(standaloneHtml, { waitUntil: 'load' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });
  } catch (e) {
    console.warn(
      'prisma7-docs-generator: failed to generate data-dictionary.pdf:',
      e instanceof Error ? e.message : e
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

generatorHandler({
  onManifest() {
    return {
      defaultOutput: './docs',
      prettyName: 'Prisma Docs Generator',
    };
  },
  async onGenerate(options) {
    const { config } = options.generator;
    const includeRelationFields = config.includeRelationFields === 'false' ? false : true;

    const dmmf = transformDMMF(options.dmmf, {
      includeRelationFields,
    });
    const html = new HTMLPrinter(dmmf);
    const dictionary = new DataDictionaryGenerator(dmmf);

    const output = options.generator.output?.value;

    if (!output) {
      throw new Error('No output was specified for Prisma Docs Generator');
    }

    const styleFile = await fs.promises.readFile(
      path.join(__dirname, 'styles', 'main.css')
    );
    try {
      await fs.promises.mkdir(output, { recursive: true });
      await fs.promises.mkdir(path.join(output, 'styles'), { recursive: true });
      await fs.promises.writeFile(
        path.join(output, 'index.html'),
        html.toHTML()
      );
      await fs.promises.writeFile(
        path.join(output, 'styles', 'main.css'),
        styleFile
      );
    } catch (e) {
      console.error('Error: unable to write files for Prisma Docs Generator');
      throw e;
    }

    // PDF generation is best-effort: any failure is logged but does not abort
    // the generator (HTML output is already on disk at this point).
    await writeDataDictionaryPdf(
      dictionary.toStandaloneHTML(),
      path.join(output, 'data-dictionary.pdf')
    );
  },
});
