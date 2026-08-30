import { DocumentCategory } from '../common/enums';

export enum SmartFolderType {
  EDUCATIONAL         = 'Educational',
  GOVERNMENT          = 'Government',
  FEE_RECEIPTS        = 'Fee Receipts',
  FINANCIAL           = 'Financial',
  MEDICAL             = 'Medical',
  EMPLOYMENT_PERSONAL = 'Employment / Personal',
  OTHER               = 'Other',
}

export const SMART_FOLDER_MAPPING: Record<string, SmartFolderType> = {
  [DocumentCategory.EDUCATIONAL_CERTIFICATE]: SmartFolderType.EDUCATIONAL,
  [DocumentCategory.DEGREE_CERTIFICATE]:      SmartFolderType.EDUCATIONAL,
  [DocumentCategory.MARKSHEET]:               SmartFolderType.EDUCATIONAL,
  'Bonafide Certificate':                    SmartFolderType.EDUCATIONAL, // fallback

  [DocumentCategory.AADHAAR_CARD]:            SmartFolderType.GOVERNMENT,
  [DocumentCategory.PAN_CARD]:                SmartFolderType.GOVERNMENT,
  [DocumentCategory.PASSPORT]:                SmartFolderType.GOVERNMENT,
  [DocumentCategory.DRIVING_LICENSE]:         SmartFolderType.GOVERNMENT,
  [DocumentCategory.VOTER_ID]:                SmartFolderType.GOVERNMENT,
  [DocumentCategory.BIRTH_CERTIFICATE]:       SmartFolderType.GOVERNMENT,
  [DocumentCategory.IDENTITY_CARD]:           SmartFolderType.GOVERNMENT,

  [DocumentCategory.FEE_RECEIPT]:             SmartFolderType.FEE_RECEIPTS,
  'Hostel Receipt':                           SmartFolderType.FEE_RECEIPTS, // fallback

  [DocumentCategory.BANK_STATEMENT]:          SmartFolderType.FINANCIAL,
  [DocumentCategory.SALARY_SLIP]:             SmartFolderType.FINANCIAL,
  [DocumentCategory.INVOICE]:                 SmartFolderType.FINANCIAL,

  [DocumentCategory.MEDICAL_REPORT]:          SmartFolderType.MEDICAL,
  [DocumentCategory.INSURANCE_DOCUMENT]:      SmartFolderType.MEDICAL,

  [DocumentCategory.RESUME]:                  SmartFolderType.EMPLOYMENT_PERSONAL,
  [DocumentCategory.EMPLOYMENT_DOCUMENT]:     SmartFolderType.EMPLOYMENT_PERSONAL,
  [DocumentCategory.INTERNSHIP_CERTIFICATE]:  SmartFolderType.EMPLOYMENT_PERSONAL,

  [DocumentCategory.WARRANTY_CARD]:           SmartFolderType.OTHER,
  [DocumentCategory.OTHER]:                   SmartFolderType.OTHER,
};
