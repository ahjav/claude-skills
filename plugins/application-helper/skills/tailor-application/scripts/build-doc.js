// Build a CV or cover letter .docx from markdown.
//
// Usage:
//   node build-doc.js [--config variant.format.md] [--config config.md] cv.md [out.docx]
//   (several --config files: the first one that sets a key wins)
//   node build-doc.js [--config config.md] letter.md cv.md out.docx   (several inputs, each on a new page)
//
// Requires the "docx" npm package (run with NODE_PATH=$(npm root -g) when installed globally).
// Format of the inputs: see ../references/markdown-format.md
// Config keys read from config.md ("key: value" lines, "#" starts a comment):
//   page_size (A4|Letter), margins_cm ("top 1.2, bottom 1.1, left 1.75, right 1.75"),
//   font, font_size_pt, accent_color (hex without #)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat,
  TabStopType, ExternalHyperlink, PageBreak,
} = require('docx');

// ---------- args and config ----------
const argv = process.argv.slice(2);
const configPaths = [];
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--config') configPaths.push(argv[++i]);
  else rest.push(argv[i]);
}
const inputs = rest.filter(a => a.endsWith('.md'));
if (!inputs.length) { console.error('No .md input given'); process.exit(1); }
const out = rest.find(a => a.endsWith('.docx')) || inputs[0].replace(/\.md$/, '.docx');

function readConfig(p, cfg = {}) {
  if (!p || !fs.existsSync(p)) return cfg;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([a-z_]+)\s*:\s*(.+)$/);
    if (m && !(m[1] in cfg)) cfg[m[1]] = m[2].trim();
  }
  return cfg;
}
const cfg = configPaths.reduce((acc, p) => readConfig(p, acc), {});

const CM = 567; // twips per cm
const PAGE = /letter/i.test(cfg.page_size || '') ? { width: 12240, height: 15840 } : { width: 11906, height: 16838 };
const margin = { top: 680, bottom: 620, left: 1000, right: 1000 };
if (cfg.margins_cm) {
  for (const part of cfg.margins_cm.split(',')) {
    const m = part.trim().match(/^(top|bottom|left|right)\s+([\d.]+)/);
    if (m) margin[m[1]] = Math.round(parseFloat(m[2]) * CM);
  }
}
const FONT = cfg.font || 'Calibri';
const BASE = Math.round((parseFloat(cfg.font_size_pt) || 10) * 2); // half points
const s = k => Math.round(BASE * k); // scale relative to base size
const ACCENT = (cfg.accent_color || '1F3A5F').replace('#', '');
const CONTENT_WIDTH = PAGE.width - margin.left - margin.right;

// ---------- helpers ----------
function runs(text, opts = {}) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(t =>
    t.startsWith('**') ? new TextRun({ text: t.slice(2, -2), bold: true, ...opts })
                       : new TextRun({ text: t, ...opts }));
}

function header(name, contact, outArr, rule = false) {
  outArr.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: name.toUpperCase(), bold: true, size: s(1.8), color: ACCENT, characterSpacing: 40 })],
  }));
  if (!contact) return;
  const kids = [];
  contact.split('|').map(x => x.trim()).forEach((p, i) => {
    if (i) kids.push(new TextRun({ text: '   •   ', color: '888888', size: s(0.95) }));
    if (/linkedin\.com|github\.com|^https?:\/\//.test(p)) {
      kids.push(new ExternalHyperlink({ link: /^https?:/.test(p) ? p : 'https://' + p,
        children: [new TextRun({ text: p, size: s(0.95), color: ACCENT })] }));
    } else kids.push(new TextRun({ text: p, size: s(0.95) }));
  });
  outArr.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
    ...(rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 6 } } } : {}),
    children: kids,
  }));
}

function splitHeader(lines) {
  let i = 0, name = null, contact = null;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length && lines[i].trim().startsWith('# ')) {
    name = lines[i].trim().slice(2); i++;
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && !lines[i].trim().startsWith('#')) { contact = lines[i].trim(); i++; }
  }
  return { name, contact, rest: lines.slice(i) };
}

function buildLetter(lines) {
  const outArr = [];
  const { name, contact, rest: body } = splitHeader(lines);
  if (name) header(name, contact, outArr, true);
  outArr.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  const blocks = body.join('\n').split(/\n\s*\n/)
    .map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
  for (const block of blocks) {
    const kids = [];
    block.forEach((l, i) => { if (i) kids.push(new TextRun({ break: 1 })); kids.push(...runs(l, { size: s(1.1) })); });
    outArr.push(new Paragraph({ spacing: { after: 200, line: 276 }, children: kids }));
  }
  return outArr;
}

function buildCv(lines) {
  const outArr = [];
  const { name, contact, rest: body } = splitHeader(lines);
  if (name) header(name, contact, outArr);
  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      outArr.push(new Paragraph({
        spacing: { before: 160, after: 80 }, keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 2 } },
        children: [new TextRun({ text: line.slice(3).toUpperCase(), bold: true, size: s(1.1), color: ACCENT, characterSpacing: 20 })],
      }));
    } else if (line.startsWith('### ')) {
      const [title, sub, dates] = line.slice(4).split('|').map(x => x && x.trim());
      const left = [new TextRun({ text: title, bold: true, size: s(1.05) })];
      if (sub) left.push(new TextRun({ text: ', ' + sub, size: s(1.05) }));
      if (dates) left.push(new TextRun({ text: '\t' + dates, size: BASE, color: '555555' }));
      outArr.push(new Paragraph({
        spacing: { before: 100, after: 40 }, keepNext: true,
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
        children: left,
      }));
    } else if (line.startsWith('- ')) {
      outArr.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 }, spacing: { after: 20 },
        children: runs(line.slice(2), { size: BASE }),
      }));
    } else {
      outArr.push(new Paragraph({ spacing: { after: 60 }, children: runs(line, { size: BASE }) }));
    }
  }
  return outArr;
}

// ---------- assemble ----------
const children = [];
inputs.forEach((file, idx) => {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const isCv = lines.some(l => l.trim().startsWith('## '));
  if (idx > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(...(isCv ? buildCv(lines) : buildLetter(lines)));
});

const author = (inputs.map(f => splitHeader(fs.readFileSync(f, 'utf8').split(/\r?\n/)).name).find(Boolean)) || '';
const doc = new Document({
  creator: author,
  styles: { default: { document: { run: { font: FONT, size: BASE } } } },
  numbering: { config: [{ reference: 'bullets', levels: [{
    level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 240 } } },
  }] }] },
  sections: [{ properties: { page: { size: PAGE, margin } }, children }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(out, buf);
  console.log('Wrote ' + path.resolve(out));
});
