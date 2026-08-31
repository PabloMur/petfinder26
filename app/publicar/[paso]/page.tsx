import { notFound } from "next/navigation";
import { Step1 } from "@/components/publicar/Step1";
import { Step2 } from "@/components/publicar/Step2";
import { Step3 } from "@/components/publicar/Step3";

export default async function PublicarPasoPage({
  params,
}: {
  params: Promise<{ paso: string }>;
}) {
  const { paso } = await params;

  switch (paso) {
    case "1":
      return <Step1 />;
    case "2":
      return <Step2 />;
    case "3":
      return <Step3 />;
    default:
      notFound();
  }
}
