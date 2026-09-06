// ====== 基础实体 ======

export interface Bay {
  id: string;
  name: string;
  equipmentType: string;   // 设备描述，如 "基础模拟器"、"TrackMan包房"
  pricePerHour: number;    // 每小时价格（元）
  status: 'available' | 'maintenance';
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  // 学员关联的主教练（会员也可以预约其他教练）
  primaryCoachId?: string;
  primaryCoachName?: string;
  // 剩余教练课时（小时）
  remainingLessonHours: number;
  // 剩余练习时长（小时）
  remainingPracticeHours: number;
}

// ====== 预约 ======

export type BookingType = 'practice' | 'lesson';

export type BookingStatus =
  | 'pending'   // 待确认（不占资源，确认时才检查冲突）
  | 'confirmed' // 已确认
  | 'cancelled' // 已取消
  | 'completed'; // 已完成

// 待确认预约等待谁来确认：
// 'coach'  —— 会员提交的教练课，前台或对应教练均可确认
// 'member' —— 教练/前台为会员创建或改约的预约，需会员确认
export type PendingFor = 'coach' | 'member';

// 改约方案：教练/前台对已确认预约发起改约时，方案与原预约分离存储；
// 原预约保持 confirmed 且课时不动，会员接受后才替换时间并退旧扣新，拒绝则仅清除方案。
export interface RescheduleProposal {
  date: string;
  startTime: string;
  endTime: string;
  bayId: string;
  bayName: string;
  coachId?: string;
  coachName?: string;
  additionalMembers?: { id: string; name: string }[];
  notes?: string;
  price?: number;
  requestedBy: 'coach' | 'staff';
  requestedAt: string; // ISO timestamp
}

export interface Booking {
  id: string;
  // 主预约人
  memberId: string;
  memberName: string;
  bayId: string;
  bayName: string;
  coachId?: string;
  coachName?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  type: BookingType;
  status: BookingStatus;
  pendingFor?: PendingFor;
  notes?: string;
  createdAt: string;  // ISO timestamp
  // 多人课程：其他参与会员
  additionalMembers?: { id: string; name: string }[];
  // 谁创建的预约
  createdBy: 'member' | 'staff' | 'coach';
  // 预计费用（元），按打位价格 × 时长
  price?: number;
  // 是否已在确认时扣减课时（用于取消时退还）
  hoursDeducted?: boolean;
  // 待会员确认的改约方案（原预约仍按本记录的时间/打位执行）
  reschedule?: RescheduleProposal;
}

// ====== 教练不可预约时段（休息 / 准备）======

export interface BlockedSlot {
  id: string;
  coachId: string;
  coachName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;
  endTime: string;
  reason?: string;
}

// ====== 付费 / 充值记录 ======

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  item: 'practice' | 'lesson'; // 练习时长 / 教练课时
  hours: number;               // 增加的额度（小时）
  amountDue: number;           // 应收金额（元）
  amountPaid: number;          // 实收金额（元）
  method: string;              // 付款方式：微信 / 支付宝 / 现金 / 刷卡…
  note?: string;               // 折扣、赠课、补偿等说明
  createdAt: string;           // ISO timestamp
  operatorId: string;
  operatorName: string;        // 操作人（前台或教练）
}

// ====== 全局配置 ======

export interface AppSettings {
  advanceBookingDays: number; // 最多提前多少天预约，默认 30
  holdMinutes: number;        // 方案保留时长（分钟），候补/方案确认用，默认 30
}

// 每日营业时间：key 为 YYYY-MM-DD；缺省使用 DEFAULT_DAY_HOURS
export type BusinessHoursMap = Record<string, { start: string; end: string }>;

export const DEFAULT_DAY_HOURS = { start: '08:00', end: '22:00' };

export const SLOT_MINUTES = 15;

// 默认全天 15 分钟粒度的时间槽（08:00 - 22:00）
export const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let t = 8 * 60; t < 22 * 60; t += SLOT_MINUTES) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
})();

// 预约时长选项（分钟），最短 1 小时
export const DURATION_OPTIONS = [60, 90, 120, 180];

// ====== 角色 ======

export type UserRole = 'admin' | 'coach' | 'member';

export interface CurrentUser {
  role: UserRole;
  id: string;
  name: string;
}
