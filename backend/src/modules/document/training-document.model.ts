import mongoose, { Schema, Document, Model } from 'mongoose';
import { DocumentCategory } from '../../common/enums';

export interface ITrainingDocument extends Document {
  originalFilePath:  string;
  ocrText:           string;
  aiCategory:        string;
  aiMetadata:        any;
  correctedMetadata: any;
  finalCategory:     DocumentCategory;
  version:           string;
  reviewerId:        mongoose.Types.ObjectId;
  createdAt:         Date;
  updatedAt:         Date;
}

const TrainingDocumentSchema = new Schema<ITrainingDocument>(
  {
    originalFilePath: { type: String, required: true },
    ocrText:          { type: String, default: '' },
    aiCategory:       { type: String, required: true },
    aiMetadata:       { type: Schema.Types.Mixed, default: {} },
    correctedMetadata:{ type: Schema.Types.Mixed, default: {} },
    finalCategory: {
      type:     String,
      enum:     Object.values(DocumentCategory),
      required: true,
    },
    version:          { type: String, default: '1.0' },
    reviewerId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const TrainingDocumentModel: Model<ITrainingDocument> =
  mongoose.model<ITrainingDocument>('TrainingDocument', TrainingDocumentSchema);
