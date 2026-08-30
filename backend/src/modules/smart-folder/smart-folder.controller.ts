import { Request, Response } from 'express';
import { smartFolderService } from './smart-folder.service';
import { logger } from '../../utils/logger';

/**
 * Get list of all Smart Folders with document counters
 */
export async function listSmartFolders(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized access' });
    return;
  }

  try {
    const data = await smartFolderService.getSmartFoldersList(userId);
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    logger.error('API Error in listSmartFolders:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
}

/**
 * Get specific Smart Folder detail, including its list of files
 */
export async function getSmartFolder(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  const { name: folderName } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized access' });
    return;
  }
  if (!folderName) {
    res.status(400).json({ success: false, message: 'Folder name parameter is required' });
    return;
  }

  try {
    const data = await smartFolderService.getSmartFolderDetail(userId, folderName);
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    logger.error('API Error in getSmartFolder:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
}
