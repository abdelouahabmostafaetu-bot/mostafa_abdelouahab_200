import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.env.local');
const ICON_DIR = path.join(ROOT, 'public', 'icons', 'iconscout');
const METADATA_FILE = path.join(ICON_DIR, 'metadata.json');
const PREVIEW_FILE = path.join(ICON_DIR, 'preview.html');

const SEARCH_ENDPOINT = 'https://api.iconscout.com/v3/search';
const DOWNLOAD_ENDPOINT = 'https://api.iconscout.com/v3/items';
const GLOBAL_STYLE = 'line';

const REQUIRED_ICONS = [
  ['home', 'home'],
  ['blog', 'blog article'],
  ['library', 'library'],
  ['book', 'book'],
  ['math', 'mathematics'],
  ['equation', 'equation'],
  ['research', 'research'],
  ['notebook', 'notebook'],
  ['code', 'code'],
  ['dashboard', 'dashboard'],
  ['add', 'add plus'],
  ['edit', 'edit pencil'],
  ['delete', 'delete trash'],
  ['search', 'search'],
  ['user', 'user profile'],
  ['lock', 'lock security'],
  ['github', 'github'],
  ['external-link', 'external link'],
  ['download', 'download'],
  ['document', 'document file'],
  ['settings', 'settings'],
].map(([name, keyword]) => ({ name, keyword }));

const POSITIVE_STYLE_TERMS = ['line', 'outline', 'minimal', 'stroke', 'thin', 'monochrome'];
const NEGATIVE_STYLE_TERMS = [
  'cartoon',
  '3d',
  'sticker',
  'colorful',
  'gradient',
  'isometric',
  'emoji',
  'filled',
  'solid',
  'duotone',
];

function parseEnv(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

async function loadConfig() {
  const content = await readFile(ENV_FILE, 'utf8');
  const env = parseEnv(content);
  const clientId = env.ICONSCOUT_CLIENT_ID;
  const apiKey = env.ICONSCOUT_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error('ICONSCOUT_CLIENT_ID and ICONSCOUT_API_KEY must be set in .env.local.');
  }

  return { clientId, apiKey };
}

function getText(asset) {
  return [
    asset?.name,
    asset?.title,
    asset?.slug,
    asset?.style,
    asset?.type,
    asset?.asset,
    asset?.category,
    asset?.pack?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasSvg(asset) {
  const formats = [
    asset?.formats,
    asset?.format,
    asset?.available_formats,
    asset?.download_formats,
  ]
    .flat()
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return Boolean(
    asset?.urls?.svg ||
      asset?.svg ||
      formats.includes('svg') ||
      asset?.asset === 'icon',
  );
}

function scoreAsset(asset, keyword) {
  const text = getText(asset);
  let score = 0;

  if (hasSvg(asset)) score += 10;
  if (POSITIVE_STYLE_TERMS.some((term) => text.includes(term))) score += 8;
  if (keyword.split(/\s+/).some((term) => text.includes(term))) score += 5;
  if (NEGATIVE_STYLE_TERMS.some((term) => text.includes(term))) score -= 10;
  if (text && !text.includes(GLOBAL_STYLE) && text.includes('solid')) score -= 8;
  if (asset?.uuid || asset?.item_uuid) score += 2;

  return score;
}

function getItems(payload) {
  const candidates = [
    payload?.response?.items?.data,
    payload?.response?.data,
    payload?.items?.data,
    payload?.data,
    payload?.response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

async function searchIcon(config, keyword) {
  const params = new URLSearchParams({
    asset: 'icon',
    query: keyword,
    per_page: '24',
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: {
      'Client-ID': config.clientId,
    },
  });

  if (!response.ok) {
    throw new Error(`IconScout search failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const items = getItems(payload);

  return items
    .map((asset) => ({ asset, score: scoreAsset(asset, keyword) }))
    .sort((a, b) => b.score - a.score);
}

function findStringByKey(value, keys) {
  if (!value || typeof value !== 'object') return null;

  for (const [key, child] of Object.entries(value)) {
    if (keys.includes(key) && typeof child === 'string') {
      return child;
    }

    const nested = findStringByKey(child, keys);
    if (nested) return nested;
  }

  return null;
}

async function extractSvgFromDownloadResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (text.trim().startsWith('<svg')) {
    return text;
  }

  if (!contentType.includes('json')) {
    return text;
  }

  const payload = JSON.parse(text);
  const inlineSvg = findStringByKey(payload, ['svg', 'content', 'data']);
  if (inlineSvg?.trim().startsWith('<svg')) {
    return inlineSvg;
  }

  const downloadUrl = findStringByKey(payload, ['download_url', 'downloadUrl', 'url', 'file_url']);
  if (!downloadUrl) {
    throw new Error('IconScout download response did not include an SVG or download URL.');
  }

  const assetResponse = await fetch(downloadUrl);
  if (!assetResponse.ok) {
    throw new Error(`SVG file download failed with HTTP ${assetResponse.status}.`);
  }

  return assetResponse.text();
}

async function downloadIcon(config, asset) {
  const uuid = asset?.uuid ?? asset?.item_uuid;
  if (!uuid) {
    throw new Error('Selected IconScout asset has no UUID.');
  }

  const response = await fetch(`${DOWNLOAD_ENDPOINT}/${uuid}/api-download`, {
    method: 'POST',
    headers: {
      'Client-ID': config.clientId,
      'Client-Secret': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format: 'svg' }),
  });

  if (!response.ok) {
    throw new Error(`IconScout download failed with HTTP ${response.status}.`);
  }

  return extractSvgFromDownloadResponse(response);
}

function sanitizeSvg(svg) {
  const cleaned = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+=(["']).*?\1/gi, '')
    .replace(/\s(?:href|xlink:href)=(["'])javascript:[\s\S]*?\1/gi, '')
    .trim();

  if (!cleaned.startsWith('<svg')) {
    throw new Error('Downloaded file is not an SVG.');
  }

  return cleaned;
}

function fallbackSvg(name) {
  const paths = {
    home: '<path d="M4 11L12 4l8 7"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M10 20v-6h4v6"/>',
    blog: '<path d="M6 4h9l3 3v13H6z"/><path d="M14 4v4h4"/><path d="M9 11h6"/><path d="M9 14h6"/><path d="M9 17h4"/>',
    library: '<path d="M5 5h4v15H5z"/><path d="M10 4h4v16h-4z"/><path d="M15 6h4v14h-4z"/><path d="M7 8h0"/><path d="M12 8h0"/><path d="M17 10h0"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 5.5v16"/><path d="M8 7h8"/>',
    math: '<path d="M5 6h14"/><path d="M7 18h10"/><path d="M8 6l4 6-4 6"/><path d="M16 6l-4 6 4 6"/>',
    equation: '<path d="M5 8h5"/><path d="M14 8h5"/><path d="M5 16h14"/><path d="M7 5v6"/><path d="M16.5 5.5l-5 5"/>',
    research: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/><path d="M8.5 10.5h4"/><path d="M10.5 8.5v4"/>',
    notebook: '<path d="M7 4h11v16H7z"/><path d="M5 7h4"/><path d="M5 11h4"/><path d="M5 15h4"/><path d="M11 8h4"/><path d="M11 12h4"/>',
    code: '<path d="M9 7l-5 5 5 5"/><path d="M15 7l5 5-5 5"/><path d="M13 5l-2 14"/>',
    dashboard: '<path d="M4 5h7v6H4z"/><path d="M13 5h7v4h-7z"/><path d="M13 11h7v8h-7z"/><path d="M4 13h7v6H4z"/>',
    add: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    edit: '<path d="M5 19l4-1 10-10-3-3L6 15z"/><path d="M14 6l3 3"/><path d="M5 19h14"/>',
    delete: '<path d="M5 7h14"/><path d="M10 11v5"/><path d="M14 11v5"/><path d="M8 7l1 13h6l1-13"/><path d="M10 7V4h4v3"/>',
    search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
    github: '<path d="M9 19c-4 1.5-4-2-6-2"/><path d="M15 21v-3.5c0-1 .3-1.7.8-2.2 2.7-.3 5.2-1.4 5.2-6A4.6 4.6 0 0 0 19.7 6c.1-.4.6-1.8-.1-3.5 0 0-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C7.5 2.2 6.4 2.5 6.4 2.5 5.7 4.2 6.2 5.6 6.3 6A4.6 4.6 0 0 0 5 9.3c0 4.6 2.5 5.7 5.2 6 .5.5.8 1.1.8 2.2V21"/>',
    'external-link': '<path d="M14 5h5v5"/><path d="M19 5l-9 9"/><path d="M11 5H6v13h13v-5"/>',
    download: '<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/>',
    document: '<path d="M6 4h9l3 3v13H6z"/><path d="M15 4v4h3"/><path d="M9 12h6"/><path d="M9 16h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.1 7.1 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7.1 7.1 0 0 0 .1-1z"/>',
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f98a3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.document}</svg>\n`;
}

function getContributor(asset) {
  return asset?.contributor?.name ?? asset?.user?.name ?? asset?.author?.name ?? null;
}

function getLicense(asset) {
  return asset?.license?.name ?? asset?.license ?? asset?.licence ?? null;
}

async function writePreview(metadata) {
  const cards = metadata
    .map(
      (item) => `
        <article class="card">
          <img src="./${item.localFile}" alt="${item.keyword}" />
          <strong>${item.localFile}</strong>
          <span>${item.originalAssetName || item.source}</span>
        </article>`,
    )
    .join('\n');

  await writeFile(
    PREVIEW_FILE,
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IconScout Icon Preview</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #0f0e0d; color: #f5f1e8; }
    main { width: min(1100px, calc(100% - 32px)); margin: 48px auto; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p { color: #b8afa3; margin: 0 0 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
    .card { border: 1px solid #302c27; border-radius: 8px; background: #171512; padding: 18px; display: grid; gap: 10px; }
    img { width: 34px; height: 34px; object-fit: contain; }
    strong { font-size: 13px; }
    span { color: #9d9488; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <main>
    <h1>IconScout Icon Preview</h1>
    <p>Local SVG files used by the website.</p>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`,
    'utf8',
  );
}

async function sync() {
  const config = await loadConfig();
  await mkdir(ICON_DIR, { recursive: true });

  const metadata = [];

  for (const icon of REQUIRED_ICONS) {
    let selected = null;
    let svg = null;
    let source = 'iconscout-api';

    try {
      const results = await searchIcon(config, icon.keyword);
      selected = results[0]?.asset ?? null;

      if (!selected) {
        throw new Error('No IconScout result found.');
      }

      svg = sanitizeSvg(await downloadIcon(config, selected));
    } catch (error) {
      source = 'local-fallback';
      svg = fallbackSvg(icon.name);
      console.warn(`${icon.name}: ${error instanceof Error ? error.message : 'IconScout sync failed.'} Using fallback SVG.`);
    }

    const localFile = `${icon.name}.svg`;
    await writeFile(path.join(ICON_DIR, localFile), svg, 'utf8');

    metadata.push({
      keyword: icon.keyword,
      originalAssetId: selected?.uuid ?? selected?.item_uuid ?? selected?.id ?? null,
      originalAssetName: selected?.name ?? selected?.title ?? null,
      contributor: getContributor(selected),
      license: getLicense(selected),
      source,
      downloadedAt: new Date().toISOString(),
      localFile,
    });
  }

  await writeFile(METADATA_FILE, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  await writePreview(metadata);

  console.log(`Synced ${metadata.length} icons into ${path.relative(ROOT, ICON_DIR)}.`);
}

sync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
