import { RawEmployee } from "./raw-data";
import { parseBirthDate, TransformedEmployee } from "./normalizer";

export interface ValidationResult {
  isValid: boolean;
  totalSourceRows: number;
  duplicateNIPCount: number;
  duplicateNIKCount: number;
  invalidBirthDateCount: number;
  missingNIPCount: number;
  missingNameCount: number;
  missingTenantCount: number;
  warnings: string[];
  errors: string[];
}

export function validateSourceData(
  transformedList: TransformedEmployee[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    totalSourceRows: transformedList.length,
    duplicateNIPCount: 0,
    duplicateNIKCount: 0,
    invalidBirthDateCount: 0,
    missingNIPCount: 0,
    missingNameCount: 0,
    missingTenantCount: 0,
    warnings: [],
    errors: [],
  };

  if (transformedList.length !== 70) {
    result.errors.push(
      `Expected 70 source rows, but received ${transformedList.length}`
    );
    result.isValid = false;
  }

  // Global NIP map
  const nipMap = new Map<string, TransformedEmployee>();
  // Tenant-scoped NIP map: tenantId -> Map<nip, TransformedEmployee>
  const tenantNipMap = new Map<string, Map<string, TransformedEmployee>>();
  // Global NIK map
  const nikMap = new Map<string, TransformedEmployee>();

  for (const item of transformedList) {
    const { raw, finalTenantName } = item;

    // 1. Missing Name
    if (!raw.nama || !raw.nama.trim()) {
      result.missingNameCount++;
      result.errors.push(`[ERROR] Row ${raw.no}: Name is missing`);
      result.isValid = false;
    }

    // 2. Missing NIP
    if (!raw.nip || !raw.nip.trim()) {
      result.missingNIPCount++;
      result.errors.push(`[ERROR] Row ${raw.no} (${raw.nama}): NIP is missing`);
      result.isValid = false;
    } else {
      // Check duplicate NIP within the same tenant
      if (!tenantNipMap.has(finalTenantName)) {
        tenantNipMap.set(finalTenantName, new Map());
      }
      const tMap = tenantNipMap.get(finalTenantName)!;
      if (tMap.has(raw.nip)) {
        const prev = tMap.get(raw.nip)!;
        result.duplicateNIPCount++;
        result.errors.push(
          `[ERROR] Duplicate NIP ${raw.nip} within tenant "${finalTenantName}" detected between Row ${raw.no} (${raw.nama}) and Row ${prev.raw.no} (${prev.raw.nama})`
        );
        result.isValid = false;
      } else {
        tMap.set(raw.nip, item);
      }

      // Global cross-tenant duplicate NIP warning
      if (nipMap.has(raw.nip)) {
        const prev = nipMap.get(raw.nip)!;
        result.warnings.push(
          `[WARN] Duplicate NIP across tenants: ${raw.nip} found in Row ${raw.no} (${raw.nama} - ${finalTenantName}) and Row ${prev.raw.no} (${prev.raw.nama} - ${prev.finalTenantName})`
        );
      } else {
        nipMap.set(raw.nip, item);
      }
    }

    // 3. Duplicate NIK check (if NIK provided)
    if (raw.nik && raw.nik.trim()) {
      if (nikMap.has(raw.nik)) {
        const prev = nikMap.get(raw.nik)!;
        result.duplicateNIKCount++;
        result.warnings.push(
          `[WARN] Duplicate NIK: ${raw.nik} found in Row ${raw.no} (${raw.nama}) and Row ${prev.raw.no} (${prev.raw.nama})`
        );
      } else {
        nikMap.set(raw.nik, item);
      }
    } else {
      result.warnings.push(
        `[INFO] Row ${raw.no} (${raw.nama}): NIK is empty in source data (will be saved as null)`
      );
    }

    // 4. Birth date check
    if (raw.tgl_lahir || raw.bln_lahir || raw.thn_lahir) {
      const parsed = parseBirthDate(raw.tgl_lahir, raw.bln_lahir, raw.thn_lahir);
      if (!parsed) {
        result.invalidBirthDateCount++;
        result.warnings.push(
          `[WARN] Row ${raw.no} (${raw.nama}): Invalid birth date values (${raw.tgl_lahir} ${raw.bln_lahir} ${raw.thn_lahir})`
        );
      }
    }

    // 5. Tenant check
    if (!finalTenantName || !finalTenantName.trim()) {
      result.missingTenantCount++;
      result.errors.push(`[ERROR] Row ${raw.no} (${raw.nama}): Tenant is missing`);
      result.isValid = false;
    }
  }

  return result;
}
