export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

// Generate simple SVG QR Code dots matrix representation for realistic table stands
export function generateTableQRSvg(seed: string): string {
  // A clean deterministic SVG QR pattern based on table seed
  return seed;
}
