import InstructorDashboard from "@/components/Instructor-Dashboard/InstructorDashboard"

type Params = Promise<{ sessionId: string }>;

export default async function MonitorPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <div>
      <InstructorDashboard sessionId={resolvedParams.sessionId} />
    </div>
  );
}