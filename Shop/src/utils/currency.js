// Currency utility for displaying prices in Taka (BDT)
const CURRENCY_SYMBOL = '৳'; // Taka symbol

/**
 * Format a price value with Taka symbol
 * @param {number|string} price - The price value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted price with Taka symbol
 */
export const formatPrice = (price, decimals = 2) => {
  const numPrice = Number(price) || 0;
  return `${CURRENCY_SYMBOL}${numPrice.toFixed(decimals)}`;
};

/**
 * Get the Taka currency symbol
 * @returns {string} Taka symbol
 */
export const getCurrencySymbol = () => CURRENCY_SYMBOL;

/**
 * Format price for display (alias for formatPrice)
 * @param {number|string} price
 * @returns {string}
 */
export const displayPrice = (price) => formatPrice(price);

export default {
  formatPrice,
  getCurrencySymbol,
  displayPrice,
};
