
import GroupSelectionClient from './GroupSelectionClient';

export default function GroupSelectionPage({ params }: { params: { sessionId: string } }) {
  return (
    <GroupSelectionClient sessionId={params.sessionId} />
  );
}