/**
 * Format a currency amount with the appropriate symbol
 * @param amount The amount to format
 * @param currency The currency code (e.g., 'USD', 'EUR', 'BTC')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string): string => {
  // Handle cryptocurrency formatting
  if (['BTC', 'ETH', 'USDC', 'USDT', 'DAI'].includes(currency)) {
    // For cryptocurrencies, show more decimal places and the symbol at the end
    return `${amount.toFixed(6)} ${currency}`;
  }
  
  // For fiat currencies, use the Intl.NumberFormat
  try {
    // Try to use the Intl.NumberFormat with the currency
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if the currency is not supported
    return `${amount.toFixed(2)} ${currency}`;
  }
};

/**
 * Format a date string to a readable format
 * @param dateString The date string to format
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Truncate a string to a specified length with ellipsis
 * @param str The string to truncate
 * @param length The maximum length
 * @returns Truncated string
 */
export const truncateString = (str: string, length: number = 8): string => {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

/**
 * Format a blockchain address for display
 * @param address The blockchain address
 * @returns Formatted address
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format a transaction type for display
 * @param type The transaction type
 * @returns Formatted transaction type
 */
export const formatTransactionType = (type: string): string => {
  if (!type) return 'Unknown';
  
  // Capitalize first letter and replace underscores with spaces
  return type.charAt(0).toUpperCase() + 
    type.slice(1).toLowerCase().replace(/_/g, ' ');
};