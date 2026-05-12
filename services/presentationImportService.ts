/**
 * Presentation Import Service
 * 
 * Parses PowerPoint (.pptx) and PDF files into the app's Slide format.
 * - PPTX: Extracts text content and embedded images from each slide
 * - PDF: Renders each page as a high-quality image
 */

import JSZip from 'jszip';
import { init as initPptxPreview } from 'pptx-preview';
import { toJpeg } from 'html-to-image';
import { Slide } from '../types';
import { compressImage } from './imageService';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const PPTX_SLIDE_WIDTH_EMU = 9144000;
const PPTX_SLIDE_HEIGHT_EMU = 5143500;
const PPTX_CANVAS_WIDTH = 1920;
const PPTX_CANVAS_HEIGHT = 1080;

// ─────────────────────────────────────────────
// PPTX PARSING
// ─────────────────────────────────────────────

/**
 * Parse a PowerPoint file and extract slides with text and images.
 */
export async function parsePptxFile(file: File): Promise<Slide[]> {
  const zip = await JSZip.loadAsync(file);
  const slides: Slide[] = [];
  const parser = new DOMParser();
  const slideSize = await getPresentationSlideSize(zip);

  // Find all slide XML files (ppt/slides/slide1.xml, slide2.xml, etc.)
  const slideFiles: { name: string; index: number }[] = [];
  zip.forEach((path) => {
    const match = path.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push({ name: path, index: parseInt(match[1], 10) });
    }
  });

  // Sort by slide number
  slideFiles.sort((a, b) => a.index - b.index);

  const slideTextByIndex = new Map<number, string>();
  for (const slideFile of slideFiles) {
    const xmlFile = zip.file(slideFile.name);
    if (!xmlFile) continue;
    slideTextByIndex.set(slideFile.index, extractTextFromSlideXml(await xmlFile.async('text')));
  }

  try {
    return await renderPptxWithPreviewer(file, slideFiles, slideTextByIndex);
  } catch (e) {
    console.warn('PPTX preview render failed, falling back to simplified renderer:', e);
  }

  // Extract all media files (images) from ppt/media/
  const mediaMap = new Map<string, string>(); // rId -> dataUrl
  const mediaFiles: { path: string; blob: Blob }[] = [];
  
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (path.startsWith('ppt/media/') && !zipEntry.dir) {
      const blob = await zipEntry.async('blob');
      mediaFiles.push({ path, blob });
    }
  }

  // Parse relationship files to map rIds to media files
  const relMap = new Map<number, Map<string, string>>(); // slideIndex -> (rId -> mediaPath)
  
  for (const slideFile of slideFiles) {
    const relPath = `ppt/slides/_rels/slide${slideFile.index}.xml.rels`;
    const relFile = zip.file(relPath);
    if (relFile) {
      const relXml = await relFile.async('text');
      const rIdToPath = new Map<string, string>();
      
      // Parse relationship XML to find image references
      const relRegex = /Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
      let relMatch;
      while ((relMatch = relRegex.exec(relXml)) !== null) {
        const rId = relMatch[1];
        const target = relMatch[2];
        if (target.includes('media/') || target.includes('image')) {
          // Resolve relative path
          const fullPath = target.startsWith('../') 
            ? 'ppt/' + target.replace('../', '') 
            : 'ppt/slides/' + target;
          rIdToPath.set(rId, fullPath);
        }
      }
      relMap.set(slideFile.index, rIdToPath);
    }
  }

  // Process each slide as a visual image. This preserves mixed image/text slides
  // much better than importing only raw text.
  for (const slideFile of slideFiles) {
    const xmlFile = zip.file(slideFile.name);
    if (!xmlFile) continue;

    const xmlContent = await xmlFile.async('text');
    const textContent = extractTextFromSlideXml(xmlContent);

    try {
      const slideImage = await renderPptxSlideToImage(
        parser.parseFromString(xmlContent, 'application/xml'),
        relMap.get(slideFile.index) || new Map<string, string>(),
        mediaFiles,
        slideSize
      );

      slides.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: '',
        mediaUrl: slideImage,
        label: `SLIDE ${slideFile.index}`
      });
    } catch (e) {
      console.warn('PPTX visual render failed, falling back to text:', e);
      slides.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        content: textContent.trim() || `Diapositiva ${slideFile.index}`,
        label: `SLIDE ${slideFile.index}`
      });
    }
  }

  return slides;
}

/**
 * Extract text content from PPTX slide XML.
 * Looks for <a:t> tags which contain the actual text.
 */
function extractTextFromSlideXml(xml: string): string {
  const lines: string[] = [];
  
  // Find all text paragraphs <a:p> containing <a:t> text runs
  // We need to group text by paragraph
  const paragraphRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let pMatch;
  
  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const paragraphContent = pMatch[1];
    
    // Extract all text runs <a:t> within this paragraph
    const textRegex = /<a:t>([^<]*)<\/a:t>/g;
    let tMatch;
    let paragraphText = '';
    
    while ((tMatch = textRegex.exec(paragraphContent)) !== null) {
      paragraphText += tMatch[1];
    }
    
    if (paragraphText.trim()) {
      lines.push(paragraphText);
    }
  }
  
  return lines.join('\n');
}

/**
 * Extract the first image relationship ID from slide XML.
 * Looks for <a:blip r:embed="rIdX"/> references.
 */
function extractImageRIdFromSlideXml(xml: string): string | null {
  // Look for blip references (embedded images)
  const blipMatch = xml.match(/<a:blip[^>]*r:embed="([^"]+)"/);
  return blipMatch ? blipMatch[1] : null;
}

async function renderPptxWithPreviewer(
  file: File,
  slideFiles: { name: string; index: number }[],
  _slideTextByIndex: Map<number, string>
): Promise<Slide[]> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${PPTX_CANVAS_WIDTH}px`;
  host.style.height = `${PPTX_CANVAS_HEIGHT}px`;
  host.style.pointerEvents = 'none';
  host.style.opacity = '1';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  try {
    const previewer = initPptxPreview(host, {
      width: PPTX_CANVAS_WIDTH,
      height: PPTX_CANVAS_HEIGHT,
      mode: 'list',
    });

    await previewer.preview(await file.arrayBuffer());
    await waitForPptxPreviewAssets(host);

    const renderedSlides = Array.from(host.querySelectorAll<HTMLElement>('.pptx-preview-slide-wrapper'));
    if (!renderedSlides.length) {
      throw new Error('No PPTX slides rendered');
    }

    const importedSlides: Slide[] = [];
    for (let i = 0; i < renderedSlides.length; i++) {
      const slideNode = renderedSlides[i];
      slideNode.style.margin = '0';
      slideNode.style.boxShadow = 'none';

      const slideIndex = slideFiles[i]?.index ?? i + 1;
      let dataUrl = await toJpeg(slideNode, {
        quality: 0.92,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: PPTX_CANVAS_WIDTH,
        height: PPTX_CANVAS_HEIGHT,
        style: {
          margin: '0',
          transform: 'none',
        },
      });

      try {
        dataUrl = await compressImage(dataUrl, PPTX_CANVAS_WIDTH, PPTX_CANVAS_HEIGHT, 0.88);
      } catch (e) {
        // Keep the captured slide if compression fails.
      }

      importedSlides.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        content: '',
        mediaUrl: dataUrl,
        label: `SLIDE ${slideIndex}`,
      });
    }

    previewer.destroy?.();
    return importedSlides;
  } finally {
    host.remove();
  }
}

async function waitForPptxPreviewAssets(host: HTMLElement): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const images = Array.from(host.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }));

  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Font readiness is best effort.
    }
  }

  await new Promise(resolve => setTimeout(resolve, 250));
}

async function getPresentationSlideSize(zip: JSZip): Promise<{ width: number; height: number }> {
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  if (!presentationXml) {
    return { width: PPTX_SLIDE_WIDTH_EMU, height: PPTX_SLIDE_HEIGHT_EMU };
  }

  const sizeMatch = presentationXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  if (!sizeMatch) {
    return { width: PPTX_SLIDE_WIDTH_EMU, height: PPTX_SLIDE_HEIGHT_EMU };
  }

  return {
    width: Number(sizeMatch[1]) || PPTX_SLIDE_WIDTH_EMU,
    height: Number(sizeMatch[2]) || PPTX_SLIDE_HEIGHT_EMU,
  };
}

async function renderPptxSlideToImage(
  doc: Document,
  relationships: Map<string, string>,
  mediaFiles: { path: string; blob: Blob }[],
  slideSize: { width: number; height: number }
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = PPTX_CANVAS_WIDTH;
  canvas.height = PPTX_CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const scaleX = canvas.width / slideSize.width;
  const scaleY = canvas.height / slideSize.height;

  ctx.fillStyle = readSlideBackground(doc) || '#050711';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tree = doc.getElementsByTagName('p:spTree')[0];
  const children = tree ? Array.from(tree.children) : [];

  for (const child of children) {
    if (child.tagName === 'p:pic') {
      await drawPptxPicture(ctx, child, relationships, mediaFiles, scaleX, scaleY, canvas);
    } else if (child.tagName === 'p:sp') {
      drawPptxShapeText(ctx, child, scaleX, scaleY, canvas);
    }
  }

  let dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  try {
    dataUrl = await compressImage(dataUrl, PPTX_CANVAS_WIDTH, PPTX_CANVAS_HEIGHT, 0.86);
  } catch (e) {
    // Keep the rendered slide if compression fails.
  }

  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

function readSlideBackground(doc: Document): string | null {
  const bgPr = doc.getElementsByTagName('p:bgPr')[0];
  if (!bgPr) return null;
  return readColor(bgPr, null);
}

function getShapeRect(
  node: Element,
  scaleX: number,
  scaleY: number,
  canvas: HTMLCanvasElement
): { x: number; y: number; width: number; height: number } {
  const xfrm = node.getElementsByTagName('a:xfrm')[0];
  const off = xfrm?.getElementsByTagName('a:off')[0];
  const ext = xfrm?.getElementsByTagName('a:ext')[0];

  return {
    x: Number(off?.getAttribute('x') || 0) * scaleX,
    y: Number(off?.getAttribute('y') || 0) * scaleY,
    width: Math.max(1, Number(ext?.getAttribute('cx') || canvas.width / scaleX) * scaleX),
    height: Math.max(1, Number(ext?.getAttribute('cy') || canvas.height / scaleY) * scaleY),
  };
}

async function drawPptxPicture(
  ctx: CanvasRenderingContext2D,
  node: Element,
  relationships: Map<string, string>,
  mediaFiles: { path: string; blob: Blob }[],
  scaleX: number,
  scaleY: number,
  canvas: HTMLCanvasElement
) {
  const blip = node.getElementsByTagName('a:blip')[0];
  const rId = blip?.getAttribute('r:embed');
  if (!rId) return;

  const mediaPath = normalizePptPath(relationships.get(rId) || '');
  const media = mediaFiles.find((item) => normalizePptPath(item.path) === mediaPath);
  if (!media) return;

  const rect = getShapeRect(node, scaleX, scaleY, canvas);
  const dataUrl = await blobToDataUrl(media.blob);
  const image = await loadImage(dataUrl);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function drawPptxShapeText(
  ctx: CanvasRenderingContext2D,
  node: Element,
  scaleX: number,
  scaleY: number,
  canvas: HTMLCanvasElement
) {
  const rect = getShapeRect(node, scaleX, scaleY, canvas);
  const fill = readShapeFill(node);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  const paragraphs = Array.from(node.getElementsByTagName('a:p'));
  if (!paragraphs.length) return;

  let cursorY = rect.y + Math.max(18, rect.height * 0.08);
  const paddingX = Math.max(16, rect.width * 0.04);
  const maxWidth = Math.max(20, rect.width - paddingX * 2);

  for (const paragraph of paragraphs) {
    const runs = Array.from(paragraph.getElementsByTagName('a:r'));
    const pPr = paragraph.getElementsByTagName('a:pPr')[0];
    const align = pPr?.getAttribute('algn') || 'l';

    if (!runs.length) {
      cursorY += 20;
      continue;
    }

    const text = runs
      .map((run) =>
        Array.from(run.getElementsByTagName('a:t'))
          .map((t) => decodeXml(t.textContent || ''))
          .join('')
      )
      .join('');
    if (!text.trim()) {
      cursorY += 20;
      continue;
    }

    const styleSource = runs.find((run) => run.getElementsByTagName('a:t').length > 0) || runs[0];
    const style = readRunStyle(styleSource.getElementsByTagName('a:rPr')[0]);
    const fontPx = pptFontPx(style.fontSize);
    const weight = style.bold ? '700' : '500';
    const italic = style.italic ? 'italic ' : '';
    ctx.font = `${italic}${weight} ${fontPx}px "${style.fontFamily}", Arial, sans-serif`;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'top';

    const lines = wrapCanvasText(ctx, text, maxWidth);
    const lineHeight = Math.round(fontPx * 1.18);

    for (const line of lines) {
      if (cursorY + lineHeight > rect.y + rect.height) return;
      const textWidth = ctx.measureText(line).width;
      const x =
        align === 'ctr'
          ? rect.x + (rect.width - textWidth) / 2
          : align === 'r'
            ? rect.x + rect.width - paddingX - textWidth
            : rect.x + paddingX;
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 12;
  }
}

function readShapeFill(node: Element): string | null {
  const spPr = node.getElementsByTagName('p:spPr')[0];
  if (!spPr) return null;
  return readColor(spPr, null);
}

function readRunStyle(rPr?: Element): {
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
} {
  const latin = rPr?.getElementsByTagName('a:latin')[0];
  return {
    fontSize: Number(rPr?.getAttribute('sz') || 3200) / 100,
    fontFamily: latin?.getAttribute('typeface') || 'Montserrat',
    color: rPr ? readColor(rPr, '#ffffff') || '#ffffff' : '#ffffff',
    bold: rPr?.getAttribute('b') === '1',
    italic: rPr?.getAttribute('i') === '1',
  };
}

function readColor(node: Element, fallback: string | null): string | null {
  const solidFill = node.getElementsByTagName('a:solidFill')[0];
  if (!solidFill) return fallback;

  const srgb = solidFill.getElementsByTagName('a:srgbClr')[0];
  if (srgb?.getAttribute('val')) {
    const alpha = Number(srgb.getElementsByTagName('a:alpha')[0]?.getAttribute('val') || 100000) / 100000;
    return hexToRgba(srgb.getAttribute('val') || '', alpha);
  }

  const scheme = solidFill.getElementsByTagName('a:schemeClr')[0]?.getAttribute('val');
  const schemeMap: Record<string, string> = {
    bg1: '#ffffff',
    tx1: '#111827',
    bg2: '#050711',
    tx2: '#ffffff',
    accent1: '#6d5dfc',
    accent2: '#12b981',
    accent3: '#f97316',
    accent4: '#38bdf8',
    accent5: '#ec4899',
    accent6: '#facc15',
  };
  return scheme ? schemeMap[scheme] || fallback : fallback;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function pptFontPx(points: number): number {
  return Math.max(18, Math.round(points * 2.15));
}

function normalizePptPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/\.\//g, '/');
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.replace('#', '').padStart(6, '0').slice(0, 6);
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// ─────────────────────────────────────────────
// PDF PARSING
// ─────────────────────────────────────────────

/**
 * Parse a PDF file and render each page as a high-quality image slide.
 */
export async function parsePdfFile(file: File): Promise<Slide[]> {
  // Dynamically import pdf.js to keep initial bundle small
  const pdfjsLib = await import('pdfjs-dist');
  
  // Use the bundled worker so PDF import works in offline/production builds.
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  
  const slides: Slide[] = [];
  const totalPages = pdf.numPages;
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Render at 2x scale for crisp projector display
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas as any,
    } as any).promise;
    
    // Convert to compressed JPEG
    let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // Further compress if needed
    try {
      dataUrl = await compressImage(dataUrl, 1920, 1080, 0.8);
    } catch (e) {
      // Use original if compression fails
    }
    
    // Also try to extract text from the page for accessibility
    let textContent = '';
    try {
      const textData = await page.getTextContent();
      textContent = textData.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
    } catch (e) {
      // Text extraction is optional
    }
    
    slides.push({
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      content: textContent ? textContent.substring(0, 200) : '',
      mediaUrl: dataUrl,
      label: `PÁG ${pageNum}/${totalPages}`
    });
    
    // Clean up
    canvas.width = 0;
    canvas.height = 0;
  }
  
  return slides;
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if a file is a supported presentation format.
 */
export function isPresentationFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return ext.endsWith('.pptx') || ext.endsWith('.pdf');
}

/**
 * Get a friendly name for the file type.
 */
export function getPresentationTypeName(file: File): string {
  const ext = file.name.toLowerCase();
  if (ext.endsWith('.pptx')) return 'PowerPoint';
  if (ext.endsWith('.pdf')) return 'PDF';
  return 'Documento';
}
