/**
 * Client-side validation utilities for QR code scanning
 * This allows instant validation without database round-trips
 */

export interface QRCodeData {
  Design: string;
  Lot: string;
  "Unique Identifier": string;
}

export interface OrderItem {
  id: string;
  design: string;
  lot_number: string;
  quantity: number;
  fulfilled_quantity: number;
  status: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  status: string;
  order_items: OrderItem[];
}

export interface ScannedItem {
  design: string;
  lot: string;
  uniqueIdentifier: string;
  scannedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  duplicate?: boolean;
  quantityExceeded?: boolean;
  current?: number;
  max?: number;
}

/**
 * Validate QR code format
 */
export function validateQRCodeFormat(qrData: QRCodeData): ValidationResult {
  if (!qrData.Design || !qrData.Lot || !qrData["Unique Identifier"]) {
    return {
      valid: false,
      error: "Invalid QR code format. Missing required fields.",
    };
  }

  return { valid: true };
}

/**
 * Validate QR code against order
 */
export function validateQRCodeAgainstOrder(
  qrData: QRCodeData,
  order: Order | null
): ValidationResult {
  // If no order specified, any valid QR code is acceptable
  if (!order) {
    return { valid: true };
  }

  // Check if Design + Lot combination exists in order
  const matchingItem = order.order_items.find(
    (item) => item.design === qrData.Design && item.lot_number === qrData.Lot
  );

  if (!matchingItem) {
    return {
      valid: false,
      error: `Item ${qrData.Design} (Lot: ${qrData.Lot}) is not in this order`,
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate scan in current session
 */
export function checkDuplicateScan(
  qrData: QRCodeData,
  scannedItems: ScannedItem[]
): ValidationResult {
  const isDuplicate = scannedItems.some(
    (item) => item.uniqueIdentifier === qrData["Unique Identifier"]
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: `Item ${qrData["Unique Identifier"]} has already been scanned`,
      duplicate: true,
    };
  }

  return { valid: true };
}

/**
 * Check quantity limit against order
 */
export function checkQuantityLimit(
  qrData: QRCodeData,
  order: Order | null,
  scannedItems: ScannedItem[]
): ValidationResult {
  // If no order specified, no quantity limits
  if (!order) {
    return { valid: true, current: 0, max: 0 };
  }

  const matchingItem = order.order_items.find(
    (item) => item.design === qrData.Design && item.lot_number === qrData.Lot
  );

  if (!matchingItem) {
    return {
      valid: false,
      error: "Item not found in order",
      current: 0,
      max: 0,
    };
  }

  // Count current scans for this Design + Lot
  const currentCount = scannedItems.filter(
    (item) => item.design === qrData.Design && item.lot === qrData.Lot
  ).length;

  const maxQuantity = matchingItem.quantity - matchingItem.fulfilled_quantity;

  if (currentCount >= maxQuantity) {
    return {
      valid: false,
      error: `Quantity limit reached for ${qrData.Design}. Max: ${maxQuantity}, Current: ${currentCount}`,
      quantityExceeded: true,
      current: currentCount,
      max: maxQuantity,
    };
  }

  return {
    valid: true,
    current: currentCount,
    max: maxQuantity,
  };
}

/**
 * Perform all validations at once (client-side)
 */
export function validateScan(
  qrData: QRCodeData,
  order: Order | null,
  scannedItems: ScannedItem[]
): ValidationResult {
  // 1. Validate format
  const formatValidation = validateQRCodeFormat(qrData);
  if (!formatValidation.valid) return formatValidation;

  // 2. Validate against order
  const orderValidation = validateQRCodeAgainstOrder(qrData, order);
  if (!orderValidation.valid) return orderValidation;

  // 3. Check for duplicates
  const duplicateValidation = checkDuplicateScan(qrData, scannedItems);
  if (!duplicateValidation.valid) return duplicateValidation;

  // 4. Check quantity limits
  const quantityValidation = checkQuantityLimit(qrData, order, scannedItems);
  if (!quantityValidation.valid) return quantityValidation;

  return { valid: true };
}

/**
 * Aggregate scanned items by Design + Lot
 */
export function aggregateScannedItems(scannedItems: ScannedItem[]) {
  const aggregated = new Map<
    string,
    {
      design: string;
      lot: string;
      quantity: number;
      uniqueIdentifiers: string[];
    }
  >();

  scannedItems.forEach((item) => {
    const key = `${item.design}|||${item.lot}`;
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.quantity++;
      existing.uniqueIdentifiers.push(item.uniqueIdentifier);
    } else {
      aggregated.set(key, {
        design: item.design,
        lot: item.lot,
        quantity: 1,
        uniqueIdentifiers: [item.uniqueIdentifier],
      });
    }
  });

  return Array.from(aggregated.values());
}
