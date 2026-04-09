import type { DMMF as ExternalDMMF } from '@prisma/generator-helper';

export function lowerCase(name: string): string {
  return name.substring(0, 1).toLowerCase() + name.substring(1);
}

export interface DMMFMapping {
  model: string;
  findUnique?: string | null;
  findFirst?: string | null;
  findMany?: string | null;
  create?: string | null;
  update?: string | null;
  updateMany?: string | null;
  upsert?: string | null;
  delete?: string | null;
  deleteMany?: string | null;
}

export type DMMFDocument = Omit<ExternalDMMF.Document, 'mappings'> & {
  mappings: DMMFMapping[];
};

type OptionsForTransformDMMF = {
  includeRelationFields: boolean;
};

export default function transformDMMF(
  dmmf: ExternalDMMF.Document,
  { includeRelationFields }: OptionsForTransformDMMF
): DMMFDocument {
  // DMMF types are ReadonlyDeep in Prisma 7, so we must build new objects
  // instead of mutating in place.
  const datamodel: ExternalDMMF.Datamodel = includeRelationFields
    ? dmmf.datamodel
    : {
        ...dmmf.datamodel,
        models: dmmf.datamodel.models.map((model) => ({
          ...model,
          fields: model.fields.filter((field) => !field.relationName),
        })),
      };

  return {
    ...dmmf,
    datamodel,
    mappings: getMappings(dmmf.mappings, datamodel),
  };
}

function getMappings(
  mappings: ExternalDMMF.Mappings,
  datamodel: ExternalDMMF.Datamodel
): DMMFMapping[] {
  return mappings.modelOperations
    .filter((mapping) => {
      const model = datamodel.models.find((m) => m.name === mapping.model);
      if (!model) {
        throw new Error(`Mapping without model ${mapping.model}`);
      }
      return model.fields.some((f) => f.kind !== 'object');
    })
    .map((mapping) => ({
      model: mapping.model,
      findUnique: mapping.findUnique,
      findFirst: mapping.findFirst,
      findMany: mapping.findMany,
      create: mapping.create,
      update: mapping.update,
      updateMany: mapping.updateMany,
      upsert: mapping.upsert,
      delete: mapping.delete,
      deleteMany: mapping.deleteMany,
    }));
}
