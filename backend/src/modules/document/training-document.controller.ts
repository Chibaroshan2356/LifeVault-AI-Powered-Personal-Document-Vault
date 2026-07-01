import { Request, Response, NextFunction } from 'express';
import { trainingDocumentService } from './training-document.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { validateUploadedFile } from '../../middleware/upload.middleware';
import { HttpError } from '../../middleware/error.middleware';

export const uploadTrainingDoc = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    validateUploadedFile(req);

    const userId = req.user!.sub;
    const result = await trainingDocumentService.uploadForTraining(req.file!, userId);

    res.status(200).json(
      ApiResponse.success('Document uploaded and analyzed successfully', result),
    );
  } catch (err) {
    next(err);
  }
};

export const saveTrainingDoc = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { originalFilePath, aiCategory, finalCategory } = req.body;

    if (!originalFilePath || !aiCategory || !finalCategory) {
      throw new HttpError(400, 'Missing required fields: originalFilePath, aiCategory, finalCategory');
    }

    const userId = req.user!.sub;
    const result = await trainingDocumentService.saveTrainingRecord(req.body, userId);

    res.status(201).json(
      ApiResponse.success('AI training center corrections saved successfully', result),
    );
  } catch (err) {
    next(err);
  }
};
