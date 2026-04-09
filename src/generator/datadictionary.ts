import { DMMF } from '@prisma/generator-helper';
import { Generatable } from './helpers';
import { DMMFDocument } from './transformDMMF';

type DictionaryField = {
  name: string; // physical column name (falls back to logical if no @map)
  type: string;
  required: boolean;
  documentation?: string;
};

type DictionaryModel = {
  name: string; // physical table name (falls back to logical if no @@map)
  documentation?: string;
  fields: DictionaryField[];
};

type DataDictionaryStructure = {
  models: DictionaryModel[];
};

function getDisplayType(field: DMMF.Field): string {
  let name = field.type;
  if (!field.isRequired && !field.isList) name += '?';
  if (field.isList) name += '[]';
  return name;
}

export default class DataDictionaryGenerator
  implements Generatable<DataDictionaryStructure>
{
  data: DataDictionaryStructure;

  constructor(d: DMMFDocument) {
    this.data = this.getData(d);
  }

  getData(d: DMMFDocument): DataDictionaryStructure {
    return {
      models: d.datamodel.models.map((model) => ({
        name: model.dbName ?? model.name,
        documentation: model.documentation,
        fields: model.fields.map((field) => ({
          name: field.dbName ?? field.name,
          type: getDisplayType(field),
          required: field.isRequired,
          documentation: field.documentation,
        })),
      })),
    };
  }

  getFieldRowHTML(field: DictionaryField, tableName: string): string {
    return `
      <tr id="dict-${tableName}-${field.name}">
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.name}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.type}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.required ? '<strong>Yes</strong>' : 'No'}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.documentation ?? '-'}</td>
      </tr>
    `;
  }

  getModelTableHTML(model: DictionaryModel): string {
    return `
      <div class="px-4 mb-6">
        <h2 class="mt-8 mb-2 text-2xl text-black dark:text-white" id="dict-${model.name}">${model.name}</h2>
        ${
          model.documentation
            ? `<div class="mb-2 text-black dark:text-white">${model.documentation}</div>`
            : ''
        }
        <div class="px-2 mb-4">
          <table class="table-auto">
            <thead>
              <tr>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Column</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Type</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Required</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              ${model.fields.map((f) => this.getFieldRowHTML(f, model.name)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Returns the HTML body for the Data Dictionary section, intended to be
   * embedded inside the main documentation page.
   */
  toHTML(): string {
    return `
      <div class="mb-12">
        <h1 class="text-3xl text-gray-800 dark:text-white" id="data-dictionary">Data Dictionary</h1>
        <p class="px-4 mt-2 mb-4 text-gray-700 dark:text-gray-300">
          Database reference of every table and column.
        </p>
        ${this.data.models.map((m) => this.getModelTableHTML(m)).join('')}
      </div>
    `;
  }

  /**
   * Returns a standalone, print-friendly HTML document containing only the
   * Data Dictionary. This is the source fed to Puppeteer for PDF generation.
   */
  toStandaloneHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Data Dictionary</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #111;
        margin: 0;
        padding: 2rem 2.5rem;
        background: #fff;
        font-size: 11pt;
        line-height: 1.4;
      }
      h1 {
        font-size: 22pt;
        margin: 0 0 0.25rem 0;
        border-bottom: 2px solid #333;
        padding-bottom: 0.5rem;
      }
      h2 {
        font-size: 14pt;
        margin: 1.6rem 0 0.4rem 0;
        page-break-after: avoid;
      }
      .subtitle {
        color: #555;
        margin: 0 0 1.5rem 0;
        font-size: 10pt;
      }
      .doc {
        color: #444;
        margin: 0 0 0.5rem 0;
        font-style: italic;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
        margin-bottom: 0.5rem;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td {
        border: 1px solid #999;
        padding: 4px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #eee;
        font-weight: 600;
      }
      .model { page-break-inside: avoid; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <h1>Data Dictionary</h1>
    <p class="subtitle">Database reference of every table and column. Generated by prisma7-docs-generator.</p>
    ${this.data.models.map((m) => this.getStandaloneModelHTML(m)).join('')}
  </body>
</html>`;
  }

  private getStandaloneModelHTML(model: DictionaryModel): string {
    const docLine = model.documentation
      ? `<p class="doc">${escapeHtml(model.documentation)}</p>`
      : '';
    const rows = model.fields
      .map(
        (f) => `
        <tr>
          <td>${escapeHtml(f.name)}</td>
          <td>${escapeHtml(f.type)}</td>
          <td>${f.required ? 'Yes' : 'No'}</td>
          <td>${f.documentation ? escapeHtml(f.documentation) : ''}</td>
        </tr>`
      )
      .join('');
    return `
      <section class="model">
        <h2>${escapeHtml(model.name)}</h2>
        ${docLine}
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
