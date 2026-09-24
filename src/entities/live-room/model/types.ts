import type { UserSummary } from '@/entities/user/model/types';

/** Who may walk in. Mirrors the API's `LiveAudience`. */
export type LiveAudience = 'EVERYONE' | 'SELECTED';

/** Whether talking (or presenting) is allowed by default, or handed out. */
export type LivePolicy = 'OPEN' | 'LIMITED';

/** Why somebody is on the guest list — named, on a team, or on a task. */
export type LiveInviteSource = 'DIRECT' | 'TEAM' | 'TASK';

/** One person on the guest list, with why they are on it and what they may do. */
export interface LiveRoomMember {
  user: UserSummary;
  source: LiveInviteSource;
  isModerator: boolean;
  /** `null` means "follow the room's policy" — see the API's `LiveRoomMember`. */
  canSpeak: boolean | null;
  canPresent: boolean | null;
}

/** What one person may do in one room, already resolved by the API. */
export interface LiveEntitlements {
  canSpeak: boolean;
  canPresent: boolean;
  isModerator: boolean;
}

/**
 * A live room as the tab reads it.
 *
 * Deliberately *not* a `Meeting`. A meeting is a diary entry with a place and
 * a guest list; this is the call itself, with a permission model and a
 * lifetime measured in minutes. The two live side by side — see the note on
 * `LiveRoom` in the API's schema.
 */
export interface LiveRoom {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string | null;
  audience: LiveAudience;
  talkPolicy: LivePolicy;
  screenPolicy: LivePolicy;
  /** First arrival. Null on a room nobody has walked into yet. */
  startedAt: string | null;
  /** Set when somebody closed it. A room with this set cannot be rejoined. */
  endedAt: string | null;
  createdAt: string;
  createdBy: UserSummary;
  /** The page everybody should have open, if one was linked. */
  document: { id: string; title: string } | null;
  members: LiveRoomMember[];
  teams: { id: string; name: string; color: string }[];
  tasks: { id: string; title: string; color: string; status: string }[];
  /** The reader's own standing, resolved against policy and grants. */
  you: LiveEntitlements;
  /** The mesh's ceiling, so the UI can say what it is rather than guess. */
  maxParticipants: number;
}

export interface CreateLiveRoomPayload {
  projectId: string;
  title: string;
  description?: string;
  /** Absent means "now", which is what most rooms are. */
  opensAt?: string;
  closesAt?: string;
  audience?: LiveAudience;
  talkPolicy?: LivePolicy;
  screenPolicy?: LivePolicy;
  documentId?: string;
  memberIds?: string[];
  teamIds?: string[];
  taskIds?: string[];
}

/**
 * Every field optional, and the three lists are replace-not-merge: sending
 * `taskIds` at all means "the tasks are now exactly these".
 *
 * The two clearable fields are `Omit`ted before being redeclared rather than
 * intersected on top. An intersection would have to satisfy *both* halves, so
 * `string | null` meeting `string | undefined` collapses back to
 * `string | undefined` — and null is the only way to take a linked document or
 * a closing time back off a room.
 */
export type UpdateLiveRoomPayload = Partial<
  Omit<CreateLiveRoomPayload, 'projectId' | 'closesAt' | 'documentId'>
> & {
  closesAt?: string | null;
  documentId?: string | null;
};

export interface GrantLiveRoomPayload {
  userId: string;
  /** `null` clears the override so the person follows the room's policy again. */
  canSpeak?: boolean | null;
  canPresent?: boolean | null;
  isModerator?: boolean;
}

// ---------------------------------------------------------------------------
// The call itself — everything below travels over the socket, never the API.
// ---------------------------------------------------------------------------

/** The four things a participant tile draws. */
export interface LiveFlags {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  handRaised: boolean;
}

/**
 * One socket in a call.
 *
 * `participantId` is the socket id and is the address peers sign to. It is
 * *not* the user id: the same person on a phone and a laptop would be two
 * seats, and the gateway turns the older one out precisely so that never
 * happens — but the two ids still mean different things and conflating them is
 * how a peer connection ends up addressed to the wrong tab.
 */
export interface LiveSeat {
  participantId: string;
  userId: string;
  user: UserSummary;
  canSpeak: boolean;
  canPresent: boolean;
  isModerator: boolean;
  flags: LiveFlags;
  /**
   * Arrival order in this room, monotonic and never reused.
   *
   * The whole negotiation protocol: **the peer with the lower `seq` sends the
   * offer.** See `use-live-call.ts`, and the gateway's `joinRoom` for why this
   * beats the usual polite/impolite dance.
   */
  seq: number;
}

/** What the gateway answers a `live:join` with. */
export interface LiveJoinResult {
  roomId: string;
  self: LiveSeat;
  peers: LiveSeat[];
  maxParticipants: number;
}

/** What the browser needs before it can find a route to a peer. */
export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * The ICE list, plus when it stops being usable.
 *
 * `expiresAt` is epoch milliseconds, or `null` when nothing in the list can
 * expire — a STUN-only deployment, or one still on a static TURN credential.
 * It exists because a relay credential is now minted per request and lives a
 * few hours (see `LiveController.ice`), and a client that cached one forever
 * would hand an expired username to `RTCPeerConnection` and lose the relay
 * exactly when it needed it: on the retry after a direct route failed.
 */
export interface IceServerBundle {
  iceServers: IceServerConfig[];
  expiresAt: number | null;
}

/**
 * How a connection to one peer is doing, as the tile draws it.
 *
 * Three states rather than a number, because a number invites the reader to
 * do arithmetic they have no basis for. What somebody watching a call needs to
 * know is whether this is fine, whether it is about to get worse, and whether
 * it is already broken.
 */
export type LiveQualityLevel = 'good' | 'weak' | 'bad';

export interface LiveQuality {
  level: LiveQualityLevel;
  /** Fraction of packets lost on the inbound stream, 0..1. */
  loss: number;
  /** Inbound jitter in milliseconds. */
  jitter: number;
  /** What the congestion controller thinks this link can carry, in bits/s. */
  outgoingBitrate: number | null;
  /**
   * Whether the media is going through the relay rather than straight there.
   *
   * Not a fault — it is the thing that makes the call work at all behind a
   * symmetric NAT — but it is the single most useful fact when somebody asks
   * why a call is worse than usual, and nothing else in the interface can say
   * it. See `use-live-call`'s stats poll.
   */
  isRelayed: boolean;
}
