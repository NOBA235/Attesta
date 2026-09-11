import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";
import { readQuestionsFromXlsx } from "@/lib/parsing/xlsx";

export const runtime = "nodejs";

/**
 * Accepts a blank questionnaire .xlsx, stores the original file (so /export
 * can preserve its exact layout later), and saves one `questionnaire_items`
 * row per question with status "pending". Call
 * POST /api/questionnaires/[id]/process next to actually answer them —
 * kept separate so upload responds in seconds even for large questionnaires.
 *
 * Requires a "questionnaires" bucket to exist in Supabase Storage.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("orgId") as string | null;

    if (!file) return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    if (!orgId) return NextResponse.json({ error: "Missing orgId." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    let questions;
    try {
      questions = readQuestionsFromXlsx(buffer);
    } catch (parseErr) {
      return NextResponse.json(
        { error: parseErr instanceof Error ? parseErr.message : "Could not parse the spreadsheet." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const storagePath = `${orgId}/${Date.now()}-${file.name}`;

    const { error: storageError } = await supabase.storage
      .from("questionnaires")
      .upload(storagePath, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    if (storageError) {
      return NextResponse.json({ error: `Upload failed: ${storageError.message}` }, { status: 500 });
    }

    const { data: questionnaire, error: qError } = await supabase
      .from("questionnaires")
      .insert({ org_id: orgId, file_name: file.name, storage_path: storagePath, status: "ready" })
      .select()
      .single();

    if (qError || !questionnaire) {
      return NextResponse.json(
        { error: `Could not create questionnaire: ${qError?.message}` },
        { status: 500 }
      );
    }

    const itemRows = questions.map((q) => ({
      questionnaire_id: questionnaire.id,
      row_index: q.rowIndex,
      question: q.question,
      status: "pending" as const,
    }));

    const { error: itemsError } = await supabase.from("questionnaire_items").insert(itemRows);
    if (itemsError) {
      return NextResponse.json({ error: `Could not save questions: ${itemsError.message}` }, { status: 500 });
    }

    return NextResponse.json({ questionnaire, questionCount: itemRows.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error uploading questionnaire." },
      { status: 500 }
    );
  }
}
