import DiscussionClient from './DiscussionClient';

export default function Discussion({ params }: { params: { sessionId: string; groupId: string; } }) {
  return (
    <DiscussionClient sessionId={params.sessionId} groupId={params.groupId} />
  );
}