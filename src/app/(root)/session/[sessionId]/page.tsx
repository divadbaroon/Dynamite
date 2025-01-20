import { SessionContent } from "./SessionContent"

import { SessionProps } from "@/types"

export default function SessionPage({ params }: SessionProps) {
    return <SessionContent sessionId={params.sessionId} />
}