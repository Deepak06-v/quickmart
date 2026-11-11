/**
 * Calculates great-circle distance between two points on the Earth's surface using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers (rounded to 1 decimal place)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

/**
 * Checks whether user coordinates fall within the delivery radius from the store.
 */
export function isWithinDeliveryRadius(
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number,
  radiusKm: number
): { isDeliverable: boolean; distanceKm: number } {
  const distanceKm = calculateDistanceKm(userLat, userLon, storeLat, storeLon);
  return {
    isDeliverable: distanceKm <= radiusKm,
    distanceKm,
  };
}

/**
 * Calculates delivery ETA in minutes and the target estimated timestamp.
 */
export function calculateDeliveryEta(
  distanceKm: number,
  speedKmh: number = 25,
  prepTimeMinutes: number = 15
): { estimatedMinutes: number; estimatedTime: Date } {
  // Travel time in minutes = (distance / speed) * 60
  const travelMinutes = Math.ceil((distanceKm / speedKmh) * 60);
  const totalMinutes = prepTimeMinutes + travelMinutes;

  // Minimum 20 mins, max reasonable buffer for hyperlocal
  const estimatedMinutes = Math.max(20, totalMinutes);

  const estimatedTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
  return {
    estimatedMinutes,
    estimatedTime,
  };
}
