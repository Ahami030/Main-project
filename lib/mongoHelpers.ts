import mongoose from "mongoose";

export function clearDevModel(name: string): void {
  if (process.env.NODE_ENV === "development" && mongoose.models[name]) {
    delete mongoose.models[name];
  }
}

export async function generateDocumentNumber(
  modelName: string,
  fieldName: string,
  prefix: string
): Promise<string> {
  const model = mongoose.models[modelName];
  if (!model) throw new Error(`Model ${modelName} not registered`);
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  const last = await model
    .findOne({ [fieldName]: { $regex: `^${fullPrefix}` } }, { [fieldName]: 1 })
    .sort({ [fieldName]: -1 })
    .lean() as Record<string, string> | null;
  const lastNum = last?.[fieldName]
    ? parseInt(last[fieldName].replace(fullPrefix, ""), 10)
    : 0;
  return `${fullPrefix}${String(lastNum + 1).padStart(3, "0")}`;
}
