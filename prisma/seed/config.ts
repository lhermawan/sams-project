export interface SwapOneRule {
  nip: string;
  tenant: string;
  placement?: string;
}

export interface SwapAllRule {
  tenant: string;
  placement?: string;
}

export interface SeedConfig {
  swapMode: "NONE" | "ONE" | "ALL";
  swapOne: SwapOneRule[];
  swapAll: Record<string, SwapAllRule>;
}

/**
 * SEED_CONFIG controls tenant and placement transformations.
 * - NONE: Preserves original INSTANSI/MITRA and PENEMPATAN KERJA.
 * - ONE: Swaps specific employees identified by NIP to another tenant/placement.
 * - ALL: Maps an entire tenant to another tenant/placement.
 */
export const SEED_CONFIG: SeedConfig = {
  swapMode: "NONE",
  swapOne: [
    // Example:
    // { nip: "20260110010709", tenant: "CV. Makuta Putra Karya", placement: "SPPG Jelat" }
  ],
  swapAll: {
    // Example:
    // "CV. Makuta Putra Karya": { tenant: "Pasini Naratas Farm", placement: "Pasini Naratas Farm" }
  },
};
