import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { queryBilling } from "@/lib/mureka";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await queryBilling());
  } catch (err) {
    return errorResponse(err);
  }
}
