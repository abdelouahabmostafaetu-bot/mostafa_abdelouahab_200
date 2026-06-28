import mongoose, { type Model } from 'mongoose';

// A custom AI model added by the admin from the Admin AI UI.
// Contains NO secret key — only the NAME of the env var that holds the key.
export type AiModelConfigDocument = {
  modelId: string;
  label: string;
  provider: string;
  model: string;
  envKey: string;
  baseUrl: string;
  vision: boolean;
  reasoning: boolean;
  createdAt: string;
  updatedAt: string;
};

const aiModelConfigSchema = new mongoose.Schema<AiModelConfigDocument>({
  modelId: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  provider: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  envKey: { type: String, required: true, trim: true },
  baseUrl: { type: String, default: '' },
  vision: { type: Boolean, default: false },
  reasoning: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

aiModelConfigSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id ?? '');
    delete ret._id;
    return ret;
  },
});

const AiModelConfigModel =
  (mongoose.models.AiModelConfig as Model<AiModelConfigDocument> | undefined) ??
  mongoose.model<AiModelConfigDocument>('AiModelConfig', aiModelConfigSchema);

export default AiModelConfigModel;
