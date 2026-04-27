export const normalizePrice = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return NaN;
  return Math.round(numericValue);
};

export const roundPriceToHundreds = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return NaN;
  return Math.round(numericValue / 100) * 100;
};

export const calculateAdjustedPrice = ({ currentPrice, adjustmentType, percentage, fixedPrice }) => {
  const basePrice = Number(currentPrice);
  if (!Number.isFinite(basePrice)) return NaN;

  if (adjustmentType === 'percentage') {
    const percentageValue = Number(percentage);
    if (!Number.isFinite(percentageValue)) return NaN;
    return roundPriceToHundreds(basePrice * (1 + percentageValue / 100));
  }

  const fixedPriceValue = Number(fixedPrice);
  if (!Number.isFinite(fixedPriceValue)) return NaN;
  return normalizePrice(basePrice + fixedPriceValue);
};