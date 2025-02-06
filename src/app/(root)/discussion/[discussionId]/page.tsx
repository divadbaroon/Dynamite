import { DiscussionContent } from "@/components/Discussion/content/DiscussionContent"

type Params = Promise<{ discussionId: string }>;

export default async function DiscussioPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return <DiscussionContent discussionId={resolvedParams.discussionId} />
}