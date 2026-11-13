import { Injectable } from '@nestjs/common';
import type {
  InterviewRoomRole,
  MockInterviewStatus,
  RoomMediaState,
} from '@placecampus/shared-types';

export interface RoomSeat {
  socketId: string;
  userId: string;
  fullName: string;
  /** Random id chosen by the browser tab, so the peer knows when to renegotiate. */
  clientSessionId: string;
  media: RoomMediaState;
}

export interface LiveRoom {
  interviewId: string;
  roomId: string;
  facultyUserId: string;
  studentUserId: string;
  seats: Partial<Record<InterviewRoomRole, RoomSeat>>;
  /** The faculty member admitted the student; survives brief reconnects. */
  admitted: boolean;
  status: MockInterviewStatus;
  startedAt?: string;
}

const DEFAULT_MEDIA: RoomMediaState = { audio: true, video: true, screen: false };

/**
 * In-memory state of live interview rooms (who is connected, admission).
 * Nothing here is persisted: SDP and ICE candidates are only relayed.
 *
 * This is per API process. Running several API instances needs sticky sessions
 * and a shared adapter (e.g. @socket.io/redis-adapter) plus shared room state.
 */
@Injectable()
export class InterviewRoomRegistry {
  private readonly rooms = new Map<string, LiveRoom>();

  get(roomId: string) {
    return this.rooms.get(roomId);
  }

  ensure(init: Omit<LiveRoom, 'seats' | 'admitted'>): LiveRoom {
    const existing = this.rooms.get(init.roomId);
    if (existing) {
      existing.status = init.status;
      existing.startedAt = init.startedAt;
      return existing;
    }
    const room: LiveRoom = { ...init, seats: {}, admitted: false };
    this.rooms.set(init.roomId, room);
    return room;
  }

  /** Seats a participant; returns the socket id it replaced (another tab), if any. */
  seat(
    room: LiveRoom,
    role: InterviewRoomRole,
    seat: Omit<RoomSeat, 'media'> & { media?: RoomMediaState },
  ): string | undefined {
    const previous = room.seats[role];
    room.seats[role] = { ...seat, media: seat.media ?? { ...DEFAULT_MEDIA } };
    return previous && previous.socketId !== seat.socketId ? previous.socketId : undefined;
  }

  /** Frees the seat held by this socket. Returns the role it held, if any. */
  leave(roomId: string, socketId: string): InterviewRoomRole | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const role = (Object.keys(room.seats) as InterviewRoomRole[]).find(
      (r) => room.seats[r]?.socketId === socketId,
    );
    if (role) delete room.seats[role];
    if (!room.seats.FACULTY && !room.seats.STUDENT) this.rooms.delete(roomId);
    return role;
  }

  close(roomId: string) {
    this.rooms.delete(roomId);
  }

  findByInterviewId(interviewId: string) {
    for (const room of this.rooms.values()) {
      if (room.interviewId === interviewId) return room;
    }
    return undefined;
  }

  /** The student is connected and has not been admitted yet. */
  isStudentWaiting(interviewId: string) {
    const room = this.findByInterviewId(interviewId);
    return !!room?.seats.STUDENT && !room.admitted;
  }
}
