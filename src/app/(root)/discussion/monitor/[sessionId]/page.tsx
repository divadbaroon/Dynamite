import InstructorDashboardWrapper from "@/components/Instructor-Dashboard/InstructorDashboardWrapper"

type Params = Promise<{ sessionId: string }>;

export default async function MonitorPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <div>
      <InstructorDashboardWrapper sessionId={resolvedParams.sessionId} />
    </div>
  );
}