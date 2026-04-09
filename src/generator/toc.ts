import { Generatable } from './helpers';
import { DMMF } from '@prisma/generator-helper';
import { DMMFDocument, DMMFMapping } from './transformDMMF';

type TOCStructure = {
  dictionary: TOCDictionaryModel[];
  models: TOCModel[];
  types: TOCTypes;
};

type TOCDictionaryModel = {
  name: string;
  fields: string[];
};

type TOCModel = {
  name: string;
  fields: string[];
  operations: string[];
};

type TOCTypes = {
  inputTypes: string[];
  outputTypes: string[];
};

export default class TOCGenerator implements Generatable<TOCStructure> {
  data: TOCStructure;

  constructor(d: DMMFDocument) {
    this.data = this.getData(d);
  }

  getTOCSubHeaderHTML(name: string): string {
    return `
    <div class="font-semibold text-gray-700 dark:text-white">
      <a href="#model-${name}">${name}</a>
    </div>
   `;
  }

  getSubFieldHTML(identifier: string, root: string, field: string): string {
    return `<li><a href="#${identifier}-${root}-${field}" class="dark:text-white">${field}</a></li>`;
  }

  getDictionaryEntryHTML(name: string): string {
    return `
    <div class="font-semibold text-gray-700 dark:text-white">
      <a href="#dict-${name}">${name}</a>
    </div>
   `;
  }

  toHTML() {
    return `
        <div>
          <h5 class="mb-2 font-bold dark:text-white"><a href="#data-dictionary">Data Dictionary</a></h5>
          <ul class="mb-2 ml-1">
              ${this.data.dictionary
                .map(
                  (model) => `
            <li class="mb-4">
                ${this.getDictionaryEntryHTML(model.name)}
                <ul class="pl-3 mt-1 ml-3 border-l-2 border-gray-400 dark:text-white">
                ${model.fields
                  .map((field) =>
                    this.getSubFieldHTML('dict', model.name, field)
                  )
                  .join('')}
                </ul>
            </li>
              `
                )
                .join('')}
          </ul>
          <h5 class="mt-12 mb-2 font-bold dark:text-white"><a href="#models">Model Details</a></h5>
          <ul class="mb-2 ml-1">
              ${this.data.models
                .map(
                  (model) => `
            <li class="mb-4">
                ${this.getTOCSubHeaderHTML(model.name)}
                  <div class="mt-1 ml-2">
                    <div class="mb-1 font-medium text-gray-600 dark:text-white"><a href="#model-${
                      model.name
                    }-fields" class="dark:text-gray-200">Fields</a></div>
                      <ul class="pl-3 ml-1 border-l-2 border-gray-400 dark:text-white">
                      ${model.fields
                        .map((field) =>
                          this.getSubFieldHTML('model', model.name, field)
                        )
                        .join('')}
                      </ul>
                  </div>
                  <div class="mt-2 ml-2">
                    <div class="mb-1 font-medium text-gray-600 dark:text-white"><a href="#model-${
                      model.name
                    }-operations" class="dark:text-gray-200">Operations</a></div>
                    <ul class="pl-3 ml-1 border-l-2 border-gray-400 dark:text-white">
                    ${model.operations
                      .map((op) =>
                        this.getSubFieldHTML('model', model.name, op)
                      )
                      .join('')}
                    </ul>
                  </div>
            </li>
              `
                )
                .join('')}
            </ul>
          <h5 class="mt-12 mb-2 font-bold dark:text-white"><a href="#types">Types</a></h5>
          <ul class="mb-2 ml-1">
            <li class="mb-4">
              <div class="font-semibold text-gray-700 dark:text-white">
                <a href="#input-types">Input Types</a>
              </div>
              <ul class="pl-3 ml-1 border-l-2 border-gray-400 dark:text-white">
              ${this.data.types.inputTypes
                .map((inputType) =>
                  this.getSubFieldHTML('type', 'inputType', inputType)
                )
                .join('')}
              </ul>
            </li>
            <li class="mb-4">
              <div class="font-semibold text-gray-700 dark:text-white">
                <a href="#output-types">Output Types</a>
              </div>
              <ul class="pl-3 ml-1 border-l-2 border-gray-400 dark:text-white">
              ${this.data.types.outputTypes
                .map((outputType) =>
                  this.getSubFieldHTML('type', 'outputType', outputType)
                )
                .join('')}
              </ul>
            </li>
          </ul>
        </div>
    `;
  }

  getModels(dmmfModel: readonly DMMF.Model[], mappings: DMMFMapping[]): TOCModel[] {
    return dmmfModel.map((model) => {
      return {
        name: model.name,
        fields: model.fields.map((field) => field.name),
        operations: Object.keys(
          mappings.find((x) => x.model === model.name) ?? {}
        ).filter((op) => op !== 'model'),
      };
    });
  }

  getTypes(dmmfSchema: DMMF.Schema): TOCTypes {
    return {
      inputTypes: (dmmfSchema.inputObjectTypes.prisma ?? []).map(
        (inputType) => inputType.name
      ),
      outputTypes: [
        ...dmmfSchema.outputObjectTypes.model.map((ot) => ot.name),
        ...dmmfSchema.outputObjectTypes.prisma
          .map((outputType) => outputType.name)
          .filter((ot) => ot !== 'Query' && ot !== 'Mutation'),
      ],
    };
  }

  getDictionary(
    dmmfModel: readonly DMMF.Model[]
  ): TOCDictionaryModel[] {
    return dmmfModel.map((model) => ({
      name: model.name,
      fields: model.fields.map((field) => field.name),
    }));
  }

  getData(d: DMMFDocument) {
    return {
      dictionary: this.getDictionary(d.datamodel.models),
      models: this.getModels(d.datamodel.models, d.mappings),
      types: this.getTypes(d.schema),
    };
  }
}
