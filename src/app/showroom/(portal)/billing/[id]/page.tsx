import { notFound } from "next/navigation";
import { requireShowroom } from "@/lib/session";
import { getStatement } from "@/lib/showroom-queries";
import { Invoice } from "@/components/invoice";

export const metadata = { title: "Invoice" };

export default async function ShowroomInvoice({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") notFound();
  const { id } = await params;
  const s = await getStatement(Number(id));
  if (!s || s.st.showroomId !== ctx.showroom.id) notFound();
  return <Invoice s={s} />;
}
