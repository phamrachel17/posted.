import { NotebookPage } from "@/components/NotebookPage";

export default async function Page({ params }: PageProps<"/n/[slug]">) {
  const { slug } = await params;
  return <NotebookPage slug={slug} />;
}
