import type {
  Bay, Coach, Member, Booking, CurrentUser,
  AppSettings, BlockedSlot, PaymentRecord,
} from '@/types';

export const INITIAL_BAYS: Bay[] = [
  { id: 'bay-1', name: '打位 1', equipmentType: '基础模拟器', pricePerHour: 100, status: 'available' },
  { id: 'bay-2', name: '打位 2', equipmentType: '基础模拟器', pricePerHour: 100, status: 'available' },
  { id: 'bay-3', name: '打位 3', equipmentType: '基础模拟器', pricePerHour: 100, status: 'available' },
  { id: 'bay-4', name: '打位 4', equipmentType: '高清模拟器', pricePerHour: 150, status: 'available' },
  { id: 'bay-5', name: '打位 5', equipmentType: '高清模拟器', pricePerHour: 150, status: 'available' },
  { id: 'bay-6', name: '包房 A', equipmentType: 'TrackMan 包房', pricePerHour: 280, status: 'available' },
  { id: 'bay-7', name: '包房 B', equipmentType: 'TrackMan 包房', pricePerHour: 280, status: 'available' },
  { id: 'bay-8', name: '教学打位', equipmentType: '教学专用', pricePerHour: 120, status: 'available' },
];

export const INITIAL_COACHES: Coach[] = [
  { id: 'coach-1', name: '李教练', specialty: '挥杆基础', phone: '13900139001', status: 'active' },
  { id: 'coach-2', name: '王教练', specialty: '短杆技巧', phone: '13900139002', status: 'active' },
  { id: 'coach-3', name: '张教练', specialty: '全挥杆优化', phone: '13900139003', status: 'active' },
  { id: 'coach-4', name: '陈教练', specialty: '推杆专项', phone: '13900139004', status: 'active' },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'member-1', name: '张三', phone: '13800138001', primaryCoachId: 'coach-1', primaryCoachName: '李教练', remainingLessonHours: 10, remainingPracticeHours: 20 },
  { id: 'member-2', name: '李四', phone: '13800138002', primaryCoachId: 'coach-2', primaryCoachName: '王教练', remainingLessonHours: 5, remainingPracticeHours: 8 },
  { id: 'member-3', name: '王五', phone: '13800138003', primaryCoachId: 'coach-1', primaryCoachName: '李教练', remainingLessonHours: 12, remainingPracticeHours: 15 },
  { id: 'member-4', name: '赵六', phone: '13800138004', primaryCoachId: 'coach-3', primaryCoachName: '张教练', remainingLessonHours: 3, remainingPracticeHours: 5 },
  { id: 'member-5', name: '钱七', phone: '13800138005', remainingLessonHours: 0, remainingPracticeHours: 10 },
  { id: 'member-6', name: '孙八', phone: '13800138006', primaryCoachId: 'coach-4', primaryCoachName: '陈教练', remainingLessonHours: 8, remainingPracticeHours: 12 },
];

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const today = getTodayStr();

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'booking-1',
    memberId: 'member-1',
    memberName: '张三',
    bayId: 'bay-1',
    bayName: '打位 1',
    coachId: 'coach-1',
    coachName: '李教练',
    date: today,
    startTime: '09:00',
    endTime: '10:00',
    type: 'lesson',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'staff',
    price: 100,
    hoursDeducted: true,
  },
  {
    id: 'booking-2',
    memberId: 'member-1',
    memberName: '张三',
    bayId: 'bay-1',
    bayName: '打位 1',
    date: today,
    startTime: '10:00',
    endTime: '11:00',
    type: 'practice',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'staff',
    price: 100,
    hoursDeducted: true,
  },
  {
    id: 'booking-3',
    memberId: 'member-2',
    memberName: '李四',
    bayId: 'bay-3',
    bayName: '打位 3',
    date: today,
    startTime: '10:00',
    endTime: '11:00',
    type: 'practice',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'member',
    price: 100,
    hoursDeducted: true,
  },
  {
    id: 'booking-4',
    memberId: 'member-3',
    memberName: '王五',
    bayId: 'bay-6',
    bayName: '包房 A',
    coachId: 'coach-1',
    coachName: '李教练',
    date: today,
    startTime: '14:00',
    endTime: '15:00',
    type: 'lesson',
    status: 'pending',
    pendingFor: 'coach',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    createdBy: 'member',
    price: 280,
  },
  {
    id: 'booking-5',
    memberId: 'member-4',
    memberName: '赵六',
    bayId: 'bay-4',
    bayName: '打位 4',
    coachId: 'coach-2',
    coachName: '王教练',
    date: today,
    startTime: '16:00',
    endTime: '17:00',
    type: 'lesson',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'staff',
    price: 150,
    hoursDeducted: true,
    additionalMembers: [
      { id: 'member-5', name: '钱七' },
    ],
  },
];

export const INITIAL_USERS: CurrentUser[] = [
  { role: 'admin', id: 'admin-1', name: '前台小李' },
];

export const INITIAL_SETTINGS: AppSettings = {
  advanceBookingDays: 30,
  holdMinutes: 30,
};

export const INITIAL_BLOCKED_SLOTS: BlockedSlot[] = [
  {
    id: 'blocked-1',
    coachId: 'coach-2',
    coachName: '王教练',
    date: today,
    startTime: '12:00',
    endTime: '13:00',
    reason: '午休',
  },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'payment-1',
    memberId: 'member-1',
    memberName: '张三',
    item: 'lesson',
    hours: 10,
    amountDue: 2000,
    amountPaid: 2000,
    method: '微信',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    operatorId: 'admin-1',
    operatorName: '前台小李',
  },
  {
    id: 'payment-2',
    memberId: 'member-1',
    memberName: '张三',
    item: 'practice',
    hours: 20,
    amountDue: 1800,
    amountPaid: 1800,
    method: '支付宝',
    note: '开业优惠 9 折',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    operatorId: 'admin-1',
    operatorName: '前台小李',
  },
];
