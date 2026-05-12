/**
 * Presentation Import Service
 * 
 * Parses PowerPoint (.pptx) and PDF files into the app's Slide format.
 * - PPTX: Extracts text content and embedded images from each slide
 * - PDF: Renders each page as a high-quality image
 */

import JSZip from 'jszip';
import { Slide } from '../types';
import { compressImage } from './imageService';

// ─────────────────────────────────────────────
// PPTX PARSING
// ─────────────────────────────────────────────

/**
 * Parse a PowerPoint file and extract slides with text and images.
 */
export async function parsePptxFile(file: File): Promise<Slide[]> {
  const zip = await JSZip.loadAsync(file);
  const slides: Slide[] = [];

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

  // Process each slide
  for (const slideFile of slideFiles) {
    const xmlFile = zip.file(slideFile.name);
    if (!xmlFile) continue;

    const xmlContent = await xmlFile.async('text');
    
    // Extract text content from slide XML
    const textContent = extractTextFromSlideXml(xmlContent);
    
    // Extract the first image reference from the slide
    let imageDataUrl: string | undefined;
    const imageRId = extractImageRIdFromSlideXml(xmlContent);
    
    if (imageRId) {
      const slideRels = relMap.get(slideFile.index);
      if (slideRels) {
        const mediaPath = slideRels.get(imageRId);
        if (mediaPath) {
          const mediaFile = mediaFiles.find(m => m.path === mediaPath);
          if (mediaFile) {
            try {
              const rawDataUrl = await blobToDataUrl(mediaFile.blob);
              imageDataUrl = await compressImage(rawDataUrl);
            } catch (e) {
              console.warn('Failed to compress PPTX image:', e);
            }
          }
        }
      }
    }

    // If no text and no image, try to render the slide as an image fallback
    // For now, create a slide with what we have
    const slideId = Math.random().toString(36).substr(2, 9);
    
    if (imageDataUrl && !textContent.trim()) {
      // Image-only slide
      slides.push({
        id: slideId,
        type: 'image',
        content: '',
        mediaUrl: imageDataUrl,
        label: `SLIDE ${slideFile.index}`
      });
    } else {
      // Text slide (possibly with background image)
      slides.push({
        id: slideId,
        type: textContent.trim() ? 'text' : 'image',
        content: textContent.trim() || `Diapositiva ${slideFile.index}`,
        mediaUrl: imageDataUrl,
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

// ─────────────────────────────────────────────
// PDF PARSING
// ─────────────────────────────────────────────

/**
 * Parse a PDF file and render each page as a high-quality image slide.
 */
export async function parsePdfFile(file: File): Promise<Slide[]> {
  // Dynamically import pdf.js to keep initial bundle small
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source - use CDN for the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
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
