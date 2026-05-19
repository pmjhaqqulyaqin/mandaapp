/**
 * Normalize Indonesian academic title casing to follow proper conventions.
 * Examples: S.PD -> S.Pd, M.PD -> M.Pd, S.AG -> S.Ag, etc.
 */
export function normalizeGelar(str: string): string {
  return str
    .replace(/S\.PD\b/gi, 'S.Pd')
    .replace(/M\.PD\b/gi, 'M.Pd')
    .replace(/S\.AG\b/gi, 'S.Ag')
    .replace(/M\.AG\b/gi, 'M.Ag')
    .replace(/S\.SOS\b/gi, 'S.Sos')
    .replace(/S\.KOM\b/gi, 'S.Kom')
    .replace(/M\.SI\b/gi, 'M.Si')
    .replace(/S\.HUM\b/gi, 'S.Hum')
    .replace(/M\.HUM\b/gi, 'M.Hum')
    .replace(/S\.KED\b/gi, 'S.Ked')
    .replace(/S\.IP\b/gi, 'S.IP')
    .replace(/M\.PD\.I\b/gi, 'M.Pd.I');
}
