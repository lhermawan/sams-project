// Haversine formula — calculate distance (meters) between two GPS coordinates
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Check if employee is within allowed radius
export function isWithinRadius(
  employeeLat: number,
  employeeLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): { valid: boolean; distance: number } {
  const distance = haversineDistance(
    employeeLat,
    employeeLng,
    officeLat,
    officeLng
  );
  return {
    valid: distance <= radiusMeters,
    distance: Math.round(distance * 10) / 10, // round to 1 decimal
  };
}
