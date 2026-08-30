import mongoose from 'mongoose';
import { DocumentModel } from '../document/document.model';
import { SmartFolderType, SMART_FOLDER_MAPPING } from '../../config/smart-folders.config';
import { logger } from '../../utils/logger';

export class SmartFolderService {
  /**
   * Retrieve list of Smart Folders and their respective document counts
   */
  async getSmartFoldersList(userId: string) {
    const counts = await DocumentModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$smartFolder', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map(c => [c._id, c.count]));

    return [
      { id: SmartFolderType.EDUCATIONAL, name: SmartFolderType.EDUCATIONAL, icon: 'school', emoji: '🎓', count: countMap.get(SmartFolderType.EDUCATIONAL) || 0 },
      { id: SmartFolderType.GOVERNMENT, name: SmartFolderType.GOVERNMENT, icon: 'account_balance', emoji: '🏛️', count: countMap.get(SmartFolderType.GOVERNMENT) || 0 },
      { id: SmartFolderType.FEE_RECEIPTS, name: SmartFolderType.FEE_RECEIPTS, icon: 'receipt_long', emoji: '💰', count: countMap.get(SmartFolderType.FEE_RECEIPTS) || 0 },
      { id: SmartFolderType.FINANCIAL, name: SmartFolderType.FINANCIAL, icon: 'account_balance_wallet', emoji: '🏦', count: countMap.get(SmartFolderType.FINANCIAL) || 0 },
      { id: SmartFolderType.MEDICAL, name: SmartFolderType.MEDICAL, icon: 'medical_services', emoji: '🏥', count: countMap.get(SmartFolderType.MEDICAL) || 0 },
      { id: SmartFolderType.EMPLOYMENT_PERSONAL, name: SmartFolderType.EMPLOYMENT_PERSONAL, icon: 'work', emoji: '💼', count: countMap.get(SmartFolderType.EMPLOYMENT_PERSONAL) || 0 },
      { id: SmartFolderType.OTHER, name: SmartFolderType.OTHER, icon: 'description', emoji: '📄', count: countMap.get(SmartFolderType.OTHER) || 0 },
    ];
  }

  /**
   * Retrieve details of a virtual smart folder, including files
   */
  async getSmartFolderDetail(userId: string, folderName: string) {
    const documents = await DocumentModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      smartFolder: folderName
    }).sort({ createdAt: -1 });

    const folderDetailsMap: Record<string, { emoji: string; icon: string }> = {
      [SmartFolderType.EDUCATIONAL]:         { emoji: '🎓', icon: 'school' },
      [SmartFolderType.GOVERNMENT]:          { emoji: '🏛️', icon: 'account_balance' },
      [SmartFolderType.FEE_RECEIPTS]:        { emoji: '💰', icon: 'receipt_long' },
      [SmartFolderType.FINANCIAL]:           { emoji: '🏦', icon: 'account_balance_wallet' },
      [SmartFolderType.MEDICAL]:             { emoji: '🏥', icon: 'medical_services' },
      [SmartFolderType.EMPLOYMENT_PERSONAL]: { emoji: '💼', icon: 'work' },
      [SmartFolderType.OTHER]:               { emoji: '📄', icon: 'description' },
    };

    const details = folderDetailsMap[folderName] || { emoji: '📄', icon: 'description' };

    return {
      folderName,
      emoji: details.emoji,
      icon:  details.icon,
      documents
    };
  }

  /**
   * Scans and synchronizes all existing documents in the database to assign correct SmartFolder mappings.
   * Runs at application database connection startup.
   */
  async migrateExistingDocumentsToSmartFolders(): Promise<void> {
    logger.info('Running Smart Folder synchronization migration...');

    for (const [category, folder] of Object.entries(SMART_FOLDER_MAPPING)) {
      const res = await DocumentModel.updateMany(
        { category, smartFolder: { $ne: folder } },
        { $set: { smartFolder: folder } }
      );
      if (res.modifiedCount > 0) {
        logger.info(`Migrated ${res.modifiedCount} existing documents with category "${category}" to Smart Folder "${folder}".`);
      }
    }

    // Default any remaining unmapped documents to Other
    const otherRes = await DocumentModel.updateMany(
      { smartFolder: { $exists: false } },
      { $set: { smartFolder: SmartFolderType.OTHER } }
    );
    if (otherRes.modifiedCount > 0) {
      logger.info(`Migrated ${otherRes.modifiedCount} unmapped documents to Smart Folder "Other".`);
    }

    const total = await DocumentModel.countDocuments({});
    logger.info(`Smart Folder synchronization complete. Total validated documents: ${total}`);
  }
}

export const smartFolderService = new SmartFolderService();
