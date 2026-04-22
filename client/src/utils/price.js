export const normalizePrice = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.round(numericValue);
};

export const roundPriceToHundreds = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.round(numericValue / 100) * 100;
};

export const formatPrice = (value) => `$${normalizePrice(value)}`;