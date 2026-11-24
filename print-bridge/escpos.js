// Minimal ESC/POS builder for 80mm thermal printers (Font A = 48 columns). Zero dependencies.
// Every call appends the printer bytes AND a plain-text preview line, so DRY_RUN can show
// exactly what would come out of the printer.

export const COLS = 48;

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Printer is ASCII-only: strip accents, replace anything else with "?". */
export function toAscii(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u00b7\u2022]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e]/g, "?");
}

/** Word-wrap to `width` columns; words longer than a line are hard-split. */
export function wrap(text, width) {
  const lines = [];
  let cur = "";
  for (let word of toAscii(text).split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += " " + word;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export class Doc {
  #bytes = [];
  #preview = [];

  #raw(...b) {
    this.#bytes.push(...b);
    return this;
  }

  init() {
    return this.#raw(ESC, 0x40);
  }

  /** One text line. size = character multiplier 1-8 (width and height), wide/tall override each axis. */
  line(text = "", { align = "left", bold = false, w = 1, h = 1 } = {}) {
    const n = { left: 0, center: 1, right: 2 }[align];
    this.#raw(ESC, 0x61, n, ESC, 0x45, bold ? 1 : 0, GS, 0x21, ((w - 1) << 4) | (h - 1));
    const clean = toAscii(text);
    this.#bytes.push(...Buffer.from(clean, "ascii"), LF);
    // reset so a forgotten style never leaks into the next line
    this.#raw(ESC, 0x45, 0, GS, 0x21, 0, ESC, 0x61, 0);

    const room = Math.floor(COLS / w);
    const pad = align === "center" ? Math.max(0, Math.floor((room - clean.length) / 2)) : align === "right" ? Math.max(0, room - clean.length) : 0;
    const tag = w > 1 || h > 1 || bold ? `  [${[w > 1 || h > 1 ? `${w}x${h}` : "", bold ? "bold" : ""].filter(Boolean).join(" ")}]` : "";
    this.#preview.push(" ".repeat(pad) + clean + tag);
    return this;
  }

  /** Wrapped, styled paragraph. */
  para(text, opts = {}) {
    const lead = text.match(/^ */)[0];
    for (const l of wrap(text, Math.floor(COLS / (opts.w ?? 1)) - lead.length)) this.line(lead + l, opts);
    return this;
  }

  /** left ... right on one 48-col line (normal size). */
  row(left, right, { bold = false } = {}) {
    const r = toAscii(right);
    const room = COLS - r.length - 1;
    const [first, ...rest] = wrap(left, Math.max(8, room));
    this.line(first.padEnd(COLS - r.length) + r, { bold });
    for (const l of rest) this.line(l, { bold });
    return this;
  }

  rule(ch = "-") {
    return this.line(ch.repeat(COLS));
  }

  feed(lines = 1) {
    this.#preview.push(...Array(lines).fill(""));
    return this.#raw(ESC, 0x64, lines);
  }

  cut() {
    this.#preview.push("~".repeat(COLS) + "  [cut]");
    return this.#raw(GS, 0x56, 66, 0);
  }

  /** RJ11 cash drawer pulse: pin 2, 50ms on, 500ms off. */
  drawer() {
    this.#preview.push("[cash drawer opens]");
    return this.#raw(ESC, 0x70, 0, 25, 250);
  }

  bytes() {
    return Buffer.from(this.#bytes);
  }

  text() {
    return this.#preview.join("\n") + "\n";
  }
}
