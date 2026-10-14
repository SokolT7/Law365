"use client";
import { Button } from "@/components/Button";
import { IFile } from "@/components/Icons";

export default function PrintButton() {
  return <Button variant="primary" icon={<IFile />} onClick={() => window.print()}>Ispiši ili spremi kao PDF</Button>;
}
