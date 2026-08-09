import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostDetail } from "../../../../components/post/PostDetail";
import { api } from "../../../../lib/trpc/server";
import { auth } from "../../../../server/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await api();
    const post = await caller.post.byId({ id });
    return { title: post.isAnonymous ? "Sensitive report" : post.title };
  } catch {
    return { title: "Post" };
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const caller = await api();

  // byId enforces the sensitive-report policy at the query layer, so a
  // viewer who shouldn't see this gets a genuine 404, not a hidden div.
  const post = await caller.post.byId({ id }).catch(() => null);
  if (!post) notFound();

  return (
    <PostDetail
      initial={post}
      viewerId={session?.user?.id ?? ""}
      viewerRole={session?.user?.role ?? "student"}
    />
  );
}
