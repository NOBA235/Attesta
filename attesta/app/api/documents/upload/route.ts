import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/server";
import { chunkAndEmbedDocument } from "@/lib/ai/rag/chunkAndEmbedDocument";

// pdf-parse needs Node APIs (Buffer, fs internals) — this can't run on the edge runtime.
export const runtime = "nodejs";

/**
 * Accepts a policy PDF, stores it in Supabase Storage, creates a `documents`
 * row, and runs ingestion inline. Inline is fine for MVP-sized PDFs (seconds,
 * not minutes) — for larger files, move the chunkAndEmbedDocument call to a
 * background job and let the client poll `documents.status` instead.
 *
 * Requires a "policy-documents" bucket to exist in Supabase Storage.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("orgId") as string | null;

    if (!file) return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    if (!orgId) return NextResponse.json({ error: "Missing orgId." }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${orgId}/${Date.now()}-${file.name}`;

    const { error: storageError } = await supabase.storage
      .from("policy-documents")
      .upload(storagePath, buffer, { contentType: "application/pdf" });

    if (storageError) {
      return NextResponse.json({ error: `Upload failed: ${storageError.message}` }, { status: 500 });
    }

    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({ org_id: orgId, file_name: file.name, storage_path: storagePath, status: "processing" })
      .select()
      .single();

    if (insertError || !doc) {
      return NextResponse.json(
        { error: `Could not create document record: ${insertError?.message}` },
        { status: 500 }
      );
    }

    try {
      const result = await chunkAndEmbedDocument(doc.id, orgId, buffer);
      return NextResponse.json({ document: doc, ...result }, { status: 201 });
    } catch (ingestErr) {
      // The file is stored and the row exists — chunkAndEmbedDocument already
      // marked it "failed" with a reason, so this is a partial success, not
      // a full failure the client needs to retry the upload for.
      return NextResponse.json(
        { document: doc, error: ingestErr instanceof Error ? ingestErr.message : "Ingestion failed." },
        { status: 207 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error uploading document." },
      { status: 500 }
    );
  }
}
