import { notFound } from "next/navigation";
import { NotebookPage } from "@/components/NotebookPage";

export default async function Page({ params, searchParams }: PageProps<"/n/[slug]/lessons/[n]">) {
  const { slug, n } = await params;
  const { edit } = await searchParams;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) notFound();
  return <NotebookPage slug={slug} lessonN={num} editLesson={edit === "1"} />;
}
