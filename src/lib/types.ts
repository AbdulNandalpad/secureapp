export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ScanStatus = "idle" | "configuring" | "scanning" | "complete" | "error";

export type StandardCategory =
  | "OWASP_TOP10"
  | "OWASP_API"
  | "CWE"
  | "SANS_TOP25"
  | "NIST"
  | "PCI_DSS"
  | "GDPR"
  | "ISO27001";

export interface VulnerabilityCheck {
  id: string;
  name: string;
  description: string;
  standards: StandardCategory[];
  references: string[];
  severity: Severity;
  category: string;
}

export interface Finding {
  id: string;
  checkId: string;
  title: string;
  severity: Severity;
  category: string;
  standards: StandardCategory[];
  url: string;
  parameter?: string;
  evidence?: string;
  description: string;
  impact: string;
  remediation: string;
  codeExample?: string;
  references: string[];
  cvss?: number;
  cwe?: string;
  // Set when this finding is compared against the previous scan of the same target.
  deltaStatus?: "new" | "persisting" | "fixed";
}

export interface ScanConfig {
  targetUrl: string;
  scanDepth: "surface" | "standard" | "deep";
  selectedStandards: StandardCategory[];
  includeAuthenticated: boolean;
  crawlSubdomains: boolean;
  maxRequests: number;
  timeout: number;
  userAgent: string;
}

export interface ScanProgress {
  phase: string;
  current: number;
  total: number;
  currentUrl: string;
  checksCompleted: string[];
  checksRunning: string[];
}

export interface ScanResult {
  id: string;
  targetUrl: string;
  startedAt: string;
  completedAt?: string;
  status: ScanStatus;
  config: ScanConfig;
  progress: ScanProgress;
  findings: Finding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
  };
  pagesScanned: number;
  requestsMade: number;
  duration: number;
  engineId?: string;
  // "What changed?" vs the previous scan of the same target.
  delta?: { new: number; persisting: number; fixed: number };
}

export interface Report {
  id: string;
  scanId: string;
  generatedAt: string;
  format: "pdf" | "json" | "html" | "csv";
  url: string;
}
