import { useSyncExternalStore, useCallback } from 'react';
import type {
  Bay, Coach, Member, Booking, CurrentUser,
  AppSettings, BusinessHoursMap, BlockedSlot, PaymentRecord, RescheduleProposal,
} from '@/types';
import { DEFAULT_DAY_HOURS, SLOT_MINUTES } from '@/types';
import {
  INITIAL_BAYS, INITIAL_COACHES, INITIAL_MEMBERS,
  INITIAL_BOOKINGS, INITIAL_USERS, INITIAL_SETTINGS,
  INITIAL_BLOCKED_SLOTS, INITIAL_PAYMENTS,
} from '@/data/mockData';

// ====== State ======

export interface AppState {
  bays: Bay[];
  coaches: Coach[];
  members: Member[];
  bookings: Booking[];
  currentUser: CurrentUser | null;
  users: CurrentUser[];
  settings: AppSettings;
  businessHours: BusinessHoursMap;
  blockedSlots: BlockedSlot[];
  payments: PaymentRecord[];
}

const STORAGE_KEY = 'golf-booking-app-v2';

function loadState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      // Guard against stale persisted state with missing/empty user list,
      // which would make role selection a no-op.
      if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
        delete parsed.users;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return {};
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const initialState: AppState = {
  bays: INITIAL_BAYS,
  coaches: INITIAL_COACHES,
  members: INITIAL_MEMBERS,
  bookings: INITIAL_BOOKINGS,
  currentUser: null,
  users: INITIAL_USERS,
  settings: INITIAL_SETTINGS,
  businessHours: {},
  blockedSlots: INITIAL_BLOCKED_SLOTS,
  payments: INITIAL_PAYMENTS,
  ...loadState(),
};

// ====== Time helpers ======

export function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function bookingHours(b: Pick<Booking, 'startTime' | 'endTime'>) {
  return (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) / 60;
}

export function getDayHours(date: string, businessHours: BusinessHoursMap) {
  return businessHours[date] ?? DEFAULT_DAY_HOURS;
}

export function generateSlots(start: string, end: string): string[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const out: string[] = [];
  for (let t = s; t < e; t += SLOT_MINUTES) out.push(minutesToTime(t));
  return out;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ====== 课时扣减 / 退还 ======

// sign = -1 扣除，+1 退还。教练课：主会员与额外学员都扣教练课时；练习：只扣主会员练习时长。
function applyHours(members: Member[], booking: Booking, sign: 1 | -1): Member[] {
  const hrs = bookingHours(booking);
  const field = booking.type === 'lesson' ? 'remainingLessonHours' : 'remainingPracticeHours';
  const ids = [booking.memberId];
  if (booking.type === 'lesson' && booking.additionalMembers) {
    ids.push(...booking.additionalMembers.map((m) => m.id));
  }
  return members.map((m) => {
    if (!ids.includes(m.id)) return m;
    const next = Math.max(0, Math.round((m[field] + sign * hrs) * 100) / 100);
    return { ...m, [field]: next };
  });
}

// ====== Actions ======

type Action =
  | { type: 'SET_USER'; user: CurrentUser | null }
  | { type: 'ADD_BAY'; bay: Bay }
  | { type: 'UPDATE_BAY'; bay: Bay }
  | { type: 'REMOVE_BAY'; id: string }
  | { type: 'ADD_COACH'; coach: Coach }
  | { type: 'UPDATE_COACH'; coach: Coach }
  | { type: 'REMOVE_COACH'; id: string }
  | { type: 'ADD_MEMBER'; member: Member }
  | { type: 'UPDATE_MEMBER'; member: Member }
  | { type: 'REMOVE_MEMBER'; id: string }
  | { type: 'ADD_BOOKING'; booking: Booking }
  | { type: 'UPDATE_BOOKING'; booking: Booking }
  | { type: 'CANCEL_BOOKING'; id: string }
  | { type: 'CONFIRM_BOOKING'; id: string }
  | { type: 'COMPLETE_BOOKING'; id: string }
  | { type: 'PROPOSE_RESCHEDULE'; id: string; proposal: RescheduleProposal }
  | { type: 'ACCEPT_RESCHEDULE'; id: string }
  | { type: 'REJECT_RESCHEDULE'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: AppSettings }
  | { type: 'SET_DAY_HOURS'; date: string; hours: { start: string; end: string } | null }
  | { type: 'ADD_BLOCKED'; slot: BlockedSlot }
  | { type: 'REMOVE_BLOCKED'; id: string }
  | { type: 'ADD_PAYMENT'; payment: PaymentRecord }
  | { type: 'RESET_DATA' };

export function reducer(state: AppState, action: Action): AppState {
  let next: AppState;
  switch (action.type) {
    case 'SET_USER':
      next = { ...state, currentUser: action.user };
      break;
    case 'ADD_BAY':
      next = { ...state, bays: [...state.bays, action.bay] };
      break;
    case 'UPDATE_BAY':
      next = { ...state, bays: state.bays.map((b) => (b.id === action.bay.id ? action.bay : b)) };
      break;
    case 'REMOVE_BAY':
      next = { ...state, bays: state.bays.filter((b) => b.id !== action.id) };
      break;
    case 'ADD_COACH':
      next = { ...state, coaches: [...state.coaches, action.coach] };
      break;
    case 'UPDATE_COACH':
      next = { ...state, coaches: state.coaches.map((c) => (c.id === action.coach.id ? action.coach : c)) };
      break;
    case 'REMOVE_COACH':
      next = { ...state, coaches: state.coaches.filter((c) => c.id !== action.id) };
      break;
    case 'ADD_MEMBER':
      next = { ...state, members: [...state.members, action.member] };
      break;
    case 'UPDATE_MEMBER':
      next = { ...state, members: state.members.map((m) => (m.id === action.member.id ? action.member : m)) };
      break;
    case 'REMOVE_MEMBER':
      next = { ...state, members: state.members.filter((m) => m.id !== action.id) };
      break;
    case 'ADD_BOOKING': {
      const booking = action.booking;
      const deduct = booking.status === 'confirmed' && !booking.hoursDeducted;
      next = {
        ...state,
        bookings: [...state.bookings, deduct ? { ...booking, hoursDeducted: true } : booking],
        members: deduct ? applyHours(state.members, booking, -1) : state.members,
      };
      break;
    }
    case 'UPDATE_BOOKING': {
      const old = state.bookings.find((b) => b.id === action.booking.id);
      if (!old) return state;
      const nb = action.booking;
      let members = state.members;
      let hoursDeducted = nb.hoursDeducted ?? false;
      if (old.hoursDeducted) members = applyHours(members, old, 1); // 先退旧
      if (nb.status === 'confirmed') {
        members = applyHours(members, nb, -1); // 再扣新
        hoursDeducted = true;
      } else {
        hoursDeducted = false;
      }
      next = {
        ...state,
        members,
        // 直接修改（前台/管理员）时同步清除可能存在的待确认改约方案，避免方案过期
        bookings: state.bookings.map((b) => (b.id === nb.id ? { ...nb, hoursDeducted, reschedule: undefined } : b)),
      };
      break;
    }
    case 'CANCEL_BOOKING': {
      const old = state.bookings.find((b) => b.id === action.id);
      if (!old) return state;
      next = {
        ...state,
        members: old.hoursDeducted ? applyHours(state.members, old, 1) : state.members,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, status: 'cancelled' as const, hoursDeducted: false, pendingFor: undefined, reschedule: undefined } : b
        ),
      };
      break;
    }
    case 'CONFIRM_BOOKING': {
      const old = state.bookings.find((b) => b.id === action.id);
      if (!old) return state;
      const deduct = !old.hoursDeducted;
      next = {
        ...state,
        members: deduct ? applyHours(state.members, old, -1) : state.members,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? { ...b, status: 'confirmed' as const, pendingFor: undefined, hoursDeducted: true }
            : b
        ),
      };
      break;
    }
    case 'COMPLETE_BOOKING':
      next = {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.id ? { ...b, status: 'completed' as const } : b)),
      };
      break;
    // 教练/前台对已确认预约发起改约：方案挂在原预约上，原预约保持 confirmed、课时不动
    case 'PROPOSE_RESCHEDULE': {
      const old = state.bookings.find((b) => b.id === action.id);
      if (!old || old.status !== 'confirmed') return state;
      next = {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, reschedule: action.proposal } : b
        ),
      };
      break;
    }
    // 会员接受改约：套用方案字段，退旧课时、扣新课时，清除方案
    case 'ACCEPT_RESCHEDULE': {
      const old = state.bookings.find((b) => b.id === action.id);
      if (!old || !old.reschedule || old.status !== 'confirmed') return state;
      const p = old.reschedule;
      const merged: Booking = {
        ...old,
        date: p.date, startTime: p.startTime, endTime: p.endTime,
        bayId: p.bayId, bayName: p.bayName,
        coachId: p.coachId, coachName: p.coachName,
        additionalMembers: p.additionalMembers,
        notes: p.notes,
        price: p.price,
        reschedule: undefined,
        hoursDeducted: true,
      };
      let members = state.members;
      if (old.hoursDeducted) members = applyHours(members, old, 1); // 退旧
      members = applyHours(members, merged, -1); // 扣新
      next = {
        ...state,
        members,
        bookings: state.bookings.map((b) => (b.id === action.id ? merged : b)),
      };
      break;
    }
    // 会员拒绝改约：仅清除方案，原预约与课时保持不变
    case 'REJECT_RESCHEDULE': {
      const old = state.bookings.find((b) => b.id === action.id);
      if (!old || !old.reschedule) return state;
      next = {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, reschedule: undefined } : b
        ),
      };
      break;
    }
    case 'UPDATE_SETTINGS':
      next = { ...state, settings: action.settings };
      break;
    case 'SET_DAY_HOURS': {
      const businessHours = { ...state.businessHours };
      if (action.hours) businessHours[action.date] = action.hours;
      else delete businessHours[action.date];
      next = { ...state, businessHours };
      break;
    }
    case 'ADD_BLOCKED':
      next = { ...state, blockedSlots: [...state.blockedSlots, action.slot] };
      break;
    case 'REMOVE_BLOCKED':
      next = { ...state, blockedSlots: state.blockedSlots.filter((s) => s.id !== action.id) };
      break;
    case 'ADD_PAYMENT': {
      const p = action.payment;
      const field = p.item === 'lesson' ? 'remainingLessonHours' : 'remainingPracticeHours';
      next = {
        ...state,
        payments: [...state.payments, p],
        members: state.members.map((m) =>
          m.id === p.memberId ? { ...m, [field]: Math.round((m[field] + p.hours) * 100) / 100 } : m
        ),
      };
      break;
    }
    case 'RESET_DATA':
      next = {
        bays: INITIAL_BAYS,
        coaches: INITIAL_COACHES,
        members: INITIAL_MEMBERS,
        bookings: INITIAL_BOOKINGS,
        currentUser: state.currentUser,
        users: INITIAL_USERS,
        settings: INITIAL_SETTINGS,
        businessHours: {},
        blockedSlots: INITIAL_BLOCKED_SLOTS,
        payments: INITIAL_PAYMENTS,
      };
      break;
    default:
      return state;
  }
  saveState(next);
  return next;
}

// ====== Shared store ======
// A single module-level store so every useAppStore() caller (App, RoleSelect,
// dashboards, ...) shares the same state.

let appState: AppState = initialState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  return appState;
}

function dispatch(action: Action) {
  const next = reducer(appState, action);
  if (next === appState) return;
  appState = next;
  saveState(appState);
  listeners.forEach((l) => l());
}

// ====== Hook ======

export function useAppStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const setUser = useCallback((user: CurrentUser | null) => dispatch({ type: 'SET_USER', user }), []);
  const addBay = useCallback((bay: Bay) => dispatch({ type: 'ADD_BAY', bay }), []);
  const updateBay = useCallback((bay: Bay) => dispatch({ type: 'UPDATE_BAY', bay }), []);
  const removeBay = useCallback((id: string) => dispatch({ type: 'REMOVE_BAY', id }), []);
  const addCoach = useCallback((coach: Coach) => dispatch({ type: 'ADD_COACH', coach }), []);
  const updateCoach = useCallback((coach: Coach) => dispatch({ type: 'UPDATE_COACH', coach }), []);
  const removeCoach = useCallback((id: string) => dispatch({ type: 'REMOVE_COACH', id }), []);
  const addMember = useCallback((member: Member) => dispatch({ type: 'ADD_MEMBER', member }), []);
  const updateMember = useCallback((member: Member) => dispatch({ type: 'UPDATE_MEMBER', member }), []);
  const removeMember = useCallback((id: string) => dispatch({ type: 'REMOVE_MEMBER', id }), []);
  const addBooking = useCallback((booking: Booking) => dispatch({ type: 'ADD_BOOKING', booking }), []);
  const updateBooking = useCallback((booking: Booking) => dispatch({ type: 'UPDATE_BOOKING', booking }), []);
  const cancelBooking = useCallback((id: string) => dispatch({ type: 'CANCEL_BOOKING', id }), []);
  const confirmBooking = useCallback((id: string) => dispatch({ type: 'CONFIRM_BOOKING', id }), []);
  const completeBooking = useCallback((id: string) => dispatch({ type: 'COMPLETE_BOOKING', id }), []);
  const proposeReschedule = useCallback((id: string, proposal: RescheduleProposal) =>
    dispatch({ type: 'PROPOSE_RESCHEDULE', id, proposal }), []);
  const acceptReschedule = useCallback((id: string) => dispatch({ type: 'ACCEPT_RESCHEDULE', id }), []);
  const rejectReschedule = useCallback((id: string) => dispatch({ type: 'REJECT_RESCHEDULE', id }), []);
  const updateSettings = useCallback((settings: AppSettings) => dispatch({ type: 'UPDATE_SETTINGS', settings }), []);
  const setDayHours = useCallback((date: string, hours: { start: string; end: string } | null) =>
    dispatch({ type: 'SET_DAY_HOURS', date, hours }), []);
  const addBlocked = useCallback((slot: BlockedSlot) => dispatch({ type: 'ADD_BLOCKED', slot }), []);
  const removeBlocked = useCallback((id: string) => dispatch({ type: 'REMOVE_BLOCKED', id }), []);
  const addPayment = useCallback((payment: PaymentRecord) => dispatch({ type: 'ADD_PAYMENT', payment }), []);
  const resetData = useCallback(() => dispatch({ type: 'RESET_DATA' }), []);

  return {
    state,
    actions: {
      setUser,
      addBay, updateBay, removeBay,
      addCoach, updateCoach, removeCoach,
      addMember, updateMember, removeMember,
      addBooking, updateBooking,
      cancelBooking, confirmBooking, completeBooking,
      proposeReschedule, acceptReschedule, rejectReschedule,
      updateSettings, setDayHours,
      addBlocked, removeBlocked,
      addPayment,
      resetData,
    },
  };
}

// ====== Conflict Check ======
// 规则：pending（待确认）预约不占资源，只在确认时检查冲突。

export interface ConflictCandidate {
  date: string;
  startTime: string;
  endTime: string;
  bayId: string;
  coachId?: string;
  memberId: string;
  additionalMemberIds?: string[];
  excludeId?: string;
}

export function checkConflict(
  bookings: Booking[],
  blockedSlots: BlockedSlot[],
  candidate: ConflictCandidate
): string | null {
  const s = timeToMinutes(candidate.startTime);
  const e = timeToMinutes(candidate.endTime);
  const candMemberIds = [candidate.memberId, ...(candidate.additionalMemberIds ?? [])];

  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'pending') continue;
    if (b.date !== candidate.date) continue;
    if (candidate.excludeId && b.id === candidate.excludeId) continue;

    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    const overlap = s < be && e > bs;
    if (!overlap) continue;

    if (b.bayId === candidate.bayId) {
      return `打位 "${b.bayName}" 在该时段已被占用`;
    }
    if (candidate.coachId && b.coachId === candidate.coachId) {
      return `教练 "${b.coachName}" 在该时段已有安排`;
    }
    const bMemberIds = [b.memberId, ...(b.additionalMembers?.map((m) => m.id) ?? [])];
    const hit = candMemberIds.find((id) => bMemberIds.includes(id));
    if (hit) {
      const name =
        hit === b.memberId
          ? b.memberName
          : b.additionalMembers?.find((m) => m.id === hit)?.name ??
            (hit === candidate.memberId
              ? '该会员'
              : '额外学员');
      return `会员 "${name}" 在该时段已有预订`;
    }
  }

  // 教练休息 / 不可预约时段
  if (candidate.coachId) {
    for (const slot of blockedSlots) {
      if (slot.coachId !== candidate.coachId || slot.date !== candidate.date) continue;
      const bs = timeToMinutes(slot.startTime);
      const be = timeToMinutes(slot.endTime);
      if (s < be && e > bs) {
        return `教练 "${slot.coachName}" 在该时段已设置不可预约${slot.reason ? `（${slot.reason}）` : ''}`;
      }
    }
  }
  return null;
}
