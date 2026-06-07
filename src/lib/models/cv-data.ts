import mongoose, { type Model } from 'mongoose';

export type EducationEntry = {
  degree: string;
  institution: string;
  location: string;
  period: string;
};

export type CVDataDocument = {
  researchInterests: string[];
  education: EducationEntry[];
};

const educationEntrySchema = new mongoose.Schema<EducationEntry>(
  {
    degree: { type: String, default: '', trim: true },
    institution: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    period: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const cvDataSchema = new mongoose.Schema<CVDataDocument>(
  {
    researchInterests: {
      type: [String],
      default: ['Real Analysis', 'Algebra'],
    },
    education: {
      type: [educationEntrySchema],
      default: [
        {
          degree: "Master's in Fundamental Mathematics",
          institution: 'Centre Universitaire Abdelhafid Boussouf — University of Mila',
          location: 'Mila, Algeria',
          period: '2023 — Present',
        },
        {
          degree: "Bachelor's in Mathematics",
          institution: 'Centre Universitaire Abdelhafid Boussouf — University of Mila',
          location: 'Mila, Algeria',
          period: '2020 — 2023',
        },
      ],
    },
  },
  { timestamps: true },
);

cvDataSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export const CVDataModel =
  (mongoose.models.CVData as Model<CVDataDocument> | undefined) ??
  mongoose.model<CVDataDocument>('CVData', cvDataSchema);
