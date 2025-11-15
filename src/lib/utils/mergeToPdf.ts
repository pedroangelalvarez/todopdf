import { PDFDocument, StandardFonts } from 'pdf-lib';

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isJpeg(file: File) {
  return file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
}

function isPng(file: File) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

async function blobToUint8Array(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export async function mergeToPdf(files: File[]): Promise<Blob> {
  const outPdf = await PDFDocument.create();

  for (const file of files) {
    try {
      if (isPdf(file)) {
        const srcBytes = await blobToUint8Array(file);
        const srcPdf = await PDFDocument.load(srcBytes);
        const copiedPages = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach((p) => outPdf.addPage(p));
      } else if (isJpeg(file)) {
        const imgBytes = await blobToUint8Array(file);
        const img = await outPdf.embedJpg(imgBytes);
        const page = outPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else if (isPng(file)) {
        const imgBytes = await blobToUint8Array(file);
        const img = await outPdf.embedPng(imgBytes);
        const page = outPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else {
        // Skip unsupported types silently or add a placeholder page
        const page = outPdf.addPage([595, 842]);
        const font = await outPdf.embedFont(StandardFonts.Helvetica);
        const text = `Archivo no soportado: ${file.name}`;
        page.setFont(font);
        page.setFontSize(14);
        page.drawText(text, { x: 50, y: 800 });
      }
    } catch (e) {
      const page = outPdf.addPage([595, 842]);
      const font = await outPdf.embedFont(StandardFonts.Helvetica);
      const text = `Error procesando: ${file.name}`;
      page.setFont(font);
      page.setFontSize(14);
      page.drawText(text, { x: 50, y: 800 });
    }
  }

  const mergedBytes = await outPdf.save();
  // Aseguramos que el Blob reciba un ArrayBuffer estándar del rango correcto
  const ab = mergedBytes.buffer.slice(
    mergedBytes.byteOffset,
    mergedBytes.byteOffset + mergedBytes.byteLength
  );
  return new Blob([ab], { type: 'application/pdf' });
}