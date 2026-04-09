import { DMMF } from '@prisma/generator-helper';
import { Generatable, isScalarType } from './helpers';
import { DMMFDocument } from './transformDMMF';

type DictionaryField = {
  logicalName: string;
  physicalName: string;
  type: string;
  bareTypeName: string;
  required: boolean;
  documentation?: string;
};

type DictionaryModel = {
  logicalName: string;
  physicalName: string;
  hasPhysicalName: boolean;
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
      models: d.datamodel.models.map((model) => {
        const physicalName = model.dbName ?? model.name;
        return {
          logicalName: model.name,
          physicalName,
          hasPhysicalName: physicalName !== model.name,
          documentation: model.documentation,
          fields: model.fields.map((field) => ({
            logicalName: field.name,
            physicalName: field.dbName ?? field.name,
            type: getDisplayType(field),
            bareTypeName: field.type,
            required: field.isRequired,
            documentation: field.documentation,
          })),
        };
      }),
    };
  }

  getModelHeadingHTML(model: DictionaryModel): string {
    const suffix = model.hasPhysicalName
      ? ` <span class="text-base text-gray-500 dark:text-gray-400">&rarr; ${model.physicalName}</span>`
      : '';
    return `<h2 class="mt-8 mb-2 text-2xl text-black dark:text-white" id="dict-${model.logicalName}">${model.logicalName}${suffix}</h2>`;
  }

  getFieldRowHTML(field: DictionaryField, modelName: string): string {
    const typeCell = isScalarType(field.bareTypeName)
      ? field.type
      : `<a href="#type-outputType-${field.bareTypeName}" class="dark:text-white">${field.type}</a>`;
    return `
      <tr id="dict-${modelName}-${field.logicalName}">
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.logicalName}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.physicalName}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${typeCell}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.required ? '<strong>Yes</strong>' : 'No'}</td>
        <td class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">${field.documentation ?? '-'}</td>
      </tr>
    `;
  }

  getModelTableHTML(model: DictionaryModel): string {
    return `
      <div class="px-4 mb-6">
        ${this.getModelHeadingHTML(model)}
        ${
          model.documentation
            ? `<div class="mb-2 text-black dark:text-white">${model.documentation}</div>`
            : ''
        }
        <div class="px-2 mb-4">
          <table class="table-auto">
            <thead>
              <tr>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Field</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Column</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Type</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Required</th>
                <th class="px-4 py-2 border text-black dark:text-white dark:border-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              ${model.fields
                .map((f) => this.getFieldRowHTML(f, model.logicalName))
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  toHTML(): string {
    return `
      <div class="mb-12">
        <h1 class="text-3xl text-gray-800 dark:text-white" id="data-dictionary">Data Dictionary</h1>
        <p class="px-4 mt-2 mb-4 text-gray-700 dark:text-gray-300">
          Reference of every model and field with both Prisma (logical) and database (physical) names.
        </p>
        ${this.data.models.map((m) => this.getModelTableHTML(m)).join('')}
      </div>
    `;
  }
}
