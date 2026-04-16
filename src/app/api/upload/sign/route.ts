// Returns a short-lived Cloudinary signed-upload payload so the browser can
// upload files directly without proxying through Vercel's 4.5 MB body limit.
// Only authenticated sellers/admins may request signatures.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { getCloudinaryConfig, signUpload } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const schema = z.object({
  folder: z.string().max(120).optional(),
  publicId: z.string().max(120).optional(),
  resourceType: z.enum(["image", "video", "auto"]).optional(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SELLER") {
    return NextResponse.json(
      { error: "Hanya seller/admin yang bisa upload media" },
      { status: 403 },
    );
  }
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Cloudinary belum dikonfigurasi (CLOUDINARY_* env vars)" },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const folder = parsed.data.folder ?? `koi/${user.sellerId ?? user.id}`;
  const signed = signUpload(cfg, {
    folder,
    publicId: parsed.data.publicId,
    resourceType: parsed.data.resourceType,
  });
  return NextResponse.json(signed);
}
