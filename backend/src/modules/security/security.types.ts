/**
 * security.types.ts — Security & Audit Log Types
 */
export enum SecurityAction {
  LOGIN_SUCCESS       = 'LOGIN_SUCCESS',
  LOGIN_FAILED        = 'LOGIN_FAILED',
  DOCUMENT_VIEW       = 'DOCUMENT_VIEW',
  DOCUMENT_DOWNLOAD   = 'DOCUMENT_DOWNLOAD',
  DOCUMENT_DELETE     = 'DOCUMENT_DELETE',
  DOCUMENT_UPDATE     = 'DOCUMENT_UPDATE',
  PASSWORD_CHANGE     = 'PASSWORD_CHANGE',
  LOGOUT              = 'LOGOUT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export enum SecurityStatus {
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

export interface SecurityAuditEntry {
  userId?:      string;
  documentId?:  string;
  action:       SecurityAction;
  status:       SecurityStatus;
  ipAddress?:   string;
  userAgent?:   string;
  details?:     string;
  timestamp:    Date;
}
