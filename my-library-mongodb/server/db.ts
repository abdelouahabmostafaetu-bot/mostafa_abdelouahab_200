import mongoose from "mongoose";

export async function initDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mylibrary";
  
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// Book schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: "" },
  coverUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  filePath: { type: String, default: "" },
  addedAt: { type: String, required: true },
});

// Auto-increment id field
bookSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

export const BookModel = mongoose.model("Book", bookSchema);
