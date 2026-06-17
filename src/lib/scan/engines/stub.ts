import { ScanEngine, ScanEvent, EngineFinding } from "@/lib/scan/engine";
import { ScanConfig } from "@/lib/types";
import { SCAN_PHASES } from "@/lib/constants";

// Placeholder engine. Produces a representative, deterministic finding set so the
// full product loop (persist → score → delta → UI → AI tools) works end to end
// without external infra. Replace with the real OWASP ZAP adapter (same
// interface) once a ZAP daemon is reachable — see AGENTS.md → Scanner.
//
// NOTE: this does NOT actually probe the target. Findings are illustrative.

function buildFindings(targetUrl: string): EngineFinding[] {
  let origin = targetUrl;
  try {
    origin = new URL(targetUrl).origin;
  } catch {
    /* keep as-is */
  }

  return [
    {
      checkId: "HDR1",
      title: "Missing Content Security Policy Header",
      severity: "medium",
      category: "Headers",
      standards: ["OWASP_TOP10", "CWE", "NIST"],
      url: origin,
      evidence: "HTTP response is missing the Content-Security-Policy header.",
      description:
        "No Content Security Policy is defined, leaving the application more exposed to XSS and data-injection attacks.",
      impact:
        "Without CSP, injected scripts execute without restriction, amplifying the severity of any XSS.",
      remediation:
        "Add a strict Content-Security-Policy header. Start in report-only mode, then enforce.",
      codeExample:
        "res.setHeader('Content-Security-Policy', \"default-src 'self'; script-src 'self'\");",
      references: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP"],
      cvss: 6.1,
      cwe: "CWE-693",
    },
    {
      checkId: "GDPR1",
      title: "Session Cookie Missing Secure & HttpOnly Flags",
      severity: "medium",
      category: "Privacy",
      standards: ["GDPR", "PCI_DSS", "OWASP_TOP10"],
      url: origin,
      parameter: "session",
      evidence: "Set-Cookie: session=…; Path=/  (missing Secure; HttpOnly; SameSite)",
      description:
        "Session cookies are set without Secure, HttpOnly, or SameSite flags.",
      impact:
        "Cookies are reachable by JavaScript and may travel over unencrypted connections — easing session theft and CSRF.",
      remediation:
        "Set session cookies with Secure, HttpOnly, and SameSite=Lax (or Strict).",
      codeExample:
        "res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax' });",
      references: ["https://owasp.org/www-community/controls/SecureCookieAttribute"],
      cvss: 6.5,
      cwe: "CWE-614",
    },
    {
      checkId: "INFO1",
      title: "Server Version Disclosed in Headers",
      severity: "low",
      category: "Information Disclosure",
      standards: ["OWASP_TOP10", "CWE", "NIST"],
      url: origin,
      evidence: "Server: nginx/1.21.0",
      description:
        "Response headers reveal the web-server software and version.",
      impact:
        "Gives attackers precise version info to look up known CVEs and craft targeted exploits.",
      remediation: "Suppress or spoof the Server and X-Powered-By headers.",
      references: ["https://cwe.mitre.org/data/definitions/200.html"],
      cvss: 4.3,
      cwe: "CWE-200",
    },
    {
      checkId: "HDR1",
      title: "Missing X-Frame-Options / frame-ancestors",
      severity: "low",
      category: "Headers",
      standards: ["OWASP_TOP10", "CWE"],
      url: origin,
      evidence: "No X-Frame-Options header and no CSP frame-ancestors directive.",
      description:
        "The page can be framed by any origin, enabling clickjacking.",
      impact:
        "An attacker can overlay the page in an iframe to trick users into unintended actions.",
      remediation:
        "Send X-Frame-Options: DENY, or a CSP frame-ancestors 'none' directive.",
      references: ["https://owasp.org/www-community/attacks/Clickjacking"],
      cvss: 4.3,
      cwe: "CWE-1021",
    },
  ];
}

export const stubEngine: ScanEngine = {
  id: "stub",
  name: "Built-in (illustrative)",
  capabilities: {
    mode: ["passive"],
    standards: ["OWASP_TOP10", "CWE", "NIST", "GDPR", "PCI_DSS"],
    needsWorker: false,
  },
  async *scan(config: ScanConfig): AsyncIterable<ScanEvent> {
    const findings = buildFindings(config.targetUrl);

    for (let i = 0; i < SCAN_PHASES.length; i++) {
      yield {
        type: "progress",
        progress: {
          phase: SCAN_PHASES[i],
          current: i + 1,
          total: SCAN_PHASES.length,
          currentUrl: config.targetUrl,
          checksCompleted: [],
          checksRunning: [],
        },
      };
    }

    for (const finding of findings) {
      yield { type: "finding", finding };
    }

    yield { type: "done" };
  },
};
