/**
 * remark-video — converts a fenced code block tagged as video (or youtube/vimeo)
 * into an embedded player.
 *
 * It rewrites the mdast code node using data.hName / data.hProperties /
 * data.hChildren, which are honored by both mdast-util-to-hast (remark-rehype,
 * used by the preview pipeline) and @mdx-js/mdx (used by the live blog page). This
 * keeps the rendered output consistent between the editor preview and the published post.
 *
 * Supports YouTube, Vimeo, and direct video files (e.g. .mp4 / .webm).
 */

type GenericNode = {
  type?: string;
  lang?: string | null;
  value?: string;
  children?: GenericNode[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

const VIDEO_LANGUAGES = new Set(['video', 'youtube', 'vimeo']);

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
    /youtube\.com\/live\/([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ?? null;
}

function buildEmbed(rawUrl: string): GenericNode | null {
  const url = rawUrl.trim();
  if (!isHttpUrl(url)) {
    return null;
  }

  const youTubeId = getYouTubeId(url);
  const vimeoId = youTubeId ? null : getVimeoId(url);

  if (youTubeId || vimeoId) {
    const embedSrc = youTubeId
      ? 'https://www.youtube.com/embed/' + youTubeId
      : 'https://player.vimeo.com/video/' + String(vimeoId);

    const iframe: GenericNode = {
      type: 'element',
      tagName: 'iframe',
      properties: {
        src: embedSrc,
        title: 'Embedded video',
        loading: 'lazy',
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
        style:
          'position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:0.75rem;',
      },
      children: [],
    };

    return {
      type: 'element',
      tagName: 'div',
      properties: {
        className: ['blog-video', 'blog-video--embed'],
        style:
          'position:relative;width:100%;aspect-ratio:16 / 9;margin:1.75rem 0;overflow:hidden;border-radius:0.75rem;background:#000;',
      },
      children: [iframe],
    };
  }

  return {
    type: 'element',
    tagName: 'video',
    properties: {
      controls: true,
      preload: 'metadata',
      playsInline: true,
      src: url,
      className: ['blog-video'],
      style:
        'display:block;width:100%;margin:1.75rem auto;border-radius:0.75rem;background:#000;',
    },
    children: [],
  };
}

function applyEmbed(node: GenericNode): void {
  const embed = buildEmbed(node.value ?? '');
  if (!embed) {
    return;
  }

  node.data = node.data ?? {};
  (node.data as Record<string, unknown>).hName = embed.tagName;
  (node.data as Record<string, unknown>).hProperties = embed.properties;
  (node.data as Record<string, unknown>).hChildren = embed.children;
}

function visitNode(node: GenericNode): void {
  if (
    node.type === 'code' &&
    typeof node.lang === 'string' &&
    VIDEO_LANGUAGES.has(node.lang.toLowerCase())
  ) {
    applyEmbed(node);
    return;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visitNode(child);
    }
  }
}

export function remarkVideo() {
  return (tree: unknown): void => {
    visitNode(tree as GenericNode);
  };
}

export default remarkVideo;
