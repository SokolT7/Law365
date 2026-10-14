"use client";
import { useRouter } from "next/navigation";
import { useConfirm, useToast } from "@/components/Feedback";

export default function TemplateDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  async function remove() {
    if (!(await confirm({ title: `Ukloniti predložak „${name}”?`, body: "Spremljene odluke na ugovorima ostaju sačuvane, ali predložak se više neće nuditi u provjeri.", confirmLabel: "Ukloni predložak", destructive: true }))) return;
    const response = await fetch(`/api/review/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { toast({ tone: "error", message: "Uklanjanje nije uspjelo." }); return; }
    toast({ message: "Predložak je uklonjen." });
    router.refresh();
  }
  return <button type="button" className="link link-danger" onClick={remove}>Ukloni</button>;
}
