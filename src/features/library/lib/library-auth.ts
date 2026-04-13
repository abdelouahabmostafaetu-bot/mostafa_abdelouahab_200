export const LIBRARY_ADMIN_PASSWORD = 'library2024';

export function isAdminPasswordValid(password: string | null | undefined): boolean {
  return password === LIBRARY_ADMIN_PASSWORD;
}
