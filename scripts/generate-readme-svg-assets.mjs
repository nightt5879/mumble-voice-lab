import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "docs", "assets", "readme");

mkdirSync(outDir, { recursive: true });

const colors = {
  ink: "#4A3424",
  line: "#6E4D35",
  paper: "#FFF7E9",
  panel: "#FFFCF5",
  warm: "#F5DFC2",
  pink: "#F27DA5",
  pinkSoft: "#FFE0EA",
  blue: "#8CB9E5",
  blueSoft: "#E5F2FF",
  mint: "#8FC9A2",
  mintSoft: "#E3F4E8",
  yellow: "#F4C85D",
  yellowSoft: "#FFF2C7",
  violet: "#B6A0DF",
  violetSoft: "#EEE8FF",
  red: "#E96C6C",
  shadow: "#E8D3B7",
};

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const svg = (width, height, body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="8" stdDeviation="0" flood-color="${colors.shadow}" flood-opacity="1"/>
    </filter>
    <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.2" fill="${colors.warm}" opacity="0.65"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="none"/>
${body}
</svg>
`;

const lineStyle = `stroke="${colors.line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
const textStyle = `font-family="Inter, Avenir, Helvetica, Arial, sans-serif" fill="${colors.ink}"`;

const card = (x, y, w, h, r = 26, fill = colors.paper) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${colors.line}" stroke-width="4" filter="url(#softShadow)"/>`;

const sparkle = (x, y, s = 1, fill = colors.yellow) => `
  <path d="M${x} ${y - 12 * s}L${x + 4 * s} ${y - 4 * s}L${x + 12 * s} ${y}L${x + 4 * s} ${y + 4 * s}L${x} ${y + 12 * s}L${x - 4 * s} ${y + 4 * s}L${x - 12 * s} ${y}L${x - 4 * s} ${y - 4 * s}Z" fill="${fill}" stroke="${colors.line}" stroke-width="${3 * s}" stroke-linejoin="round"/>`;

const waveform = (x, y, scale = 1, stroke = colors.pink) => {
  const bars = [20, 48, 76, 42, 96, 62, 116, 70, 40, 90, 52, 24];
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    ${bars
      .map((height, index) => {
        const bx = index * 18;
        const top = -height / 2;
        return `<rect x="${bx}" y="${top}" width="8" height="${height}" rx="4" fill="${stroke}"/>`;
      })
      .join("\n")}
  </g>`;
};

const fileIcon = (x, y, label, accent = colors.pink, w = 92, h = 112) => `
  <g transform="translate(${x} ${y})">
    <path d="M8 0H60L${w - 8} ${28}V${h - 10}C${w - 8} ${h - 4} ${w - 14} ${h} ${w - 20} ${h}H8C2 ${h} 0 ${h - 4} 0 ${h - 10}V8C0 2 2 0 8 0Z" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M60 0V28H${w - 8}" fill="${colors.warm}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="13" y="${h - 43}" width="${w - 26}" height="28" rx="10" fill="${accent}" stroke="${colors.line}" stroke-width="4"/>
    <text x="${w / 2}" y="${h - 23}" text-anchor="middle" font-size="18" font-weight="800" ${textStyle}>${esc(label)}</text>
  </g>`;

const smallWindow = (x, y, w, h, accent = colors.blue, title = "") => `
  <g transform="translate(${x} ${y})">
    <rect x="0" y="0" width="${w}" height="${h}" rx="22" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4" filter="url(#softShadow)"/>
    <rect x="0" y="0" width="${w}" height="42" rx="22" fill="${colors.warm}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="24" cy="21" r="6" fill="${colors.pink}" stroke="${colors.line}" stroke-width="3"/>
    <circle cx="46" cy="21" r="6" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="3"/>
    <circle cx="68" cy="21" r="6" fill="${accent}" stroke="${colors.line}" stroke-width="3"/>
    ${title ? `<text x="${w - 22}" y="28" text-anchor="end" font-size="15" font-weight="800" ${textStyle}>${esc(title)}</text>` : ""}
  </g>`;

const featureBase = (body, accent = colors.pinkSoft) =>
  svg(
    320,
    220,
    `${card(18, 18, 284, 184, 28, colors.panel)}
  <rect x="38" y="38" width="244" height="144" rx="24" fill="${accent}" opacity="0.62"/>
${body}`
  );

const workflowBase = (step, body, accent = colors.blueSoft) =>
  svg(
    440,
    262,
    `${card(18, 18, 404, 216, 30, colors.panel)}
  <circle cx="56" cy="56" r="22" fill="${accent}" stroke="${colors.line}" stroke-width="4"/>
  <text x="56" y="64" text-anchor="middle" font-size="20" font-weight="900" ${textStyle}>${step}</text>
${body}`
  );

const statusBase = (body, accent = colors.yellowSoft) =>
  svg(
    180,
    140,
    `${card(16, 16, 148, 100, 24, colors.panel)}
  <rect x="34" y="32" width="112" height="68" rx="20" fill="${accent}" opacity="0.75"/>
${body}`
  );

const assets = {
  "mvl-hero.svg": svg(
    1200,
    520,
    `<rect x="24" y="24" width="1152" height="472" rx="44" fill="${colors.paper}" stroke="${colors.line}" stroke-width="6"/>
  <rect x="24" y="24" width="1152" height="472" rx="44" fill="url(#dots)" opacity="0.7"/>
  <g transform="translate(104 112)">
    <path d="M126 38C172 46 206 88 210 146C215 219 172 282 105 282C38 282 -4 225 2 154C8 82 63 27 126 38Z" fill="${colors.pinkSoft}" stroke="${colors.line}" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="77" cy="117" r="10" fill="${colors.ink}"/>
    <circle cx="142" cy="117" r="10" fill="${colors.ink}"/>
    <circle cx="57" cy="150" r="12" fill="${colors.pink}" opacity="0.45"/>
    <circle cx="162" cy="150" r="12" fill="${colors.pink}" opacity="0.45"/>
    <path d="M85 155C101 174 124 175 143 155" ${lineStyle}/>
    <path d="M99 165C109 171 120 171 130 165" stroke="${colors.pink}" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(146 166) rotate(-15)">
      <rect x="0" y="0" width="54" height="82" rx="24" fill="${colors.ink}"/>
      <rect x="9" y="8" width="36" height="50" rx="17" fill="${colors.warm}" stroke="${colors.line}" stroke-width="4"/>
      <path d="M27 58V101" stroke="${colors.line}" stroke-width="6" stroke-linecap="round"/>
      <path d="M8 102H47" stroke="${colors.line}" stroke-width="6" stroke-linecap="round"/>
      <path d="M16 22H38M14 34H40M16 46H38" stroke="${colors.line}" stroke-width="3" stroke-linecap="round"/>
    </g>
  </g>
  <g transform="translate(380 94)">
    <rect x="0" y="0" width="664" height="154" rx="30" fill="${colors.panel}" stroke="${colors.line}" stroke-width="5" filter="url(#softShadow)"/>
    <text x="46" y="68" font-size="56" font-weight="900" letter-spacing="0" ${textStyle}>Mumble Voice Lab</text>
    <text x="48" y="112" font-size="26" font-weight="750" fill="${colors.pink}" font-family="Inter, Avenir, Helvetica, Arial, sans-serif">game-ready mumble / gibberish voices</text>
  </g>
  ${waveform(454, 340, 1.15)}
  ${fileIcon(770, 292, "WAV", colors.pink, 88, 108)}
  ${fileIcon(884, 292, "JSON", colors.mint, 88, 108)}
  <g transform="translate(1016 305)">
    <rect x="0" y="0" width="94" height="86" rx="24" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="4"/>
    <path d="M25 45H69M47 23V67" stroke="${colors.blue}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="23" cy="66" r="6" fill="${colors.pink}" stroke="${colors.line}" stroke-width="3"/>
    <circle cx="71" cy="66" r="6" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="3"/>
  </g>
  <g transform="translate(407 292)">
    <rect x="0" y="0" width="238" height="48" rx="24" fill="${colors.yellowSoft}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="34" cy="24" r="11" fill="${colors.mint}" stroke="${colors.line}" stroke-width="3"/>
    <text x="58" y="31" font-size="20" font-weight="800" ${textStyle}>deterministic audio assets</text>
  </g>
  ${sparkle(1088, 114, 1.1)}
  ${sparkle(342, 396, 0.75, colors.blue)}`
  ),

  "divider-cute.svg": svg(
    960,
    46,
    `<path d="M28 23H388" stroke="${colors.line}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 16"/>
  <path d="M572 23H932" stroke="${colors.line}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 16"/>
  <g transform="translate(428 9)">
    <rect x="0" y="0" width="104" height="28" rx="14" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
    <path d="M18 14C27 1 34 27 43 14C51 3 58 25 67 14C75 4 82 23 90 14" stroke="${colors.pink}" stroke-width="5" stroke-linecap="round"/>
  </g>`
  ),

  "feature-not-tts.svg": featureBase(
    `<g transform="translate(84 54)">
    <path d="M25 20H142C155 20 166 31 166 44V96C166 109 155 120 142 120H83L50 148V120H25C12 120 2 109 2 96V44C2 31 12 20 25 20Z" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
    <text x="84" y="78" text-anchor="middle" font-size="35" font-weight="900" ${textStyle}>Aa</text>
    <path d="M35 119L154 28" stroke="${colors.red}" stroke-width="8" stroke-linecap="round"/>
    <path d="M46 54C59 42 75 38 91 43M122 84C135 76 144 64 146 49" stroke="${colors.pink}" stroke-width="5" stroke-linecap="round"/>
  </g>`,
    colors.pinkSoft
  ),

  "feature-wav-json.svg": featureBase(
    `${fileIcon(68, 54, "WAV", colors.pink, 82, 104)}
  <path d="M153 106H168M160 99V113" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
  ${fileIcon(180, 54, "JSON", colors.mint, 82, 104)}
  ${waveform(91, 94, 0.24, colors.pink)}
  <path d="M208 86C201 92 201 108 208 114M234 86C241 92 241 108 234 114" stroke="${colors.line}" stroke-width="4" stroke-linecap="round" opacity="0.72"/>`,
    colors.yellowSoft
  ),

  "feature-seed.svg": featureBase(
    `<g transform="translate(78 47)">
    <rect x="8" y="34" width="82" height="82" rx="20" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="32" cy="58" r="7" fill="${colors.pink}"/>
    <circle cx="66" cy="92" r="7" fill="${colors.blue}"/>
    <circle cx="32" cy="92" r="7" fill="${colors.mint}"/>
    <path d="M111 49C137 27 178 38 190 72C203 109 172 143 137 137" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
    <path d="M136 137L152 119M136 137L160 144" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
    <path d="M141 67C157 70 167 85 162 101C157 117 141 125 125 119C119 96 122 78 141 67Z" fill="${colors.mint}" stroke="${colors.line}" stroke-width="4"/>
    <path d="M133 84C142 91 148 99 152 110" stroke="${colors.line}" stroke-width="4" stroke-linecap="round"/>
  </g>`,
    colors.mintSoft
  ),

  "feature-expression.svg": featureBase(
    `<g transform="translate(62 54)">
    <circle cx="55" cy="72" r="44" fill="${colors.yellowSoft}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="40" cy="61" r="6" fill="${colors.ink}"/>
    <circle cx="70" cy="61" r="6" fill="${colors.ink}"/>
    <path d="M38 82C48 94 65 94 75 82" ${lineStyle}/>
    <path d="M132 32H224M132 72H224M132 112H224" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="174" cy="32" r="13" fill="${colors.pink}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="204" cy="72" r="13" fill="${colors.blue}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="154" cy="112" r="13" fill="${colors.mint}" stroke="${colors.line}" stroke-width="4"/>
  </g>`,
    colors.violetSoft
  ),

  "feature-reveal.svg": featureBase(
    `<g transform="translate(58 48)">
    <rect x="0" y="16" width="204" height="118" rx="20" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
    <path d="M28 52H154M28 82H118M28 112H170" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>
    <rect x="24" y="46" width="76" height="12" rx="6" fill="${colors.pink}" opacity="0.9"/>
    <rect x="24" y="76" width="118" height="12" rx="6" fill="${colors.blue}" opacity="0.82"/>
    <path d="M212 22V130" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
    <path d="M203 46H222M203 88H222M203 120H222" stroke="${colors.pink}" stroke-width="5" stroke-linecap="round"/>
  </g>`,
    colors.blueSoft
  ),

  "feature-game-ready.svg": featureBase(
    `<g transform="translate(52 50)">
    ${fileIcon(2, 2, "WAV", colors.pink, 76, 96)}
    <path d="M96 76H134" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
    <path d="M122 62L136 76L122 90" ${lineStyle}/>
    <g transform="translate(138 30)">
      <path d="M18 20H108C126 20 140 36 137 54L132 84C130 96 116 101 107 92L88 74H38L19 92C10 101 -4 96 -6 84L-11 54C-14 36 0 20 18 20Z" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M28 50H58M43 35V65" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="93" cy="48" r="7" fill="${colors.pink}" stroke="${colors.line}" stroke-width="3"/>
      <circle cx="115" cy="61" r="7" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="3"/>
    </g>
  </g>`,
    colors.pinkSoft
  ),

  "engine-flow.svg": svg(
    760,
    188,
    `${card(18, 20, 724, 136, 28, colors.panel)}
  ${smallWindow(58, 54, 128, 76, colors.blue)}
  <rect x="76" y="78" width="80" height="10" rx="5" fill="${colors.line}" opacity="0.45"/>
  <rect x="76" y="100" width="52" height="10" rx="5" fill="${colors.blue}"/>
  <path d="M214 88H270" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>
  <path d="M254 70L272 88L254 106" ${lineStyle}/>
  ${fileIcon(306, 42, "WAV", colors.pink, 86, 104)}
  <text x="413" y="98" text-anchor="middle" font-size="34" font-weight="900" fill="${colors.pink}" font-family="Inter, Avenir, Helvetica, Arial, sans-serif">+</text>
  ${fileIcon(438, 42, "JSON", colors.mint, 86, 104)}
  <path d="M548 88H604" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>
  <path d="M588 70L606 88L588 106" ${lineStyle}/>
  <g transform="translate(632 62)">
    <rect x="0" y="0" width="70" height="58" rx="20" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="4"/>
    <path d="M20 30H50M35 15V45" stroke="${colors.blue}" stroke-width="7" stroke-linecap="round"/>
  </g>`
  ),

  "engine-unity-window.svg": svg(
    420,
    300,
    `${smallWindow(26, 28, 368, 230, colors.blue, "Unity")}
  <rect x="60" y="94" width="160" height="116" rx="20" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M108 146L142 112L176 146L142 180Z" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M250 100H346M250 130H330M250 160H356M250 190H316" stroke="${colors.line}" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
  <rect x="252" y="215" width="94" height="22" rx="11" fill="${colors.pink}" stroke="${colors.line}" stroke-width="4"/>`
  ),

  "engine-godot-window.svg": svg(
    420,
    300,
    `${smallWindow(26, 28, 368, 230, colors.mint, "Godot")}
  <rect x="60" y="96" width="160" height="112" rx="20" fill="${colors.mintSoft}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M82 150C96 119 123 108 141 129C162 102 194 124 196 154C198 181 172 197 140 196C107 196 76 180 82 150Z" fill="${colors.blue}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="123" cy="155" r="6" fill="${colors.panel}"/>
  <circle cx="161" cy="155" r="6" fill="${colors.panel}"/>
  <path d="M126 176H160" stroke="${colors.panel}" stroke-width="5" stroke-linecap="round"/>
  <path d="M250 100H346M250 130H330M250 160H356M250 190H316" stroke="${colors.line}" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
  <rect x="252" y="215" width="94" height="22" rx="11" fill="${colors.mint}" stroke="${colors.line}" stroke-width="4"/>`
  ),

  "engine-plugin-dock.svg": svg(
    300,
    420,
    `${card(24, 24, 252, 352, 28, colors.panel)}
  <rect x="24" y="24" width="252" height="48" rx="24" fill="${colors.warm}" stroke="${colors.line}" stroke-width="4"/>
  <circle cx="58" cy="48" r="11" fill="${colors.pink}" stroke="${colors.line}" stroke-width="3"/>
  <path d="M226 42L238 54L250 42" ${lineStyle}/>
  <rect x="50" y="100" width="200" height="48" rx="14" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M72 124H206" stroke="${colors.line}" stroke-width="7" stroke-linecap="round" opacity="0.35"/>
  <rect x="50" y="168" width="200" height="48" rx="14" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M74 192H188" stroke="${colors.line}" stroke-width="7" stroke-linecap="round" opacity="0.35"/>
  <rect x="50" y="236" width="200" height="66" rx="18" fill="${colors.pinkSoft}" stroke="${colors.line}" stroke-width="4"/>
  ${waveform(76, 269, 0.5, colors.pink)}
  <g transform="translate(56 326)">
    <rect x="0" y="0" width="54" height="38" rx="12" fill="${colors.ink}"/>
    <path d="M22 11L37 19L22 27Z" fill="${colors.panel}"/>
    <path d="M80 20H184" stroke="${colors.line}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="140" cy="20" r="12" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="4"/>
  </g>`
  ),

  "workflow-01-input.svg": workflowBase(
    "1",
    `<rect x="96" y="72" width="252" height="104" rx="22" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M124 106H310M124 136H258" stroke="${colors.line}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
  <path d="M326 72L366 50V104Z" fill="${colors.pinkSoft}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M130 174L112 204L154 180" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>`,
    colors.pinkSoft
  ),

  "workflow-02-analysis.svg": workflowBase(
    "2",
    `<rect x="98" y="78" width="206" height="110" rx="22" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M126 110H246M126 140H260M126 170H206" stroke="${colors.line}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
  <circle cx="292" cy="114" r="45" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="5"/>
  <path d="M324 146L374 196" stroke="${colors.line}" stroke-width="8" stroke-linecap="round"/>
  <path d="M274 108C284 98 299 97 310 107" stroke="${colors.blue}" stroke-width="6" stroke-linecap="round"/>`,
    colors.blueSoft
  ),

  "workflow-03-generate.svg": workflowBase(
    "3",
    `<g transform="translate(110 74)">
    <circle cx="84" cy="74" r="58" fill="${colors.pinkSoft}" stroke="${colors.line}" stroke-width="4"/>
    <circle cx="64" cy="63" r="7" fill="${colors.ink}"/>
    <circle cx="105" cy="63" r="7" fill="${colors.ink}"/>
    <path d="M66 89C80 101 98 101 111 89" ${lineStyle}/>
    ${waveform(150, 74, 0.52, colors.pink)}
  </g>
  ${sparkle(342, 72, 0.8, colors.yellow)}
  ${sparkle(94, 184, 0.6, colors.blue)}`,
    colors.violetSoft
  ),

  "workflow-04-export.svg": workflowBase(
    "4",
    `${fileIcon(120, 68, "WAV", colors.pink, 82, 104)}
  ${fileIcon(220, 68, "JSON", colors.mint, 82, 104)}
  <path d="M310 120H364" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>
  <path d="M348 101L367 120L348 139" ${lineStyle}/>
  <rect x="96" y="198" width="240" height="18" rx="9" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="4"/>`,
    colors.yellowSoft
  ),

  "workflow-05-sync.svg": workflowBase(
    "5",
    `<rect x="92" y="78" width="266" height="116" rx="22" fill="${colors.paper}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M122 112H294M122 146H238" stroke="${colors.line}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
  <path d="M116 198H354" stroke="${colors.line}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="150" cy="198" r="10" fill="${colors.pink}" stroke="${colors.line}" stroke-width="4"/>
  <circle cx="234" cy="198" r="10" fill="${colors.blue}" stroke="${colors.line}" stroke-width="4"/>
  <circle cx="322" cy="198" r="10" fill="${colors.mint}" stroke="${colors.line}" stroke-width="4"/>`,
    colors.mintSoft
  ),

  "workflow-06-gameplay.svg": workflowBase(
    "6",
    `<rect x="96" y="70" width="250" height="140" rx="26" fill="${colors.blueSoft}" stroke="${colors.line}" stroke-width="4"/>
  <rect x="120" y="96" width="202" height="78" rx="18" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M150 136H196M173 113V159" stroke="${colors.blue}" stroke-width="7" stroke-linecap="round"/>
  ${waveform(218, 138, 0.35, colors.pink)}
  <path d="M166 210H276" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>`,
    colors.blueSoft
  ),

  "ui-warning.svg": statusBase(
    `<path d="M90 38L129 94H51L90 38Z" fill="${colors.yellow}" stroke="${colors.line}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M90 58V75" stroke="${colors.line}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="90" cy="86" r="4.5" fill="${colors.line}"/>`,
    colors.yellowSoft
  ),

  "ui-issue.svg": statusBase(
    `<path d="M50 52H130C138 52 144 58 144 66V92C144 100 138 106 130 106H86L68 122V106H50C42 106 36 100 36 92V66C36 58 42 52 50 52Z" fill="${colors.panel}" stroke="${colors.line}" stroke-width="4"/>
  <path d="M64 74H116M64 90H98" stroke="${colors.blue}" stroke-width="6" stroke-linecap="round"/>`,
    colors.blueSoft
  ),

  "ui-download.svg": statusBase(
    `<path d="M90 42V84" stroke="${colors.line}" stroke-width="7" stroke-linecap="round"/>
  <path d="M70 68L90 88L110 68" ${lineStyle}/>
  <rect x="54" y="92" width="72" height="20" rx="10" fill="${colors.mint}" stroke="${colors.line}" stroke-width="4"/>`,
    colors.mintSoft
  ),
};

for (const [name, content] of Object.entries(assets)) {
  writeFileSync(join(outDir, name), content, "utf8");
}

console.log(`Generated ${Object.keys(assets).length} README SVG assets.`);
