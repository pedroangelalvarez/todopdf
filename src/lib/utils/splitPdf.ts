import { PDFDocument } from 'pdf-lib';

export async function splitPdfIntoPages(file: File): Promise<File[]> {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer);
  const pageCount = srcDoc.getPages().length;

  const base = file.name.replace(/\.pdf$/i, '') || 'document';
  const outFiles: File[] = [];

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);
    const bytes = await newDoc.save();
    // Convierte Uint8Array a ArrayBuffer estrictamente del rango válido
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const pageFile = new File([arrayBuffer], `${base}_page_${i + 1}.pdf`, { type: 'application/pdf', lastModified: Date.now() });
    outFiles.push(pageFile);
  }

  return outFiles;
}