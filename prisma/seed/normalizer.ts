import { RawEmployee } from "./raw-data";
import { SeedConfig } from "./config";

const MONTH_MAP: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  nopember: 11, // Indonesian variant
  desember: 12,
};

// Canonical tenant names map (case-insensitive key) to prevent duplicate tenants
const CANONICAL_TENANT_MAP: Record<string, string> = {
  "cv. makuta putra karya": "CV. Makuta Putra Karya",
  "cv. mulyasari sukses bersama": "CV. Mulyasari Sukses Bersama",
  "cv. alkea naratas farm": "CV. Alkea Naratas Farm",
  "yayasan allyka giri artha": "Yayasan Allyka Giri Artha",
  "pasini naratas farm": "Pasini Naratas Farm",
  "mitraku plastik": "Mitraku Plastik",
  "sman 1 cimaragas": "SMAN 1 Cimaragas",
  "sman 1 baregbeg": "SMAN 1 Baregbeg",
  "smkn 1 panjalu": "SMKN 1 Panjalu",
  "sman 1 sukadana": "SMAN 1 Sukadana",
  "slbn ciamis": "SLBN Ciamis",
  "smkn 2 ciamis": "SMKN 2 Ciamis",
  "sman 2 banjarsari": "SMAN 2 Banjarsari",
  "smkn 1 cipaku": "SMKN 1 Cipaku",
  "sman 1 ciamis": "SMAN 1 Ciamis",
  "smkn 1 panumbangan": "SMKN 1 Panumbangan",
  "slbn cijeungjing": "SLBN Cijeungjing",
  "dprkplh": "DPRKPLH",
  "sman 1 sindangkasih": "SMAN 1 Sindangkasih",
  "surya bhakti pangawasa": "SURYA BHAKTI PANGAWASA",
  "pt. medang layang indah": "PT. MEDANG LAYANG INDAH",
  "sppg kawali": "SPPG Kawali",
  "kcd-xiii": "KCD-XIII",
  "bphl-vii": "BPHL-VII",
};

/**
 * Normalizes any string by trimming and collapsing multiple spaces.
 */
export function normalizeWhitespace(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes tenant name, applying canonical casing so case variations
 * like "CV. Makuta Putra karya" and "CV. Makuta Putra Karya" resolve to one tenant.
 */
export function normalizeTenantName(instansi: string): string {
  const cleaned = normalizeWhitespace(instansi);
  const lowerKey = cleaned.toLowerCase();
  return CANONICAL_TENANT_MAP[lowerKey] || cleaned;
}

/**
 * Resolves deterministic TenantIdentifier from tenant name by removing whitespace.
 * Preserves dots, e.g. "CV. Makuta Putra Karya" -> "CV.MakutaPutraKarya".
 */
export function resolveTenantIdentifier(tenantName: string): string {
  return normalizeTenantName(tenantName).replace(/\s+/g, "");
}

/**
 * Resolves deterministic tenant domain: {TenantIdentifier}.niskala.id
 */
export function resolveTenantDomain(tenantIdentifier: string): string {
  return `${tenantIdentifier}.niskala.id`;
}

/**
 * Resolves deterministic tenant admin email: {TenantIdentifier}@niskala.id
 */
export function resolveAdminEmail(tenantIdentifier: string): string {
  return `${tenantIdentifier}@niskala.id`;
}

/**
 * Normalizes employee name to a valid, deterministic email username.
 * Rules: lowercase, strip apostrophe/quotes, replace spaces with dot,
 * strip invalid characters, collapse dots, strip leading/trailing dot.
 */
export function normalizeUsername(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s.]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/**
 * Parses day, month (Indonesian), and year into a valid UTC Date or returns null.
 */
export function parseBirthDate(tgl: string, bln: string, thn: string): Date | null {
  if (!tgl || !bln || !thn) return null;
  const day = parseInt(tgl.trim(), 10);
  const year = parseInt(thn.trim(), 10);
  const monthStr = bln.trim().toLowerCase();
  const month = MONTH_MAP[monthStr];

  if (!day || !year || !month) return null;
  if (day < 1 || day > 31 || year < 1900 || year > 2100) return null;

  const d = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(d.getTime())) return null;
  return d;
}

export interface TransformedEmployee {
  raw: RawEmployee;
  finalTenantName: string;
  finalPlacement: string;
}

/**
 * Applies Swap / Transformation rules without mutating the original raw data.
 */
export function applySwap(raw: RawEmployee, config: SeedConfig): TransformedEmployee {
  let tenant = normalizeTenantName(raw.instansi_mitra);
  let placement = raw.penempatan_kerja ? normalizeWhitespace(raw.penempatan_kerja) : tenant;

  if (config.swapMode === "ONE") {
    const swapRule = config.swapOne.find((rule) => rule.nip === raw.nip);
    if (swapRule) {
      tenant = normalizeTenantName(swapRule.tenant);
      if (swapRule.placement) {
        placement = normalizeWhitespace(swapRule.placement);
      }
    }
  } else if (config.swapMode === "ALL") {
    const swapRule = config.swapAll[tenant] || config.swapAll[raw.instansi_mitra];
    if (swapRule) {
      tenant = normalizeTenantName(swapRule.tenant);
      if (swapRule.placement) {
        placement = normalizeWhitespace(swapRule.placement);
      }
    }
  }

  return {
    raw,
    finalTenantName: tenant,
    finalPlacement: placement,
  };
}
