import { Generatable } from './helpers';
import { DMMF } from '@prisma/generator-helper';
import { DMMFDocument } from './transformDMMF';

type TOCStructure = {
  dictionary: string[]; // physical table names
  models: string[]; // Prisma model names
};

export default class TOCGenerator implements Generatable<TOCStructure> {
  data: TOCStructure;

  constructor(d: DMMFDocument) {
    this.data = this.getData(d);
  }

  getDictionaryLinkHTML(tableName: string): string {
    return `<li class="mb-1"><a href="#dict-${tableName}" class="text-gray-700 dark:text-white">${tableName}</a></li>`;
  }

  getModelLinkHTML(modelName: string): string {
    return `<li class="mb-1"><a href="#model-${modelName}" class="text-gray-700 dark:text-white">${modelName}</a></li>`;
  }

  toHTML() {
    return `
        <div>
          <h5 class="mb-2 font-bold dark:text-white"><a href="#data-dictionary">Data Dictionary</a></h5>
          <ul class="mb-2 ml-1 pl-3 border-l-2 border-gray-400">
            ${this.data.dictionary.map((name) => this.getDictionaryLinkHTML(name)).join('')}
          </ul>
          <h5 class="mt-8 mb-2 font-bold dark:text-white"><a href="#models">Model Details</a></h5>
          <ul class="mb-2 ml-1 pl-3 border-l-2 border-gray-400">
            ${this.data.models.map((name) => this.getModelLinkHTML(name)).join('')}
          </ul>
        </div>
    `;
  }

  getDictionary(dmmfModel: readonly DMMF.Model[]): string[] {
    return dmmfModel.map((model) => model.dbName ?? model.name);
  }

  getModels(dmmfModel: readonly DMMF.Model[]): string[] {
    return dmmfModel.map((model) => model.name);
  }

  getData(d: DMMFDocument) {
    return {
      dictionary: this.getDictionary(d.datamodel.models),
      models: this.getModels(d.datamodel.models),
    };
  }
}
