import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import type {
  InterviewQuestion,
  InterviewRoomRole,
  RoomChatMessage,
  RoomMediaState,
  RoomState,
} from '@placecampus/shared-types';
import { UserRole } from '@placecampus/shared-types';
import { InterviewsService } from './interviews.service.js';
import { InterviewRoomRegistry, type LiveRoom } from './interview-room.registry.js';

/** Socket.IO CORS mirrors the HTTP CORS policy in main.ts. */
function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (origin === (process.env.FRONTEND_URL ?? 'http://localhost:3000')) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

const MAX_SDP_LENGTH = 200_000;
const MAX_CANDIDATE_LENGTH = 2_000;
const MAX_CHAT_LENGTH = 1_000;
const CHAT_BURST = 8;
const CHAT_WINDOW_MS = 5_000;

interface SocketData {
  userId: string;
  /** The token's active role (lowercase UserRole). */
  role: string;
  tokenExpiresAt: number;
  expiryTimer?: NodeJS.Timeout;
  roomId?: string;
  seat?: InterviewRoomRole;
  chatTimes: number[];
}

type Ack<T = unknown> = (response: { ok: true; data?: T } | { ok: false; error: string }) => void;

const roomKey = (roomId: string) => `iv:${roomId}`;
const other = (role: InterviewRoomRole): InterviewRoomRole => (role === 'FACULTY' ? 'STUDENT' : 'FACULTY');
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Signaling for the one-to-one mock interview room.
 *
 * Client -> server: interview:join, interview:admit, interview:leave,
 *   webrtc:offer, webrtc:answer, webrtc:ice-candidate, webrtc:restart,
 *   media:state, chat:message
 * Server -> client: room:state, interview:participant-joined,
 *   interview:participant-left, interview:admitted, interview:ready,
 *   interview:ended, interview:replaced, questions:updated, auth:expired,
 *   plus the relayed webrtc:* and chat:message events.
 */
@WebSocketGateway({
  namespace: '/interviews',
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
      cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
  maxHttpBufferSize: 512_000,
  pingInterval: 10_000,
  pingTimeout: 8_000,
})
export class InterviewRoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(InterviewRoomGateway.name);

  @WebSocketServer()
  private server!: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly interviews: InterviewsService,
    private readonly rooms: InterviewRoomRegistry,
  ) {}

  /* ------------------------------ Connection ------------------------------ */

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth as Record<string, unknown> | undefined)?.token;
    try {
      if (typeof token !== 'string' || !token) throw new Error('missing token');
      const payload = await this.jwt.verifyAsync<{ sub: string; role?: string; pwc?: boolean; exp: number }>(token);
      if (payload.pwc) throw new Error('temporary password');
      if (payload.role !== UserRole.FACULTY && payload.role !== UserRole.STUDENT) throw new Error('role not allowed');

      const data: SocketData = {
        userId: String(payload.sub),
        role: payload.role,
        tokenExpiresAt: payload.exp * 1000,
        chatTimes: [],
      };
      // The browser reconnects with a fresh token; the media stream is peer-to-peer and survives.
      const ms = Math.max(0, data.tokenExpiresAt - Date.now());
      data.expiryTimer = setTimeout(() => {
        client.emit('auth:expired');
        client.disconnect(true);
      }, Math.min(ms, 2_147_000_000));
      client.data = data;
    } catch {
      client.emit('auth:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData | undefined;
    if (data?.expiryTimer) clearTimeout(data.expiryTimer);
    this.vacate(client);
  }

  /* -------------------------------- Rooms -------------------------------- */

  @SubscribeMessage('interview:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: true; data: RoomState } | { ok: false; error: string }> {
    const data = client.data as SocketData;
    if (!data?.userId) return { ok: false, error: 'Unauthorized' };
    if (!isObject(body) || typeof body.roomId !== 'string' || typeof body.clientSessionId !== 'string' || body.clientSessionId.length > 64)
      return { ok: false, error: 'Invalid request' };

    let access: Awaited<ReturnType<InterviewsService['authorizeRoomAccess']>>;
    try {
      access = await this.interviews.authorizeRoomAccess(body.roomId, data.userId, data.role);
    } catch (error: any) {
      return { ok: false, error: error?.message ?? 'You cannot join this interview' };
    }

    // One room per socket: leave any previous one first.
    if (data.roomId && data.roomId !== body.roomId) this.vacate(client);

    const roomId = body.roomId;
    const room = this.rooms.ensure({
      interviewId: String(access.interview._id),
      roomId,
      facultyUserId: access.facultyId,
      studentUserId: access.studentId,
      status: access.interview.status,
      startedAt: access.interview.startedAt,
    });
    const media = this.parseMedia(body.media);
    const replaced = this.rooms.seat(room, access.seat, {
      socketId: client.id,
      userId: data.userId,
      fullName: access.names[access.seat],
      clientSessionId: body.clientSessionId,
      ...(media ? { media } : {}),
    });
    if (replaced) {
      const old = this.server.sockets.get(replaced);
      if (old) {
        old.emit('interview:replaced');
        (old.data as SocketData).roomId = undefined;
        old.leave(roomKey(roomId));
        old.disconnect(true);
      }
    }

    // Admission only applies to a running interview; a student who drops and
    // returns to a running call keeps their admission.
    if (access.interview.status !== 'IN_PROGRESS') room.admitted = false;

    data.roomId = roomId;
    data.seat = access.seat;
    await client.join(roomKey(roomId));

    const peerSeat = room.seats[other(access.seat)];
    if (peerSeat) {
      this.server.to(peerSeat.socketId).emit('interview:participant-joined', {
        role: access.seat,
        fullName: access.names[access.seat],
      });
    }
    this.broadcastState(room);
    this.maybeReady(room);
    return { ok: true, data: this.stateFor(room, access.seat) };
  }

  /** Faculty lets the waiting student into the call. The interview must have been started. */
  @SubscribeMessage('interview:admit')
  async admit(@ConnectedSocket() client: Socket): Promise<{ ok: boolean; error?: string }> {
    const ctx = this.context(client);
    if (!ctx || ctx.seat !== 'FACULTY') return { ok: false, error: 'Only the interviewer can admit the student' };
    let access;
    try {
      access = await this.interviews.authorizeRoomAccess(ctx.room.roomId, ctx.data.userId, ctx.data.role);
    } catch (error: any) {
      return { ok: false, error: error?.message ?? 'Unavailable' };
    }
    if (access.interview.status !== 'IN_PROGRESS') return { ok: false, error: 'Start the interview before admitting the student' };
    if (!ctx.room.seats.STUDENT) return { ok: false, error: 'The student is not in the waiting room' };
    ctx.room.admitted = true;
    this.server.to(ctx.room.seats.STUDENT.socketId).emit('interview:admitted');
    ctx.room.status = access.interview.status;
    ctx.room.startedAt = access.interview.startedAt;
    this.broadcastState(ctx.room);
    this.maybeReady(ctx.room);
    return { ok: true };
  }

  @SubscribeMessage('interview:leave')
  leave(@ConnectedSocket() client: Socket) {
    this.vacate(client);
    return { ok: true };
  }

  /* ------------------------------ Signaling ------------------------------ */

  @SubscribeMessage('webrtc:offer')
  offer(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.relayDescription(client, body, 'offer');
  }

  @SubscribeMessage('webrtc:answer')
  answer(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.relayDescription(client, body, 'answer');
  }

  @SubscribeMessage('webrtc:ice-candidate')
  iceCandidate(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const target = this.peerOf(client, { requireAdmitted: true });
    if (!target) return { ok: false };
    if (!isObject(body) || !isObject(body.candidate)) return { ok: false };
    const c = body.candidate;
    if (typeof c.candidate !== 'string' || c.candidate.length > MAX_CANDIDATE_LENGTH) return { ok: false };
    this.server.to(target).emit('webrtc:ice-candidate', {
      candidate: {
        candidate: c.candidate,
        sdpMid: typeof c.sdpMid === 'string' ? c.sdpMid : null,
        sdpMLineIndex: typeof c.sdpMLineIndex === 'number' ? c.sdpMLineIndex : null,
        usernameFragment: typeof c.usernameFragment === 'string' ? c.usernameFragment : null,
      },
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : undefined,
    });
    return { ok: true };
  }

  /** The student asks the interviewer (who makes offers) to restart ICE after a failure. */
  @SubscribeMessage('webrtc:restart')
  restart(@ConnectedSocket() client: Socket) {
    const target = this.peerOf(client, { requireAdmitted: true });
    if (!target) return { ok: false };
    this.server.to(target).emit('webrtc:restart');
    return { ok: true };
  }

  @SubscribeMessage('media:state')
  mediaState(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const ctx = this.context(client);
    const media = this.parseMedia(body);
    if (!ctx || !media) return { ok: false };
    const seat = ctx.room.seats[ctx.seat];
    if (seat) seat.media = media;
    const peer = ctx.room.seats[other(ctx.seat)];
    if (peer) this.server.to(peer.socketId).emit('media:state', media);
    return { ok: true };
  }

  @SubscribeMessage('chat:message')
  chat(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): { ok: boolean; error?: string; data?: RoomChatMessage } {
    const ctx = this.context(client);
    if (!ctx) return { ok: false, error: 'Join the interview first' };
    if (ctx.seat === 'STUDENT' && !ctx.room.admitted) return { ok: false, error: 'Chat opens once you are admitted' };
    if (!isObject(body) || typeof body.text !== 'string') return { ok: false, error: 'Invalid message' };
    const text = body.text.trim();
    if (!text || text.length > MAX_CHAT_LENGTH) return { ok: false, error: `Messages can be up to ${MAX_CHAT_LENGTH} characters` };

    const now = Date.now();
    ctx.data.chatTimes = ctx.data.chatTimes.filter((t) => now - t < CHAT_WINDOW_MS);
    if (ctx.data.chatTimes.length >= CHAT_BURST) return { ok: false, error: 'You are sending messages too quickly' };
    ctx.data.chatTimes.push(now);

    const message: RoomChatMessage = {
      id: randomUUID(),
      fromUserId: ctx.data.userId,
      fromName: ctx.room.seats[ctx.seat]?.fullName ?? '',
      role: ctx.seat,
      text,
      sentAt: new Date(now).toISOString(),
    };
    // Chat is relayed live only; it is not stored.
    client.to(roomKey(ctx.room.roomId)).emit('chat:message', message);
    return { ok: true, data: message };
  }

  /* --------------------------- Domain events --------------------------- */

  @OnEvent('interview.started')
  onStarted({ interview }: { interview: any }) {
    const room = this.rooms.findByInterviewId(String(interview._id ?? interview.id));
    if (!room) return;
    room.status = 'IN_PROGRESS';
    room.startedAt = interview.startedAt;
    this.broadcastState(room);
  }

  @OnEvent('interview.ended')
  onEnded({ interview }: { interview: any }) {
    this.closeRoom(String(interview._id ?? interview.id), 'ended');
  }

  @OnEvent('interview.cancelled')
  onCancelled({ interview }: { interview: any }) {
    this.closeRoom(String(interview._id ?? interview.id), 'cancelled');
  }

  @OnEvent('interview.questions-updated')
  onQuestions({ interviewId, askedForStudent }: { interviewId: string; askedForStudent: InterviewQuestion[] }) {
    const room = this.rooms.findByInterviewId(interviewId);
    const student = room?.seats.STUDENT;
    if (student) this.server.to(student.socketId).emit('questions:updated', askedForStudent);
  }

  /* ------------------------------ Helpers ------------------------------ */

  private context(client: Socket) {
    const data = client.data as SocketData | undefined;
    if (!data?.roomId || !data.seat) return null;
    const room = this.rooms.get(data.roomId);
    if (!room || room.seats[data.seat]?.socketId !== client.id) return null;
    return { data, room, seat: data.seat };
  }

  /** Socket id of the other participant, if signaling between the two is allowed. */
  private peerOf(client: Socket, { requireAdmitted }: { requireAdmitted: boolean }) {
    const ctx = this.context(client);
    if (!ctx) return null;
    if (requireAdmitted && !ctx.room.admitted) return null;
    return ctx.room.seats[other(ctx.seat)]?.socketId ?? null;
  }

  private relayDescription(client: Socket, body: unknown, type: 'offer' | 'answer') {
    const target = this.peerOf(client, { requireAdmitted: true });
    if (!target) return { ok: false };
    if (!isObject(body) || !isObject(body.description)) return { ok: false };
    const d = body.description;
    if (d.type !== type || typeof d.sdp !== 'string' || d.sdp.length > MAX_SDP_LENGTH) return { ok: false };
    // Only the interviewer makes offers; the student only answers.
    const ctx = this.context(client)!;
    if ((type === 'offer') !== (ctx.seat === 'FACULTY')) return { ok: false };
    this.server.to(target).emit(`webrtc:${type}`, {
      description: { type, sdp: d.sdp },
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : undefined,
    });
    return { ok: true };
  }

  private parseMedia(value: unknown): RoomMediaState | null {
    if (!isObject(value)) return null;
    const { audio, video, screen } = value;
    if (typeof audio !== 'boolean' || typeof video !== 'boolean' || typeof screen !== 'boolean') return null;
    return { audio, video, screen };
  }

  private stateFor(room: LiveRoom, seat: InterviewRoomRole): RoomState {
    const you = room.seats[seat];
    const peer = room.seats[other(seat)];
    return {
      interviewId: room.interviewId,
      you: { userId: you?.userId ?? '', role: seat, fullName: you?.fullName ?? '' },
      peer: peer
        ? {
            userId: peer.userId,
            role: other(seat),
            fullName: peer.fullName,
            media: peer.media,
            waiting: other(seat) === 'STUDENT' && !room.admitted,
          }
        : null,
      admitted: room.admitted,
      status: room.status,
      ...(room.startedAt ? { startedAt: room.startedAt } : {}),
    };
  }

  private broadcastState(room: LiveRoom) {
    for (const seat of ['FACULTY', 'STUDENT'] as InterviewRoomRole[]) {
      const s = room.seats[seat];
      if (s) this.server.to(s.socketId).emit('room:state', this.stateFor(room, seat));
    }
  }

  /**
   * Both participants are present and the student is admitted: tell each side who
   * the other browser tab is. The interviewer creates the offer.
   */
  private maybeReady(room: LiveRoom) {
    const { FACULTY: faculty, STUDENT: student } = room.seats;
    if (!faculty || !student || !room.admitted) return;
    this.server.to(faculty.socketId).emit('interview:ready', { initiator: true, peerSessionId: student.clientSessionId });
    this.server.to(student.socketId).emit('interview:ready', { initiator: false, peerSessionId: faculty.clientSessionId });
  }

  private vacate(client: Socket) {
    const data = client.data as SocketData | undefined;
    if (!data?.roomId) return;
    const roomId = data.roomId;
    const room = this.rooms.get(roomId);
    const role = this.rooms.leave(roomId, client.id);
    data.roomId = undefined;
    data.seat = undefined;
    client.leave(roomKey(roomId));
    if (room && role) {
      const peer = room.seats[other(role)];
      if (peer) {
        this.server.to(peer.socketId).emit('interview:participant-left', { role });
        this.server.to(peer.socketId).emit('room:state', this.stateFor(room, other(role)));
      }
    }
  }

  private closeRoom(interviewId: string, reason: 'ended' | 'cancelled') {
    const room = this.rooms.findByInterviewId(interviewId);
    if (!room) return;
    this.server.to(roomKey(room.roomId)).emit('interview:ended', { reason });
    for (const seat of Object.values(room.seats)) {
      const socket = seat && this.server.sockets.get(seat.socketId);
      if (socket) {
        (socket.data as SocketData).roomId = undefined;
        socket.leave(roomKey(room.roomId));
      }
    }
    this.rooms.close(room.roomId);
    this.logger.log(`Interview room closed (${reason}) for interview ${interviewId}`);
  }
}
