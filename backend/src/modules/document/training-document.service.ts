import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { TrainingDocumentModel } from './training-document.model';
import { LocalStorageService } from '../../common/local-storage.service';
import { aiClient, AIProcessResult } from '../../common/ai-client.service';
import { logger } from '../../utils/logger';
import { DocumentCategory } from '../../common/enums';

const storage = new LocalStorageService();

export interface SaveTrainingRecordDto {
  originalFilePath:  string;
  ocrText:           string;
  aiCategory:        string;
  aiMetadata:        any;
  correctedMetadata: any;
  finalCategory:     DocumentCategory;
  version?:          string;
}

class TrainingDocumentService {
  /**
   * Saves the uploaded file to training storage path and calls the AI service synchronously.
   */
  async uploadForTraining(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ storagePath: string; aiResult: AIProcessResult }> {
    const ext         = path.extname(file.originalname).toLowerCase();
    const storedName  = `${uuidv4()}${ext}`;
    const year        = new Date().getFullYear().toString();
    const relativeDir = `training/${year}`;
    const storagePath = `${relativeDir}/${storedName}`;

    // 1. Save file to training folder
    await storage.save(file.buffer, storedName, file.mimetype, relativeDir);

    // 2. Call FastAPI AI pipeline synchronously using a temporary doc ID
    const tempId = new mongoose.Types.ObjectId().toString();
    const aiResult = await aiClient.processDocument(
      file.buffer,
      file.originalname,
      file.mimetype,
      tempId,
    );

    logger.info('Training document processed synchronously by AI service', {
      storagePath,
      userId,
      success: aiResult.success,
    });

    return { storagePath, aiResult };
  }

  /**
   * Saves the reviewed and corrected AI data in MongoDB.
   */
  async saveTrainingRecord(
    dto: SaveTrainingRecordDto,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const record = await TrainingDocumentModel.create({
      originalFilePath:  dto.originalFilePath,
      ocrText:           dto.ocrText,
      aiCategory:        dto.aiCategory,
      aiMetadata:        dto.aiMetadata,
      correctedMetadata: dto.correctedMetadata,
      finalCategory:     dto.finalCategory,
      version:           dto.version || '1.0',
      reviewerId:        new mongoose.Types.ObjectId(userId),
    });

    logger.info('Saved verified training document', {
      id: record._id,
      reviewerId: userId,
      finalCategory: dto.finalCategory,
    });

    return { success: true, id: (record._id as mongoose.Types.ObjectId).toString() };
  }
}

export const trainingDocumentService = new TrainingDocumentService();
