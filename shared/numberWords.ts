// Converts day numbers to/from the subdomain label format: 1 -> "one",
// 21 -> "twentyone", 112 -> "onehundredtwelve". Hyphens are accepted on input
// ("twenty-one") but the canonical form never contains them.

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export const MAX_DAY = 999_999;

function below1000(n: number): string {
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) out += ONES[h] + "hundred";
  if (r >= 20) out += TENS[Math.floor(r / 10)] + ONES[r % 10];
  else if (r >= 10) out += TEENS[r - 10];
  else out += ONES[r];
  return out;
}

/** Canonical label for a positive integer (1..999999). */
export function toWords(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > MAX_DAY) throw new RangeError(`day out of range: ${n}`);
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  return (th ? below1000(th) + "thousand" : "") + (rest ? below1000(rest) : "");
}

const TOKENS: [string, number | "h" | "k"][] = [
  ...TEENS.map((w, i) => [w, 10 + i] as [string, number]),
  ...TENS.map((w, i) => [w, i * 10] as [string, number]).filter(([w]) => w),
  ...ONES.map((w, i) => [w, i] as [string, number]).filter(([w]) => w),
  ["hundred", "h"],
  ["thousand", "k"],
];
TOKENS.sort((a, b) => b[0].length - a[0].length); // longest match first

/** Parse a label (case/hyphen-insensitive). Returns null if it is not a valid number word. */
export function parseWords(label: string): number | null {
  const s = label.toLowerCase().replace(/-/g, "");
  if (!s || s.length > 80) return null;
  let i = 0;
  let total = 0;
  let current = 0;
  while (i < s.length) {
    const tok = TOKENS.find(([w]) => s.startsWith(w, i));
    if (!tok) return null;
    i += tok[0].length;
    const v = tok[1];
    if (v === "h") current *= 100;
    else if (v === "k") {
      total += current * 1000;
      current = 0;
    } else current += v;
  }
  const n = total + current;
  if (n < 1 || n > MAX_DAY) return null;
  // Round-trip check rejects malformed things like "onetwo" or "hundredhundred".
  return toWords(n) === s ? n : null;
}
