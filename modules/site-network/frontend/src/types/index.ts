export interface Study {
  id: string;
  protocolId: string;
  title: string;
  sponsor: string;
  phase: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
  sites?: Site[];
  examiners?: Examiner[];
  studySites?: StudySite[];
}

export interface StudySiteExaminer {
  id: string;
  examinerCode: string;
  name: string;
  specialty: string;
  email: string;
  role: string;
  status: string;
  certificate?: ExaminerCertificate | null;
}

export interface StudySite {
  site: Site;
  examiners: StudySiteExaminer[];     // assigned to this study at this site (with certificate)
  availableExaminers: Examiner[];     // all examiners on the site
}

export interface Site {
  id: string;
  siteCode: string;
  name: string;
  city: string;
  country: string;
  status: string;
  studies?: Study[];
  examiners?: Examiner[];
}

export interface ExaminerCertificate {
  id: string;
  certificateId: string;
  expiresOn: string;
}

export interface Examiner {
  id: string;
  examinerCode: string;
  name: string;
  specialty: string;
  email: string;
  role: string;
  status: string;
  studies?: Study[];
  sites?: Site[];
  certificates?: ExaminerCertificate[];
}

export interface AuditLog {
  id: string;
  actorUserId: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  rows: AuditLog[];
  total: number;
}

export interface AuthContextValue {
  isLoggedIn: boolean;
  isChecking: boolean;
  role: 'ADMIN' | 'VIEWER' | null;
}
