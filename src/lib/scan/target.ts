// Target guard — a scanner must not be tricked into hitting internal infra
// (SSRF). We only allow public http(s) hosts and block loopback, private
// ranges, and cloud metadata endpoints. Note: literal-IP/hostname checks only;
// a DNS-resolving check belongs in the worker layer when active scanning lands.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
  return false;
}

export function validateTarget(input: string): { ok: true; url: string } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "Only http and https targets are allowed." };
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "Internal/loopback hosts cannot be scanned." };
  }
  if (isPrivateIPv4(host)) {
    return { ok: false, reason: "Private-range IPs cannot be scanned." };
  }
  return { ok: true, url: u.toString() };
}
