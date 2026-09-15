import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";
import { writeAnswersToXlsx } from "@/lib/parsing/xlsx";

export const runtime = "nodejs";

/**
 * Downloads the original uploaded workbook, writes every approved/edited
 * answer into an "Answer" column, and streams the completed file back.
 * Only items with a `final_answer` are included — anything still pending
 * or unapproved is left blank rather than exporting an unreviewed AI guess.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServiceSupabaseClient();

  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaires")
    .select("id, file_name, storage_path")
    .eq("id", params.id)
    .single();

  if (qError || !questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found." }, { status: 404 });
  }
  if (!questionnaire.storage_path) {
    return NextResponse.json(
      { error: "The original file for this questionnaire is missing." },
      { status: 500 }
    );
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("questionnaires")
    .download(questionnaire.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Could not retrieve the original file." }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("questionnaire_items")
    .select("row_index, final_answer")
    .eq("questionnaire_id", params.id)
    .not("final_answer", "is", null);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const originalBuffer = Buffer.from(await fileData.arrayBuffer());
  const completedBuffer = writeAnswersToXlsx(
    originalBuffer,
    (items ?? []).map((i) => ({ rowIndex: i.row_index, answer: i.final_answer as string }))
  );

  return new NextResponse(new Uint8Array(completedBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="completed-${questionnaire.file_name}"`,
    },
  });
}
