import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AdminSettingsForm } from "@/components/admin-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin/settings");
  if (user.role !== "ADMIN") redirect("/");

  const setting =
    (await prisma.platformSetting.findFirst()) ??
    (await prisma.platformSetting.create({ data: {} }));

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Admin</p>
        <h1 className="heading-display text-3xl text-white">
          <Settings size={22} className="mr-2 inline text-koi-gold" /> Global Settings
        </h1>
        <p className="mt-1 text-sm text-koi-muted">
          Fee, deposit minimal, penalti BNR, WhatsApp bot config.
        </p>
      </div>
      <AdminSettingsForm setting={setting} />
    </div>
  );
}
