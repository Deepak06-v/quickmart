import { getDeliveryFeeConfig } from '../config/env';

/**
 * Calculates delivery fee based on distance according to the business rule:
 * IF distanceKm <= DELIVERY_FEE_THRESHOLD_KM:
 *     delivery fee = DELIVERY_FEE_AT_OR_BELOW_THRESHOLD
 * ELSE:
 *     delivery fee = DELIVERY_FEE_ABOVE_THRESHOLD
 *
 * @param distanceKm Delivery distance in kilometers (Haversine straight-line distance)
 * @returns Delivery fee in Indian Rupees (INR)
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (typeof distanceKm !== 'number' || isNaN(distanceKm) || distanceKm < 0) {
    throw new Error(`Invalid distance: ${distanceKm}. Distance must be a non-negative number.`);
  }

  const { thresholdKm, feeAtOrBelow, feeAbove } = getDeliveryFeeConfig();

  if (distanceKm <= thresholdKm) {
    return feeAtOrBelow;
  } else {
    return feeAbove;
  }
}
