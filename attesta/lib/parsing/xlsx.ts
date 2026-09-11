import * as XLSX from "xlsx";

const QUESTION_HEADER_HINTS = ["question", "requirement", "control"];

export interface ParsedQuestion {
  rowIndex: number; // 1-indexed spreadsheet row, used to write the answer back to the right place
  question: string;
}

/**
 * Reads a blank security questionnaire and extracts one question per row.
 * Looks for a header cell containing "question" (or similar); falls back to
 * column A if no header match is found, since templates vary a lot between
 * vendors (SIG, CAIQ, custom spreadsheets, etc).
 */
export function readQuestionsFromXlsx(buffer: Buffer): ParsedQuestion[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The uploaded file has no sheets.");

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  if (rows.length < 2) {
    throw new Error("Could not find any question rows. Expected a header row followed by questions.");
  }

  const headerRow = (rows[0] ?? []).map((h) => String(h ?? "").toLowerCase().trim());
  let questionCol = headerRow.findIndex((h) => QUESTION_HEADER_HINTS.some((hint) => h.includes(hint)));
  if (questionCol === -1) questionCol = 0; // fall back to column A

  const questions: ParsedQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i]?.[questionCol];
    const text = typeof cell === "string" ? cell.trim() : cell != null ? String(cell).trim() : "";
    if (text) {
      // +1 because rows[] is 0-indexed but spreadsheet rows are 1-indexed.
      questions.push({ rowIndex: i + 1, question: text });
    }
  }

  if (questions.length === 0) {
    throw new Error("No questions were found in the detected question column.");
  }

  return questions;
}

export interface AnswerToWrite {
  rowIndex: number; // must match a ParsedQuestion.rowIndex from readQuestionsFromXlsx
  answer: string;
}

/**
 * Writes approved answers back into the original workbook — adding an
 * "Answer" column if one doesn't already exist — and returns the completed
 * file as a buffer ready to stream back to the user. Preserving the original
 * file rather than rebuilding it keeps every other column (owner, category,
 * notes, etc.) exactly as the vendor's template had it.
 */
export function writeAnswersToXlsx(
  originalBuffer: Buffer,
  answers: AnswerToWrite[],
  answerColumnHeader = "Answer"
): Buffer {
  const workbook = XLSX.read(originalBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  const headerRow = (rows[0] ?? []).map((h) => String(h ?? ""));

  let answerCol = headerRow.findIndex((h) => h.toLowerCase().trim() === answerColumnHeader.toLowerCase());
  if (answerCol === -1) {
    answerCol = headerRow.length;
    headerRow.push(answerColumnHeader);
    rows[0] = headerRow;
  }

  const answersByRow = new Map(answers.map((a) => [a.rowIndex, a.answer]));
  for (const [rowIndex, answer] of answersByRow) {
    const arrIndex = rowIndex - 1; // back to 0-indexed
    if (!rows[arrIndex]) rows[arrIndex] = [];
    rows[arrIndex][answerCol] = answer;
  }

  const newSheet = XLSX.utils.aoa_to_sheet(rows);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

  return XLSX.write(newWorkbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
