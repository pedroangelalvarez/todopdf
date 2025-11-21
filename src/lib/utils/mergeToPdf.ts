import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isJpeg(file: File) {
  return file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
}

function isPng(file: File) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

function isWord(file: File) {
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword' ||
    file.name.toLowerCase().endsWith('.docx') ||
    file.name.toLowerCase().endsWith('.doc')
  );
}

async function blobToUint8Array(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Limpia el texto eliminando caracteres que no son compatibles con WinAnsi (StandardFonts)
 * WinAnsi soporta básicamente caracteres ASCII (0-127) y algunos caracteres latinos extendidos (128-255)
 * pero no soporta emojis, caracteres asiáticos, símbolos especiales Unicode, etc.
 */
function cleanTextForWinAnsi(text: string): string {
  // Reemplazar caracteres no compatibles con WinAnsi
  // WinAnsi básicamente soporta códigos 32-126 (ASCII imprimible) y algunos de 128-255
  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Mantener:
      // - Caracteres ASCII imprimibles (32-126): espacio, letras, números, puntuación básica
      // - Algunos caracteres latinos extendidos (160-255): á, é, í, ó, ú, ñ, etc.
      // - Tabs y saltos de línea (9, 10, 13)
      if (
        (code >= 32 && code <= 126) || // ASCII imprimible
        (code >= 160 && code <= 255) || // Latinos extendidos
        code === 9 || // Tab
        code === 10 || // Line feed
        code === 13 // Carriage return
      ) {
        return char;
      }
      // Para otros caracteres (emojis, símbolos especiales, etc.), reemplazar con espacio
      // o eliminar si es un carácter de control
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        return ''; // Eliminar caracteres de control
      }
      return ' '; // Reemplazar emojis y otros caracteres especiales con espacio
    })
    .join('');
}

/**
 * Convierte un archivo Word a un PDF independiente
 * Retorna un Blob de PDF o null si hubo un error
 */
async function convertWordToPdf(file: File): Promise<Blob | null> {
  try {
    console.log('🔵 Convirtiendo archivo Word a PDF:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);

    // Verificar que el archivo no esté vacío
    if (file.size === 0) {
      throw new Error('El archivo está vacío');
    }

    // Verificar que sea un formato .docx (mammoth solo soporta .docx, no .doc)
    const isDocx = file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isDocx) {
      console.warn('⚠️ Advertencia: mammoth solo soporta archivos .docx. Este archivo puede ser .doc (formato antiguo)');
      throw new Error('Solo se soportan archivos .docx (Word 2007+). Los archivos .doc antiguos no son compatibles.');
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log('✅ ArrayBuffer obtenido, tamaño:', arrayBuffer.byteLength);

    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('✅ Texto extraído exitosamente. Mensajes de mammoth:', result.messages);

    let text = result.value;
    console.log('📝 Longitud del texto extraído (original):', text.length);

    // Limpiar el texto de caracteres no compatibles con WinAnsi
    text = cleanTextForWinAnsi(text);
    console.log('📝 Longitud del texto después de limpieza:', text.length);

    // Crear un nuevo PDF para este documento Word
    const wordPdf = await PDFDocument.create();

    if (!text || text.trim().length === 0) {
      // Si no hay texto, crear una página con mensaje
      console.warn('⚠️ El documento Word no contiene texto extraíble');
      const page = wordPdf.addPage([595, 842]);
      const font = await wordPdf.embedFont(StandardFonts.Helvetica);
      page.setFont(font);
      page.setFontSize(14);
      page.drawText('Documento Word vacío o no se pudo extraer texto', { x: 50, y: 800 });
    } else {
      // Configuración de página
      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 50;
      const maxWidth = pageWidth - 2 * margin;
      const fontSize = 12;
      const lineHeight = fontSize * 1.5;
      const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

      const font = await wordPdf.embedFont(StandardFonts.Helvetica);

      // Dividir el texto en líneas y palabras
      const paragraphs = text.split(/\n+/);
      const lines: string[] = [];

      for (const paragraph of paragraphs) {
        if (paragraph.trim().length === 0) {
          lines.push('');
          continue;
        }

        const words = paragraph.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }
      }

      console.log('📄 Total de líneas generadas:', lines.length);

      // Crear páginas
      let currentPage = wordPdf.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;
      let lineCount = 0;

      for (const line of lines) {
        if (lineCount >= maxLinesPerPage) {
          currentPage = wordPdf.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
          lineCount = 0;
        }

        currentPage.setFont(font);
        currentPage.setFontSize(fontSize);
        currentPage.drawText(line, { x: margin, y: yPosition, color: rgb(0, 0, 0) });

        yPosition -= lineHeight;
        lineCount++;
      }
    }

    console.log('✅ Documento Word convertido a PDF exitosamente');

    // Guardar el PDF y convertirlo a Blob
    const pdfBytes = await wordPdf.save();
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } catch (error) {
    // Capturar cualquier error y crear un PDF con mensaje de error
    console.error('❌ Error detallado al convertir Word a PDF:', error);
    console.error('📁 Nombre del archivo:', file.name);
    console.error('📋 Tipo del archivo:', file.type);
    console.error('📊 Tamaño del archivo:', file.size);

    // Crear PDF de error
    try {
      const errorPdf = await PDFDocument.create();
      const page = errorPdf.addPage([595, 842]);
      const font = await errorPdf.embedFont(StandardFonts.Helvetica);
      page.setFont(font);
      page.setFontSize(12);

      // Mostrar el mensaje de error específico si está disponible
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorLines = [
        `Error al procesar documento Word:`,
        ``,
        `Archivo: ${file.name}`,
        ``,
        `Motivo: ${errorMessage}`,
        ``,
        `Sugerencia: Verifica que el archivo sea un .docx válido`,
        `(Word 2007 o posterior) y que no esté corrupto.`
      ];

      let yPos = 780;
      for (const line of errorLines) {
        page.drawText(line, { x: 50, y: yPos, color: rgb(0.8, 0, 0) });
        yPos -= 18;
      }

      const pdfBytes = await errorPdf.save();
      return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    } catch (innerError) {
      console.error('❌ Error crítico: No se pudo crear el PDF de error:', innerError);
      return null;
    }
  }
}

export async function mergeToPdf(files: File[]): Promise<Blob> {
  console.log('🚀 Iniciando procesamiento de archivos...');

  // Paso 1: Separar archivos Word de los demás y mantener el orden
  const fileProcessingPlan: Array<{ file: File; type: 'pdf' | 'image' | 'word' | 'other'; index: number }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isWord(file)) {
      fileProcessingPlan.push({ file, type: 'word', index: i });
    } else if (isPdf(file)) {
      fileProcessingPlan.push({ file, type: 'pdf', index: i });
    } else if (isJpeg(file) || isPng(file)) {
      fileProcessingPlan.push({ file, type: 'image', index: i });
    } else {
      fileProcessingPlan.push({ file, type: 'other', index: i });
    }
  }

  // Paso 2: Convertir todos los archivos Word a PDF primero
  console.log('📝 Paso 1: Convirtiendo archivos Word a PDF...');
  const convertedWordPdfs = new Map<number, Blob>();

  for (const item of fileProcessingPlan) {
    if (item.type === 'word') {
      const pdfBlob = await convertWordToPdf(item.file);
      if (pdfBlob) {
        convertedWordPdfs.set(item.index, pdfBlob);
        console.log(`✅ Convertido: ${item.file.name}`);
      } else {
        console.error(`❌ Falló conversión: ${item.file.name}`);
      }
    }
  }

  // Paso 3: Crear el PDF final concatenando todo en orden
  console.log('📋 Paso 2: Concatenando todos los archivos en orden...');
  const outPdf = await PDFDocument.create();

  for (const item of fileProcessingPlan) {
    try {
      if (item.type === 'word') {
        // Usar el PDF convertido previamente
        const convertedPdf = convertedWordPdfs.get(item.index);
        if (convertedPdf) {
          const srcBytes = new Uint8Array(await convertedPdf.arrayBuffer());
          const srcPdf = await PDFDocument.load(srcBytes);
          const copiedPages = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          copiedPages.forEach((p) => outPdf.addPage(p));
          console.log(`✅ Agregado Word convertido: ${item.file.name}`);
        }
      } else if (item.type === 'pdf') {
        const srcBytes = await blobToUint8Array(item.file);
        const srcPdf = await PDFDocument.load(srcBytes);
        const copiedPages = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach((p) => outPdf.addPage(p));
        console.log(`✅ Agregado PDF: ${item.file.name}`);
      } else if (item.type === 'image') {
        const imgBytes = await blobToUint8Array(item.file);
        let img;
        if (isJpeg(item.file)) {
          img = await outPdf.embedJpg(imgBytes);
        } else if (isPng(item.file)) {
          img = await outPdf.embedPng(imgBytes);
        }
        if (img) {
          const page = outPdf.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          console.log(`✅ Agregada imagen: ${item.file.name}`);
        }
      } else {
        // Archivo no soportado
        const page = outPdf.addPage([595, 842]);
        const font = await outPdf.embedFont(StandardFonts.Helvetica);
        const text = `Archivo no soportado: ${item.file.name}`;
        page.setFont(font);
        page.setFontSize(14);
        page.drawText(text, { x: 50, y: 800 });
        console.log(`⚠️ Archivo no soportado: ${item.file.name}`);
      }
    } catch (e) {
      console.error('Error procesando archivo en mergeToPdf:', item.file.name, e);
      const page = outPdf.addPage([595, 842]);
      const font = await outPdf.embedFont(StandardFonts.Helvetica);
      const text = `Error procesando: ${item.file.name}`;
      page.setFont(font);
      page.setFontSize(14);
      page.drawText(text, { x: 50, y: 800 });
    }
  }

  console.log('✅ Procesamiento completado. Generando PDF final...');
  const mergedBytes = await outPdf.save();
  const buffer = mergedBytes.buffer as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}