import { trainingDocumentService } from '../../src/modules/document/training-document.service';
import { TrainingDocumentModel } from '../../src/modules/document/training-document.model';
import { LocalStorageService } from '../../src/common/local-storage.service';
import { aiClient } from '../../src/common/ai-client.service';
import { DocumentCategory } from '../../src/common/enums';

jest.mock('../../src/modules/document/training-document.model');
jest.mock('../../src/common/local-storage.service');
jest.mock('../../src/common/ai-client.service');

const REVIEWER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const RECORD_ID   = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const mockFile = {
  originalname: 'student_id.png',
  mimetype:     'image/png',
  size:         51200,
  buffer:       Buffer.from('fake image content'),
} as Express.Multer.File;

const mockAIResult = {
  success:                   true,
  document_id:               'some-temp-id',
  ocr_text:                  'KONGU ENGINEERING COLLEGE student id',
  ocr_confidence:            0.9,
  document_type:             'Identity Card',
  classification_confidence: 0.95,
  metadata: {
    holderName: 'Chiba Roshan A',
    organization: 'Kongu Engineering College',
  },
  processing_time: 0.25,
  version_info: {
    ocr_engine: 'EasyOCR',
    ocr_version: '1.7.2',
    classification_model: 'RuleBased',
    classification_version: '1.0',
  },
};

describe('TrainingDocumentService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('uploadForTraining', () => {
    it('saves training doc to disk, calls AI service, returns results', async () => {
      (LocalStorageService.prototype.save as jest.Mock).mockResolvedValue(undefined);
      (aiClient.processDocument as jest.Mock).mockResolvedValue(mockAIResult);

      const result = await trainingDocumentService.uploadForTraining(mockFile, REVIEWER_ID);

      expect(result.storagePath).toContain('training/');
      expect(result.storagePath).toContain('.png');
      expect(result.aiResult).toEqual(mockAIResult);
      expect(LocalStorageService.prototype.save).toHaveBeenCalledTimes(1);
      expect(aiClient.processDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveTrainingRecord', () => {
    it('creates training document in DB and returns success', async () => {
      (TrainingDocumentModel.create as jest.Mock).mockResolvedValue({ _id: RECORD_ID });

      const dto = {
        originalFilePath: 'training/2026/uuid.png',
        ocrText: 'KONGU ENGINEERING COLLEGE student id',
        aiCategory: 'Other',
        aiMetadata: {},
        correctedMetadata: { holderName: 'Chiba Roshan A', organization: 'Kongu Engineering College' },
        finalCategory: DocumentCategory.IDENTITY_CARD,
        version: '1.0',
      };

      const result = await trainingDocumentService.saveTrainingRecord(dto, REVIEWER_ID);

      expect(result.success).toBe(true);
      expect(result.id).toBe(RECORD_ID);
      expect(TrainingDocumentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilePath: dto.originalFilePath,
          finalCategory: dto.finalCategory,
          reviewerId: expect.any(Object),
        }),
      );
    });
  });
});
