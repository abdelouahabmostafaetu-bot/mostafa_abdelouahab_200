export const siteIconNames = [
  'home',
  'blog',
  'library',
  'book',
  'math',
  'equation',
  'research',
  'notebook',
  'code',
  'dashboard',
  'add',
  'edit',
  'delete',
  'search',
  'user',
  'lock',
  'github',
  'external-link',
  'download',
  'document',
  'settings',
] as const;

export type SiteIconName = (typeof siteIconNames)[number];

type SiteIconProps = {
  name: SiteIconName;
  alt: string;
  className?: string;
};

export default function SiteIcon({ name, alt, className = 'h-5 w-5' }: SiteIconProps) {
  // Local SVG assets are tiny UI symbols; using img keeps them static and client-safe.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/iconscout/${name}.svg`} alt={alt} className={className} />;
}
