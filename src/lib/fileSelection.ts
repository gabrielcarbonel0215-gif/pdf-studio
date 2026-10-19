/** Apply the same accept rules to picker, drag/drop and clipboard files. */
export function selectAcceptedFiles<T extends { name: string; type: string }>(
  files: T[], accept: string, multiple: boolean,
): T[] {
  const rules = accept.toLowerCase().split(',').map(rule => rule.trim()).filter(Boolean);
  const accepted = files.filter(file => rules.length === 0 || rules.some(rule => {
    if (rule === '*/*') return true;
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
    // Some browsers supply an empty MIME type for PDF files.
    return file.type.toLowerCase() === rule ||
      (rule === 'application/pdf' && !file.type && file.name.toLowerCase().endsWith('.pdf'));
  }));
  return multiple ? accepted : accepted.slice(0, 1);
}
