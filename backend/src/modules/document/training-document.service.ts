import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { TrainingDocumentModel } from './training-document.model';
import { DocumentModel } from './document.model';
import { StorageFactory } from '../../common/storage.factory';
import { appConfig } from '../../config/app.config';
import { aiClient, AIProcessResult } from '../../common/ai-client.service';
import { logger } from '../../utils/logger';
import { DocumentCategory } from '../../common/enums';
import { SmartFolderType, SMART_FOLDER_MAPPING } from '../../config/smart-folders.config';

export interface SaveTrainingRecordDto {
  documentId?:       string;
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

    // 1. Save file to training folder via active storage provider
    const currentProvider = appConfig.storageProvider === 'b2' && appConfig.b2KeyId && appConfig.b2ApplicationKey ? 'b2' : 'local';
    const storage = StorageFactory.getService(currentProvider);
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
   * Saves the reviewed and corrected AI data in MongoDB AND updates the real Document.
   */
  async saveTrainingRecord(
    dto: SaveTrainingRecordDto,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    // 1. Create AI Training Model sample
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

    logger.info('Saved verified training document sample', {
      id: record._id,
      reviewerId: userId,
      finalCategory: dto.finalCategory,
    });

    // 2. Update the actual document in MongoDB so document details reflect user corrections
    try {
      const userObjId = new mongoose.Types.ObjectId(userId);
      let targetDoc = null;

      if (dto.documentId && mongoose.Types.ObjectId.isValid(dto.documentId)) {
        targetDoc = await DocumentModel.findOne({
          _id: new mongoose.Types.ObjectId(dto.documentId),
          userId: userObjId,
        });
      }

      if (!targetDoc && dto.originalFilePath) {
        targetDoc = await DocumentModel.findOne({
          storagePath: dto.originalFilePath,
          userId: userObjId,
        });
      }

      if (targetDoc) {
        const parsedIssueDate  = dto.correctedMetadata.issueDate ? new Date(dto.correctedMetadata.issueDate) : (targetDoc.metadata?.issueDate || null);
        const parsedExpiryDate = dto.correctedMetadata.expiryDate ? new Date(dto.correctedMetadata.expiryDate) : (targetDoc.metadata?.expiryDate || null);

        const updatedMetadata = {
          ...(targetDoc.metadata || {}),
          holderName:     dto.correctedMetadata.holderName     !== undefined ? dto.correctedMetadata.holderName : targetDoc.metadata?.holderName,
          organization:   dto.correctedMetadata.organization   !== undefined ? dto.correctedMetadata.organization : targetDoc.metadata?.organization,
          documentName:   dto.correctedMetadata.documentName   !== undefined ? dto.correctedMetadata.documentName : targetDoc.metadata?.documentName,
          documentNumber: dto.correctedMetadata.documentNumber !== undefined ? dto.correctedMetadata.documentNumber : targetDoc.metadata?.documentNumber,
          issueDate:      parsedIssueDate,
          expiryDate:     parsedExpiryDate,
        };

        const targetFolder = SMART_FOLDER_MAPPING[dto.finalCategory] || SmartFolderType.OTHER;

        const updateSet: any = {
          category:                  dto.finalCategory,
          smartFolder:               targetFolder,
          'metadata.holderName':     dto.correctedMetadata.holderName     !== undefined ? dto.correctedMetadata.holderName : null,
          'metadata.organization':   dto.correctedMetadata.organization   !== undefined ? dto.correctedMetadata.organization : null,
          'metadata.documentName':   dto.correctedMetadata.documentName   !== undefined ? dto.correctedMetadata.documentName : null,
          'metadata.documentNumber': dto.correctedMetadata.documentNumber !== undefined ? dto.correctedMetadata.documentNumber : null,
          'metadata.issueDate':      parsedIssueDate,
          'metadata.expiryDate':     parsedExpiryDate,
          expiryDate:                parsedExpiryDate,
          ocrConfidence:             1.0, // Human verified and corrected
        };

        await DocumentModel.updateOne(
          { _id: targetDoc._id },
          { $set: updateSet },
        );

        logger.info(`✅ Successfully updated Document ${targetDoc._id} with user corrected metadata`, {
          docId: targetDoc._id,
          category: dto.finalCategory,
          smartFolder: targetFolder,
          holderName: dto.correctedMetadata.holderName,
          documentName: dto.correctedMetadata.documentName,
        });
      }
    } catch (docUpdateErr) {
      logger.error('Failed to update live Document record during training review save', docUpdateErr);
    }

    return { success: true, id: (record._id as mongoose.Types.ObjectId).toString() };
  }
}

export const trainingDocumentService = new TrainingDocumentService();
