import pdfParse from "pdf-parse";

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  content: string;
  metadata: { page: number };
}

/**
 * Extracts text from a PDF buffer, page by page, so each chunk can carry a
 * page number for citations in the review UI.
 *
 * pdf-parse's `pagerender` hook runs once per page during rendering, which is
 * how we recover page boundaries — pdf-parse's default output is just one
 * flat string for the whole document. This depends on pdf-parse's internal
 * use of pdf.js, so if that behavior changes in a version bump, we fall back
 * to treating the whole document as a single page rather than failing.
 */
export async function extractPdfPages(buffer: Buffer): Promise<PdfPage[]> {
  const pages: PdfPage[] = [];

  try {
    await pdfParse(buffer, {
      // Let PDF.js continue when a damaged xref can be reconstructed.
      stopAtErrors: false,
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(" ");
        pages.push({ pageNumber: pages.length + 1, text });
        return text;
      },
    } as any);
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (pages.length > 0) return pages;

  // Fallback: per-page rendering produced nothing. Re-parse for the full
  // text and treat the document as one page so ingestion still succeeds.
  let fallback;
  try {
    fallback = await pdfParse(buffer, { stopAtErrors: false } as any);
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!fallback.text?.trim()) {
    throw new Error("Could not extract any text from this PDF. It may be a scanned image without OCR.");
  }
  return [{ pageNumber: 1, text: fallback.text }];
}

/**
 * Splits page text into overlapping chunks suitable for embedding. Overlap
 * keeps a policy clause from being cut in half right at a chunk boundary.
 */
export function chunkPages(
  pages: PdfPage[],
  options: { chunkSize?: number; chunkOverlap?: number } = {}
): TextChunk[] {
  const { chunkSize = 1000, chunkOverlap = 150 } = options;
  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const normalized = page.text.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    let start = 0;
    while (start < normalized.length) {
      const end = Math.min(start + chunkSize, normalized.length);
      const slice = normalized.slice(start, end).trim();
      if (slice) {
        chunks.push({ content: slice, metadata: { page: page.pageNumber } });
      }
      if (end === normalized.length) break;
      start = end - chunkOverlap; // step back so consecutive chunks overlap
    }
  }

  return chunks;
}
