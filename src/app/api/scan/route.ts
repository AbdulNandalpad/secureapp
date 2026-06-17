import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startScan } from "@/lib/scan/orchestrator";
import { validateTarget } from "@/lib/scan/target";
import { DEFAULT_ENGINE_ID } from "@/lib/scan/registry";
import { listScans } from "@/lib/dal/scans";
import { ScanConfig } from "@/lib/types";

function buildConfig(targetUrl: string, partial?: Partial<ScanConfig>): ScanConfig {
  return {
    targetUrl,
    scanDepth: partial?.scanDepth ?? "standard",
    selectedStandards:
      partial?.selectedStandards ?? ["OWASP_TOP10", "CWE", "NIST", "GDPR", "PCI_DSS"],
    includeAuthenticated: partial?.includeAuthenticated ?? false,
    crawlSubdomains: partial?.crawlSubdomains ?? false,
    maxRequests: partial?.maxRequests ?? 1000,
    timeout: partial?.timeout ?? 30,
    userAgent: partial?.userAgent ?? "SecureApp Scanner/1.0",
  };
}

// POST /api/scan — start a scan (auth-gated; runs as the signed-in user).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: {
    targetUrl?: string;
    engineId?: string;
    authorized?: boolean;
    config?: Partial<ScanConfig>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.targetUrl) {
    return NextResponse.json({ error: "`targetUrl` is required" }, { status: 400 });
  }
  // The user must attest they are authorized to scan the target.
  if (body.authorized !== true) {
    return NextResponse.json(
      { error: "You must confirm you are authorized to scan this target." },
      { status: 403 }
    );
  }

  const target = validateTarget(body.targetUrl);
  if (!target.ok) {
    return NextResponse.json({ error: target.reason }, { status: 400 });
  }

  try {
    const result = await startScan(supabase, user.id, {
      targetUrl: target.url,
      engineId: body.engineId ?? DEFAULT_ENGINE_ID,
      config: buildConfig(target.url, body.config),
      authorized: true,
    });
    return NextResponse.json({ scan: result });
  } catch (err) {
    console.error("scan failed:", err);
    return NextResponse.json({ error: "Scan failed." }, { status: 500 });
  }
}

// GET /api/scan — list the user's scans (for History/Dashboard).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const scans = await listScans(supabase, user.id);
  return NextResponse.json({ scans });
}
