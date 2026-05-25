/**
 * Normalize Indonesian academic title casing to follow proper conventions.
 * Examples: S.PD -> S.Pd, M.PD -> M.Pd, S.AG -> S.Ag, etc.
 */
export function normalizeGelar(str: string): string {
  return str
    // First normalize comma separators to dots (e.g. S,AG -> S.AG, S,UD -> S.UD)
    .replace(/([SM])\s*,\s*(PD|AG|UD|SY|SOS|KOM|SI|HUM|KED|IP|FIL|AP|E|H|T)\b/gi, '$1.$2')
    .replace(/S\.PD\b/gi, 'S.Pd')
    .replace(/M\.PD\b/gi, 'M.Pd')
    .replace(/S\.AG\b/gi, 'S.Ag')
    .replace(/M\.AG\b/gi, 'M.Ag')
    .replace(/S\.SY\b/gi, 'S.Sy')
    .replace(/M\.SY\b/gi, 'M.Sy')
    .replace(/S\.UD\b/gi, 'S.Ud')
    .replace(/M\.UD\b/gi, 'M.Ud')
    .replace(/S\.SOS\b/gi, 'S.Sos')
    .replace(/S\.KOM\b/gi, 'S.Kom')
    .replace(/M\.SI\b/gi, 'M.Si')
    .replace(/S\.HUM\b/gi, 'S.Hum')
    .replace(/M\.HUM\b/gi, 'M.Hum')
    .replace(/S\.KED\b/gi, 'S.Ked')
    .replace(/S\.IP\b/gi, 'S.IP')
    .replace(/M\.PD\.I\b/gi, 'M.Pd.I');
}

/**
 * Uppercase a name string while preserving academic title casing.
 * CSS `text-transform: uppercase` would break gelar like S.Pd -> S.PD,
 * so we uppercase programmatically but protect gelar patterns.
 * 
 * Example: "Mehram, S.Pd, M.AP" -> "MEHRAM, S.Pd, M.AP"
 */
export function smartUpperCase(str: string): string {
  // First normalize gelar
  const normalized = normalizeGelar(str);

  // Gelar patterns to preserve (with correct casing)
  const gelarPatterns = [
    /S\.Pd\.I\b/g, /M\.Pd\.I\b/g,
    /S\.Pd\b/g, /M\.Pd\b/g,
    /S\.Ag\b/g, /M\.Ag\b/g,
    /S\.Sy\b/g, /M\.Sy\b/g,
    /S\.Ud\b/g, /M\.Ud\b/g,
    /S\.Sos\b/g, /S\.Kom\b/g,
    /M\.Si\b/g, /S\.Hum\b/g, /M\.Hum\b/g,
    /S\.Ked\b/g, /S\.IP\b/g,
    /M\.AP\b/gi, /S\.AP\b/gi,
    /M\.M\b/g, /S\.E\b/g, /M\.E\b/g,
    /S\.H\b/g, /M\.H\b/g,
    /S\.T\b/g, /M\.T\b/g,
    /S\.Fil\b/g, /M\.Fil\b/g,
  ];

  // Collect gelar positions and their correct casing
  const preserveList: { start: number; end: number; text: string }[] = [];
  for (const pattern of gelarPatterns) {
    let match;
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    while ((match = pattern.exec(normalized)) !== null) {
      preserveList.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }
  }

  // Sort by start position descending to replace from end
  preserveList.sort((a, b) => b.start - a.start);

  // Uppercase the whole string first
  let result = normalized.toUpperCase();

  // Restore gelar casing
  for (const item of preserveList) {
    result = result.substring(0, item.start) + item.text + result.substring(item.end);
  }

  return result;
}
