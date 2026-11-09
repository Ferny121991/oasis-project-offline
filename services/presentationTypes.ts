export function isPresentationFile(file: File): boolean {
  return /\.(pptx|pdf)$/i.test(file.name);
}

export function getPresentationTypeName(file: File): string {
  if (/\.pptx$/i.test(file.name)) return 'PowerPoint';
  if (/\.pdf$/i.test(file.name)) return 'PDF';
  return 'Documento';
}
