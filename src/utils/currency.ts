const vndNumberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export const parseVndAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? '').trim();
  const digits = text.replace(/\D/g, '');

  if (!digits) {
    return 0;
  }

  const amount = Number(digits);
  return Number.isFinite(amount) ? (text.startsWith('-') ? -amount : amount) : 0;
};

export const normalizeVndAmountInput = (value: string) =>
  value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

export const formatVndAmountInput = (value: unknown) => {
  if (String(value ?? '').trim() === '') {
    return '';
  }

  return vndNumberFormatter.format(parseVndAmount(value));
};
