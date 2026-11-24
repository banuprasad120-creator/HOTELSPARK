/**
 * Converts any numeric amount into Indian Currency Words.
 * e.g., 1600 -> "One thousand six hundred rupees only"
 * e.g., 3000 -> "Three thousand rupees only"
 * e.g., 2857.14 -> "Two thousand eight hundred fifty-seven rupees and fourteen paise only"
 */
export function numberToIndianWords(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
    return 'Zero rupees only';
  }

  const singleDigits = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return singleDigits[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return (tens[t] + (u !== 0 ? ' ' + singleDigits[u] : '')).trim();
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (h > 0) {
      res += singleDigits[h] + ' hundred';
    }
    if (rem > 0) {
      res += (res ? ' ' : '') + convertTwoDigits(rem);
    }
    return res.trim();
  }

  function convertNumber(num: number): string {
    if (num === 0) return 'zero';

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = num;

    const parts: string[] = [];

    if (crore > 0) {
      parts.push(convertNumber(crore) + ' crore');
    }
    if (lakh > 0) {
      parts.push(convertTwoDigits(lakh) + ' lakh');
    }
    if (thousand > 0) {
      parts.push(convertTwoDigits(thousand) + ' thousand');
    }
    if (hundred > 0) {
      parts.push(convertThreeDigits(hundred));
    }

    return parts.join(' ').trim();
  }

  const wholeNumber = Math.floor(amount);
  const fraction = Math.round((amount - wholeNumber) * 100);

  let words = convertNumber(wholeNumber);
  if (!words) words = 'zero';

  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);

  if (fraction > 0) {
    const paiseWords = convertTwoDigits(fraction);
    return `${words} rupees and ${paiseWords} paise only`;
  }

  return `${words} rupees only`;
}
