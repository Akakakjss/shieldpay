// The server remains authoritative; this stricter form also prevents cross-order imports.
const fields = ['type', 'title', 'text', 'occurred_at', 'order_id'];
const length = (value) => [...value].length;
const nonprinting = /[\p{C}\p{Zl}\p{Zp}]|[^\S\r\n\t ]/u;
const singleLine = (value, max) =>
  typeof value === 'string' &&
  value.trim() &&
  length(value) <= max &&
  !nonprinting.test(value) &&
  !/[\r\n\t]/.test(value);

function timestampValid(value) {
  if (typeof value !== 'string' || value.length > 64) return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return (
    Number(month) >= 1 &&
    Number(month) <= 12 &&
    Number(day) >= 1 &&
    Number(day) <= days &&
    Number(hour) < 24 &&
    Number(minute) < 60 &&
    Number(second) < 60 &&
    (zone === 'Z' || (Number(zone.slice(1, 3)) < 24 && Number(zone.slice(4)) < 60)) &&
    Number.isFinite(Date.parse(value)) &&
    Date.parse(value) <= Date.now()
  );
}

export function validateImport(text, reviewer, orderId) {
  const errors = [];
  let sources = null;
  if (text.trim()) {
    try {
      sources = JSON.parse(text);
    } catch {
      errors.push('Enter valid JSON. Use double quotes and escape newlines inside strings as \\n.');
    }
    if (sources !== null || !errors.length) {
      if (!Array.isArray(sources))
        errors.push('Source records must be a JSON array, not an API envelope.');
      else if (sources.length < 1 || sources.length > 20) errors.push('Provide 1–20 records.');
      else
        sources.forEach((record, index) => {
          const prefix = `Record ${index + 1}: `;
          if (!record || typeof record !== 'object' || Array.isArray(record)) {
            errors.push(prefix + 'must be an object.');
            return;
          }
          if (Object.keys(record).some((key) => !fields.includes(key)))
            errors.push(
              prefix +
                'extra fields are not allowed. Use only type, title, text, occurred_at and order_id.',
            );
          if (!['order', 'carrier', 'buyer_message'].includes(record.type))
            errors.push(prefix + 'type must be order, carrier or buyer_message.');
          if (!singleLine(record.title, 200))
            errors.push(
              prefix + 'title must be a nonblank single line of 1–200 printable characters.',
            );
          if (
            typeof record.text !== 'string' ||
            !record.text.trim() ||
            nonprinting.test(record.text.replace(/[\r\n\t]/g, '')) ||
            new TextEncoder().encode(record.text).length > 16384
          )
            errors.push(
              prefix +
                'text must be nonblank, at most 16,384 UTF-8 bytes, with no control characters except newline/tab.',
            );
          else {
            const orderLines = record.text
              .split(/\r\n|\r|\n/)
              .filter((line) => line.startsWith('Order: '));
            if (orderLines.length !== 1 || orderLines[0] !== `Order: ${orderId}`)
              errors.push(prefix + `text must contain exactly one line Order: ${orderId}.`);
          }
          if (!singleLine(record.order_id, 255) || record.order_id !== orderId)
            errors.push(prefix + `order_id must exactly match ${orderId}.`);
          if (!timestampValid(record.occurred_at))
            errors.push(
              prefix +
                'occurred_at must be a nonfuture ISO-8601 timestamp: YYYY-MM-DDTHH:mm:ss[.fraction] with Z or ±HH:mm timezone.',
            );
        });
    }
  }
  if (reviewer && !singleLine(reviewer.trim(), 100))
    errors.push('Reviewer must be a nonblank single line of at most 100 printable characters.');
  return {
    sources,
    errors,
    valid: !!(text.trim() && reviewer.trim() && sources && !errors.length),
  };
}
