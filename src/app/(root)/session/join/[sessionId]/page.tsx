import JoinSessionClient from '../../../../../components/Discussion/group/JoinSessionClient';

export default function JoinSession({ params }: { params: { sessionId: string }}) {
  return (
    <JoinSessionClient sessionId={params.sessionId} />
  );
}