"use client";

import { useParams } from "next/navigation";
import { InterviewRoomPage } from "@/features/interviews/room/interview-room";

/** Full-screen mock interview room. Access is enforced by the API and the signaling server. */
export default function StudentInterviewRoomRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return <InterviewRoomPage roomId={roomId} role="STUDENT" />;
}
