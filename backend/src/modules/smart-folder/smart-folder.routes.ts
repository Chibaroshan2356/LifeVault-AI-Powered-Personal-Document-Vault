import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { listSmartFolders, getSmartFolder } from './smart-folder.controller';

export const smartFolderRouter = Router();

// Require user authentication for all Smart Folders API actions
smartFolderRouter.use(authenticate);

smartFolderRouter.get('/',      listSmartFolders);
smartFolderRouter.get('/:name', getSmartFolder);
