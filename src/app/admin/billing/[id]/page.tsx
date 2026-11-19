import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getStatement } from "@/lib/showroom-queries";
import { Invoice } from "@/components/invoice";

export default async function AdminInvoice({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const s = await getStatement(Number(id));
  if (!s) notFound();
  return <Invoice s={s} />;
}
