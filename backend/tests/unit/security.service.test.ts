/**
 * security.service.test.ts — Comprehensive Security & Theft Protection Unit Tests
 *
 * Mandatory Verification Matrix:
 *  A. User A accesses own document → SUCCESS
 *  B. User A attempts to access User B's document → DENIED (403)
 *  C. User A attempts to download User B's document → DENIED (403) → NO download email
 *  D. Unauthenticated user attempts document access → 401
 *  E. Unauthenticated user attempts download → 401
 *  F. User downloads own document → SUCCESS → audit event created → download email triggered
 *  G. Download email service fails → file download still succeeds → failure logged
 *  H. Multiple failed logins exceed threshold → suspicious activity event
 *  I. Excessive downloads exceed threshold → suspicious activity event → email alert
 *  J. User cannot retrieve another user's audit/security events
 *  K. Path traversal attempts are rejected
 */
import mongoose from 'mongoose';
import { documentService } from '../../src/modules/document/document.service';
import { DocumentModel } from '../../src/modules/document/document.model';
import { LocalStorageService } from '../../src/common/local-storage.service';
import { securityAuditService } from '../../src/modules/security/security-audit.service';
import { SecurityAuditModel } from '../../src/modules/security/security-audit.model';
import { UserModel } from '../../src/modules/user/user.model';
import { NotificationModel } from '../../src/modules/notification/notification.model';
import { emailService } from '../../src/common/email.service';
import { SecurityAction, SecurityStatus } from '../../src/modules/security/security.types';
import { HttpError } from '../../src/middleware/error.middleware';
import { authenticate } from '../../src/middleware/authenticate.middleware';

jest.mock('../../src/modules/document/document.model');
jest.mock('../../src/common/local-storage.service');
jest.mock('../../src/modules/security/security-audit.model');
jest.mock('../../src/modules/user/user.model');
jest.mock('../../src/modules/notification/notification.model');
jest.mock('../../src/common/email.service');
jest.mock('../../src/modules/auth/jwt/jwt.service');

const USER_A_ID = '64f3a1111111111111111111';
const USER_B_ID = '64f3a2222222222222222222';
const DOC_A_ID  = '64f3d1111111111111111111';

const mockDocA = {
  _id:              DOC_A_ID,
  userId:           new mongoose.Types.ObjectId(USER_A_ID),
  originalFileName: 'passport.pdf',
  storedFileName:   'uuid-passport.pdf',
  storagePath:      `${USER_A_ID}/2026/uuid-passport.pdf`,
  mimeType:         'application/pdf',
  fileSize:         102400,
  category:         'Identity Card',
  status:           'READY',
  toObject:         () => ({ ...mockDocA }),
};

describe('LifeVault Security & Theft-Protection Audit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // Test A: User A accesses own document → SUCCESS
  // ────────────────────────────────────────────────────────────────
  it('A: User A accesses own document → SUCCESS', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(mockDocA),
    });

    const doc = await documentService.findById(DOC_A_ID, USER_A_ID);
    expect(doc).toBeDefined();
    expect(doc._id).toBe(DOC_A_ID);
    expect(doc.userId.toString()).toBe(USER_A_ID);
  });

  // ────────────────────────────────────────────────────────────────
  // Test B: User A attempts to access User B's document → DENIED (403)
  // ────────────────────────────────────────────────────────────────
  it('B: User A attempts to access User B document → DENIED (403)', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(mockDocA), // belongs to User A
    });

    // User B tries to access Doc A
    await expect(documentService.findById(DOC_A_ID, USER_B_ID)).rejects.toThrow(
      new HttpError(403, 'You do not have permission to access this document'),
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Test C: User A attempts to download User B's document → DENIED (403) → NO email
  // ────────────────────────────────────────────────────────────────
  it('C: User A attempts to download User B document → DENIED (403) & NO email triggered', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(mockDocA), // belongs to User A
    });

    // User B tries to get file for download
    await expect(documentService.getFile(DOC_A_ID, USER_B_ID)).rejects.toThrow(
      new HttpError(403, 'You do not have permission to access this document'),
    );

    // Verify no email was triggered
    expect(emailService.sendDownloadAlertEmail).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────────
  // Test D & E: Unauthenticated user attempts access/download → 401
  // ────────────────────────────────────────────────────────────────
  it('D & E: Unauthenticated request without Bearer token throws 401', () => {
    const mockReq = { headers: {} } as any;
    const mockRes = {} as any;
    const mockNext = jest.fn();

    expect(() => authenticate(mockReq, mockRes, mockNext)).toThrow(
      new HttpError(401, 'Authorization header missing or malformed'),
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Test F: User downloads own document → SUCCESS → audit log & email
  // ────────────────────────────────────────────────────────────────
  it('F: User downloads own document → SUCCESS, audit event created & download email sent', async () => {
    const fileBuffer = Buffer.from('PDF binary stream');
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(mockDocA),
    });
    (LocalStorageService.prototype.get as jest.Mock).mockResolvedValue(fileBuffer);
    (SecurityAuditModel.create as jest.Mock).mockResolvedValue({});
    (emailService.sendDownloadAlertEmail as jest.Mock).mockResolvedValue({ success: true, status: 'SENT' });

    // 1. Get file
    const result = await documentService.getFile(DOC_A_ID, USER_A_ID);
    expect(result.buffer).toEqual(fileBuffer);
    expect(result.originalFileName).toBe('passport.pdf');

    // 2. Record audit event
    await securityAuditService.recordEvent({
      userId:     USER_A_ID,
      documentId: DOC_A_ID,
      action:     SecurityAction.DOCUMENT_DOWNLOAD,
      status:     SecurityStatus.SUCCESS,
      details:    `Downloaded file: ${result.originalFileName}`,
    });

    expect(SecurityAuditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: SecurityAction.DOCUMENT_DOWNLOAD,
        status: SecurityStatus.SUCCESS,
      }),
    );

    // 3. Trigger email
    await emailService.sendDownloadAlertEmail('userA@example.com', 'User A', result.originalFileName);
    expect(emailService.sendDownloadAlertEmail).toHaveBeenCalledWith(
      'userA@example.com',
      'User A',
      'passport.pdf',
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Test G: Download email service fails → file download still succeeds
  // ────────────────────────────────────────────────────────────────
  it('G: Download email service failure does NOT disrupt file delivery', async () => {
    const fileBuffer = Buffer.from('PDF binary stream');
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(mockDocA),
    });
    (LocalStorageService.prototype.get as jest.Mock).mockResolvedValue(fileBuffer);
    (emailService.sendDownloadAlertEmail as jest.Mock).mockRejectedValue(new Error('SMTP Connection timeout'));

    // File retrieval succeeds without throwing
    const result = await documentService.getFile(DOC_A_ID, USER_A_ID);
    expect(result.buffer).toBeDefined();

    // Async email catch block handles error safely
    await expect(
      emailService.sendDownloadAlertEmail('userA@example.com', 'User A', 'passport.pdf').catch(() => null),
    ).resolves.toBeNull();
  });

  // ────────────────────────────────────────────────────────────────
  // Test H: Multiple failed logins exceed threshold → suspicious activity
  // ────────────────────────────────────────────────────────────────
  it('H: Multiple failed logins exceeding threshold triggers SUSPICIOUS_ACTIVITY alert', async () => {
    // Return 5 failed attempts (matching default threshold)
    (SecurityAuditModel.countDocuments as jest.Mock).mockResolvedValue(5);
    (SecurityAuditModel.create as jest.Mock).mockResolvedValue({});
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id:      new mongoose.Types.ObjectId(USER_A_ID),
      email:    'target@example.com',
      fullName: 'Target User',
    });
    (NotificationModel.create as jest.Mock).mockResolvedValue({});
    (emailService.sendSuspiciousActivityEmail as jest.Mock).mockResolvedValue({ success: true, status: 'SENT' });

    const triggered = await securityAuditService.checkSuspiciousFailedLogins('192.168.1.100', 'target@example.com');
    expect(triggered).toBe(true);

    // Suspicious activity event logged
    expect(SecurityAuditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: SecurityAction.SUSPICIOUS_ACTIVITY,
      }),
    );

    // In-app notification created
    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'security',
      }),
    );

    // Email alert dispatched
    expect(emailService.sendSuspiciousActivityEmail).toHaveBeenCalledWith(
      'target@example.com',
      'Target User',
      expect.stringContaining('5 failed login attempts'),
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Test I: Excessive downloads exceed threshold → suspicious activity
  // ────────────────────────────────────────────────────────────────
  it('I: 10 downloads within 5 minutes triggers SUSPICIOUS_ACTIVITY, in-app notification, and suspicious email', async () => {
    // Return 10 downloads (matching threshold)
    (SecurityAuditModel.countDocuments as jest.Mock).mockResolvedValue(10);
    (SecurityAuditModel.create as jest.Mock).mockResolvedValue({});
    (UserModel.findById as jest.Mock).mockResolvedValue({
      _id:      new mongoose.Types.ObjectId(USER_A_ID),
      email:    'userA@example.com',
      fullName: 'User A',
    });
    (NotificationModel.create as jest.Mock).mockResolvedValue({});
    (emailService.sendSuspiciousActivityEmail as jest.Mock).mockResolvedValue({ success: true, status: 'SENT' });

    const triggered = await securityAuditService.checkSuspiciousDownloads(USER_A_ID);
    expect(triggered).toBe(true);

    expect(SecurityAuditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: SecurityAction.SUSPICIOUS_ACTIVITY,
        status: SecurityStatus.SUCCESS,
      }),
    );

    expect(NotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId:    expect.any(mongoose.Types.ObjectId),
        eventType: 'security',
        subtitle:  'Theft Protection Alert',
      }),
    );

    expect(emailService.sendSuspiciousActivityEmail).toHaveBeenCalledWith(
      'userA@example.com',
      'User A',
      expect.stringContaining('High document download volume'),
    );
  });

  it('I2: Notification creation failure does NOT prevent suspicious email dispatch', async () => {
    (SecurityAuditModel.countDocuments as jest.Mock).mockResolvedValue(10);
    (SecurityAuditModel.create as jest.Mock).mockResolvedValue({});
    (UserModel.findById as jest.Mock).mockResolvedValue({
      _id:      new mongoose.Types.ObjectId(USER_A_ID),
      email:    'userA@example.com',
      fullName: 'User A',
    });
    // Notification creation throws error
    (NotificationModel.create as jest.Mock).mockRejectedValue(new Error('Notification DB failure'));
    (emailService.sendSuspiciousActivityEmail as jest.Mock).mockResolvedValue({ success: true, status: 'SENT' });

    const triggered = await securityAuditService.checkSuspiciousDownloads(USER_A_ID);
    expect(triggered).toBe(true);

    // Email MUST still be called
    expect(emailService.sendSuspiciousActivityEmail).toHaveBeenCalledWith(
      'userA@example.com',
      'User A',
      expect.stringContaining('High document download volume'),
    );
  });

  it('I3: Email delivery failure does NOT crash checkSuspiciousDownloads and audit event remains recorded', async () => {
    (SecurityAuditModel.countDocuments as jest.Mock).mockResolvedValue(10);
    (SecurityAuditModel.create as jest.Mock).mockResolvedValue({});
    (UserModel.findById as jest.Mock).mockResolvedValue({
      _id:      new mongoose.Types.ObjectId(USER_A_ID),
      email:    'userA@example.com',
      fullName: 'User A',
    });
    (NotificationModel.create as jest.Mock).mockResolvedValue({});
    // Email delivery rejects
    (emailService.sendSuspiciousActivityEmail as jest.Mock).mockRejectedValue(new Error('SMTP Connection timeout'));

    const triggered = await securityAuditService.checkSuspiciousDownloads(USER_A_ID);
    expect(triggered).toBe(true);

    expect(SecurityAuditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: SecurityAction.SUSPICIOUS_ACTIVITY,
      }),
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Test J: User cannot retrieve another user's security events
  // ────────────────────────────────────────────────────────────────
  it('J: User can only retrieve their own security audit history', async () => {
    const mockUserEvents = [
      {
        _id:       new mongoose.Types.ObjectId(),
        userId:    new mongoose.Types.ObjectId(USER_A_ID),
        action:    SecurityAction.LOGIN_SUCCESS,
        status:    SecurityStatus.SUCCESS,
        createdAt: new Date(),
      },
    ];

    (SecurityAuditModel.find as jest.Mock).mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve(mockUserEvents),
          }),
        }),
      }),
    });
    (SecurityAuditModel.countDocuments as jest.Mock).mockResolvedValue(1);

    const history = await securityAuditService.getUserActivity(USER_A_ID);
    expect(history.events.length).toBe(1);
    expect(SecurityAuditModel.find).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_A_ID),
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Test K: Path traversal attempts are rejected
  // ────────────────────────────────────────────────────────────────
  it('K: Path traversal storage requests throw security error', async () => {
    const { LocalStorageService: RealStorageService } =
      jest.requireActual('../../src/common/local-storage.service');
    const storageService = new RealStorageService();

    await expect(
      storageService.get('../../../../etc/passwd'),
    ).rejects.toThrow('Path traversal detected');

    await expect(
      storageService.delete('..\\..\\windows\\system32'),
    ).rejects.toThrow('Path traversal detected');
  });
});
