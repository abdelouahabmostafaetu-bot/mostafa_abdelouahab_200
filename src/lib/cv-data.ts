import { connectToDatabase } from "@/lib/mongodb";
import { CVDataModel, type CVDataDocument } from "@/lib/models/cv-data";

const DEFAULT_CV_DATA: CVDataDocument = {
  researchInterests: ["Real Analysis", "Algebra"],
  education: [
    {
      degree: "Master's in Fundamental Mathematics",
      institution:
        "Centre Universitaire Abdelhafid Boussouf — University of Mila",
      location: "Mila, Algeria",
      period: "2023 — Present",
    },
    {
      degree: "Bachelor's in Mathematics",
      institution:
        "Centre Universitaire Abdelhafid Boussouf — University of Mila",
      location: "Mila, Algeria",
      period: "2020 — 2023",
    },
  ],
};

export async function getCVData(): Promise<CVDataDocument> {
  try {
    await connectToDatabase();

    let doc = await CVDataModel.findOne();

    if (!doc) {
      doc = await CVDataModel.create(DEFAULT_CV_DATA);
    }

    const json = doc.toJSON() as Record<string, unknown>;

    return {
      researchInterests: Array.isArray(json.researchInterests)
        ? (json.researchInterests as string[])
        : DEFAULT_CV_DATA.researchInterests,
      education: Array.isArray(json.education)
        ? (json.education as CVDataDocument["education"])
        : DEFAULT_CV_DATA.education,
    };
  } catch {
    return DEFAULT_CV_DATA;
  }
}
