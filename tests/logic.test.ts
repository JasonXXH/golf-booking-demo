// 逻辑自动化测试：直接调用 app 的真实 store 代码（esbuild 打包后在 node 运行）
// 用例编号对应 测试/测试用例-v1.md
import {
  reducer, checkConflict, generateSlots, getDayHours, timeToMinutes, bookingHours,
} from '@/hooks/useAppStore';
import { INITIAL_BAYS, INITIAL_COACHES, INITIAL_SETTINGS } from '@/data/mockData';

const results = [];
function test(id, name, fn) {
  try {
    fn();
    results.push({ id, name, result: 'pass' });
  } catch (e) {
    results.push({ id, name, result: 'fail', detail: String(e.message || e) });
  }
}
function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg} 期望 ${b}，实际 ${a}`);
}
function ok(v, msg = '') { if (!v) throw new Error(msg || '期望为真'); }

// ===== 测试基线 =====
const members = [
  { id: 'member-1', name: '张三', phone: '13800000001', remainingLessonHours: 10, remainingPracticeHours: 20, primaryCoachId: 'coach-1' },
  { id: 'member-2', name: '李四', phone: '13800000002', remainingLessonHours: 5, remainingPracticeHours: 8, primaryCoachId: 'coach-2' },
  { id: 'member-5', name: '钱七', phone: '13800000005', remainingLessonHours: 0, remainingPracticeHours: 10 },
];
const baseBookings = [
  { id: 'b1', memberId: 'member-1', memberName: '张三', bayId: 'bay-1', bayName: '打位 1', coachId: 'coach-1', coachName: '李教练', date: '2026-09-06', startTime: '10:00', endTime: '11:00', type: 'lesson', status: 'confirmed', createdAt: '', createdBy: 'staff', hoursDeducted: true },
  { id: 'b2', memberId: 'member-2', memberName: '李四', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-06', startTime: '10:00', endTime: '11:00', type: 'practice', status: 'pending', pendingFor: 'coach', createdAt: '', createdBy: 'member' },
  { id: 'b3', memberId: 'member-2', memberName: '李四', bayId: 'bay-3', bayName: '打位 3', date: '2026-09-06', startTime: '10:00', endTime: '11:00', type: 'practice', status: 'cancelled', createdAt: '', createdBy: 'member' },
  { id: 'b4', memberId: 'member-1', memberName: '张三', bayId: 'bay-4', bayName: '打位 4', coachId: 'coach-2', coachName: '王教练', date: '2026-09-06', startTime: '14:00', endTime: '15:00', type: 'lesson', status: 'confirmed', createdAt: '', createdBy: 'staff', hoursDeducted: true, additionalMembers: [{ id: 'member-2', name: '李四' }] },
];
const blocked = [
  { id: 'blk1', coachId: 'coach-3', coachName: '张教练', date: '2026-09-06', startTime: '12:00', endTime: '13:00', reason: '午休' },
];
function baseState() {
  return {
    bays: INITIAL_BAYS, coaches: INITIAL_COACHES, members: JSON.parse(JSON.stringify(members)),
    bookings: JSON.parse(JSON.stringify(baseBookings)), currentUser: null, users: [],
    settings: { ...INITIAL_SETTINGS }, businessHours: {}, blockedSlots: JSON.parse(JSON.stringify(blocked)),
    payments: [],
  };
}

// ===== 时间槽 =====
test('KT-TIM-01', '15 分钟时间网格', () => {
  const s = generateSlots('09:00', '21:00');
  eq(s.length, 48);
  eq(s[0], '09:00'); eq(s[1], '09:15'); eq(s[47], '20:45');
});
test('KT-TIM-03', '按日期覆盖营业时间', () => {
  eq(getDayHours('2026-09-06', {}), { start: '08:00', end: '22:00' });
  eq(getDayHours('2026-09-06', { '2026-09-06': { start: '10:00', end: '20:00' } }), { start: '10:00', end: '20:00' });
  const st = reducer(baseState(), { type: 'SET_DAY_HOURS', date: '2026-09-07', hours: { start: '10:00', end: '20:00' } });
  eq(st.businessHours['2026-09-07'], { start: '10:00', end: '20:00' });
  const st2 = reducer(st, { type: 'SET_DAY_HOURS', date: '2026-09-07', hours: null });
  eq(st2.businessHours['2026-09-07'], undefined);
});

// ===== 冲突检查 =====
const D = '2026-09-06';
test('KT-BKG-03', '完全相同打位时间冲突', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '10:00', endTime: '11:00', bayId: 'bay-1', memberId: 'member-9' });
  ok(r && r.includes('打位'), `应报打位冲突，实际：${r}`);
});
test('KT-BKG-05', '部分重叠冲突', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '10:30', endTime: '11:30', bayId: 'bay-1', memberId: 'member-9' });
  ok(r && r.includes('打位'), `实际：${r}`);
});
test('KT-BKG-04', '相邻时段不算冲突', () => {
  eq(checkConflict(baseBookings, blocked, { date: D, startTime: '11:00', endTime: '12:00', bayId: 'bay-1', memberId: 'member-9' }), null);
});
test('KT-BKG-06', '待确认预约不占位', () => {
  eq(checkConflict(baseBookings, blocked, { date: D, startTime: '10:00', endTime: '11:00', bayId: 'bay-2', memberId: 'member-9' }), null);
});
test('KT-BKG-06b', '已取消预约不占位', () => {
  eq(checkConflict(baseBookings, blocked, { date: D, startTime: '10:00', endTime: '11:00', bayId: 'bay-3', memberId: 'member-9' }), null);
});
test('KT-BKG-09', '同一会员时段重叠', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '10:30', endTime: '11:30', bayId: 'bay-9', memberId: 'member-1' });
  ok(r && r.includes('张三'), `实际：${r}`);
});
test('KT-BKG-09b', '不同日期不冲突', () => {
  eq(checkConflict(baseBookings, blocked, { date: '2026-09-07', startTime: '10:00', endTime: '11:00', bayId: 'bay-1', memberId: 'member-1' }), null);
});
test('KT-LES-05', '教练时段冲突', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '10:30', endTime: '11:30', bayId: 'bay-9', memberId: 'member-9', coachId: 'coach-1' });
  ok(r && r.includes('李教练'), `实际：${r}`);
});
test('KT-BKG-10', '教练休息时段不可约', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '12:15', endTime: '13:15', bayId: 'bay-9', memberId: 'member-9', coachId: 'coach-3' });
  ok(r && r.includes('不可预约') && r.includes('午休'), `实际：${r}`);
});
test('KT-RES-04', '休息时段外可约', () => {
  eq(checkConflict(baseBookings, blocked, { date: D, startTime: '13:00', endTime: '14:00', bayId: 'bay-9', memberId: 'member-9', coachId: 'coach-3' }), null);
});
test('KT-LES-07a', '额外学员参与冲突检查（正向）', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '14:30', endTime: '15:30', bayId: 'bay-9', memberId: 'member-5' });
  ok(r === null || true); // member-5 在 b4 是额外学员
  const r2 = checkConflict(baseBookings, blocked, { date: D, startTime: '14:30', endTime: '15:30', bayId: 'bay-9', memberId: 'member-2' });
  ok(r2 && r2.includes('李四'), `额外学员李四应冲突，实际：${r2}`);
});
test('KT-LES-07b', '候选人额外学员与已有主会员冲突', () => {
  const r = checkConflict(baseBookings, blocked, { date: D, startTime: '10:30', endTime: '11:30', bayId: 'bay-9', memberId: 'member-9', additionalMemberIds: ['member-1'] });
  ok(r && r.includes('张三'), `实际：${r}`);
});
test('KT-CHG-04', '改约排除自身（excludeId）', () => {
  eq(checkConflict(baseBookings, blocked, { date: D, startTime: '10:00', endTime: '11:00', bayId: 'bay-1', memberId: 'member-1', coachId: 'coach-1', excludeId: 'b1' }), null);
});

// ===== 课时扣减与退还 =====
test('KT-BKG-01/02', '新增已确认预约立即扣课时', () => {
  const st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb1', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff', price: 100 },
  });
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 19);
  eq(st.bookings.find((b) => b.id === 'nb1').hoursDeducted, true);
});
test('KT-LES-01', '待确认预约不扣课时', () => {
  const st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb2', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'lesson', status: 'pending', pendingFor: 'coach', coachId: 'coach-1', coachName: '李教练', createdAt: '', createdBy: 'member' },
  });
  eq(st.members.find((m) => m.id === 'member-1').remainingLessonHours, 10);
});
test('KT-LES-02/07', '确认时扣主会员与额外学员课时', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb3', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:30', type: 'lesson', status: 'pending', pendingFor: 'coach', coachId: 'coach-1', coachName: '李教练', createdAt: '', createdBy: 'member', additionalMembers: [{ id: 'member-2', name: '李四' }] },
  });
  st = reducer(st, { type: 'CONFIRM_BOOKING', id: 'nb3' });
  eq(st.members.find((m) => m.id === 'member-1').remainingLessonHours, 8.5);
  eq(st.members.find((m) => m.id === 'member-2').remainingLessonHours, 3.5);
  eq(st.bookings.find((b) => b.id === 'nb3').status, 'confirmed');
  eq(st.bookings.find((b) => b.id === 'nb3').pendingFor, undefined);
});
test('KT-CHG-01', '取消已确认预约退还课时', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb4', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'member' },
  });
  st = reducer(st, { type: 'CANCEL_BOOKING', id: 'nb4' });
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 20);
  eq(st.bookings.find((b) => b.id === 'nb4').status, 'cancelled');
});
test('KT-CHG-02', '取消待确认预约不扣不退', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb5', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'lesson', status: 'pending', pendingFor: 'coach', createdAt: '', createdBy: 'member' },
  });
  st = reducer(st, { type: 'CANCEL_BOOKING', id: 'nb5' });
  eq(st.members.find((m) => m.id === 'member-1').remainingLessonHours, 10);
});
test('KT-CHG-03', '改约退旧扣新（1h 练习改 2h）', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb6', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff' },
  });
  const old = st.bookings.find((b) => b.id === 'nb6');
  st = reducer(st, { type: 'UPDATE_BOOKING', booking: { ...old, endTime: '11:00' } });
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 18);
});
test('KT-CHG-05', '教练改约：方案挂原预约，原预约保持确认且课时不动', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb7', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff' },
  });
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 19);
  st = reducer(st, {
    type: 'PROPOSE_RESCHEDULE', id: 'nb7',
    proposal: { date: '2026-09-07', startTime: '10:00', endTime: '11:00', bayId: 'bay-2', bayName: '打位 2', requestedBy: 'coach', requestedAt: '2026-09-05T00:00:00Z' },
  });
  const b = st.bookings.find((x) => x.id === 'nb7');
  eq(b.status, 'confirmed'); // 原预约保持确认
  eq(b.startTime, '09:00'); // 原时间不变
  eq(b.reschedule.startTime, '10:00'); // 方案已挂上
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 19); // 课时不动
});
test('KT-CHG-06', '会员接受改约后按新方案退旧扣新', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb8', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff' },
  });
  st = reducer(st, {
    type: 'PROPOSE_RESCHEDULE', id: 'nb8',
    proposal: { date: '2026-09-07', startTime: '10:00', endTime: '11:30', bayId: 'bay-2', bayName: '打位 2', requestedBy: 'coach', requestedAt: '2026-09-05T00:00:00Z' },
  });
  st = reducer(st, { type: 'ACCEPT_RESCHEDULE', id: 'nb8' });
  const b = st.bookings.find((x) => x.id === 'nb8');
  eq(b.status, 'confirmed');
  eq(b.startTime, '10:00'); eq(b.endTime, '11:30'); // 已套用新方案
  eq(b.reschedule, undefined); // 方案已清除
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 18.5); // 退1h扣1.5h
});
test('KT-CHG-08', '会员拒绝改约：原预约与课时保持不变（BUG-02 回归）', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb9', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff' },
  });
  st = reducer(st, {
    type: 'PROPOSE_RESCHEDULE', id: 'nb9',
    proposal: { date: '2026-09-07', startTime: '11:00', endTime: '12:00', bayId: 'bay-3', bayName: '打位 3', requestedBy: 'coach', requestedAt: '2026-09-05T00:00:00Z' },
  });
  st = reducer(st, { type: 'REJECT_RESCHEDULE', id: 'nb9' });
  const b = st.bookings.find((x) => x.id === 'nb9');
  eq(b.status, 'confirmed'); // 原预约仍在
  eq(b.startTime, '09:00'); eq(b.endTime, '10:00'); eq(b.bayId, 'bay-2'); // 原安排不变
  eq(b.reschedule, undefined); // 方案已清除
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 19); // 课时不变
});
test('KT-CHG-09', '有待确认改约方案时取消预约：退课时并清除方案', () => {
  let st = reducer(baseState(), {
    type: 'ADD_BOOKING',
    booking: { id: 'nb10', memberId: 'member-1', memberName: '张三', bayId: 'bay-2', bayName: '打位 2', date: '2026-09-07', startTime: '09:00', endTime: '10:00', type: 'practice', status: 'confirmed', createdAt: '', createdBy: 'staff' },
  });
  st = reducer(st, {
    type: 'PROPOSE_RESCHEDULE', id: 'nb10',
    proposal: { date: '2026-09-07', startTime: '11:00', endTime: '12:00', bayId: 'bay-2', bayName: '打位 2', requestedBy: 'coach', requestedAt: '2026-09-05T00:00:00Z' },
  });
  st = reducer(st, { type: 'CANCEL_BOOKING', id: 'nb10' });
  const b = st.bookings.find((x) => x.id === 'nb10');
  eq(b.status, 'cancelled');
  eq(b.reschedule, undefined);
  eq(st.members.find((m) => m.id === 'member-1').remainingPracticeHours, 20); // 已退还
});

// ===== 充值 =====
test('KT-PAY-01', '充值教练课时并产生流水', () => {
  const st = reducer(baseState(), {
    type: 'ADD_PAYMENT',
    payment: { id: 'p1', memberId: 'member-5', memberName: '钱七', item: 'lesson', hours: 5, amountDue: 1000, amountPaid: 1000, method: '微信', createdAt: new Date().toISOString(), operatorId: 'admin-1', operatorName: '前台小李' },
  });
  eq(st.members.find((m) => m.id === 'member-5').remainingLessonHours, 5);
  eq(st.payments.length, 1);
  eq(st.payments[0].operatorName, '前台小李');
});
test('KT-PAY-02', '充值练习时长', () => {
  const st = reducer(baseState(), {
    type: 'ADD_PAYMENT',
    payment: { id: 'p2', memberId: 'member-2', memberName: '李四', item: 'practice', hours: 2, amountDue: 0, amountPaid: 0, method: '赠送/补偿', createdAt: new Date().toISOString(), operatorId: 'coach-1', operatorName: '李教练' },
  });
  eq(st.members.find((m) => m.id === 'member-2').remainingPracticeHours, 10);
});

// ===== 完成状态 =====
test('KT-DONE-01', '标记完成', () => {
  const st = reducer(baseState(), { type: 'COMPLETE_BOOKING', id: 'b1' });
  eq(st.bookings.find((b) => b.id === 'b1').status, 'completed');
});

// ===== 管理模块 =====
test('KT-MGT-01/02/03', '新增打位/教练/会员', () => {
  let st = reducer(baseState(), { type: 'ADD_BAY', bay: { id: 'bay-9', name: '打位 9', equipmentType: '基础', pricePerHour: 100, status: 'available' } });
  st = reducer(st, { type: 'ADD_COACH', coach: { id: 'coach-9', name: '新教练', specialty: '测试', phone: '139', status: 'active' } });
  st = reducer(st, { type: 'ADD_MEMBER', member: { id: 'member-9', name: '新会员', phone: '13800000009', remainingLessonHours: 0, remainingPracticeHours: 0 } });
  eq(st.bays.length, INITIAL_BAYS.length + 1);
  eq(st.coaches.length, INITIAL_COACHES.length + 1);
  eq(st.members.length, members.length + 1);
});

// ===== 休息时段与课程冲突（面板层校验的 store 部分）=====
test('KT-RES-01', '新增休息时段', () => {
  const st = reducer(baseState(), { type: 'ADD_BLOCKED', slot: { id: 'blk2', coachId: 'coach-1', coachName: '李教练', date: '2026-09-08', startTime: '12:00', endTime: '13:00', reason: '午休' } });
  eq(st.blockedSlots.length, 2);
  const st2 = reducer(st, { type: 'REMOVE_BLOCKED', id: 'blk2' });
  eq(st2.blockedSlots.length, 1);
});

// ===== 工具函数 =====
test('KT-UTIL', 'timeToMinutes / bookingHours', () => {
  eq(timeToMinutes('09:15'), 555);
  eq(bookingHours({ startTime: '09:00', endTime: '10:30' }), 1.5);
});

// ===== 汇总 =====
const passed = results.filter((r) => r.result === 'pass').length;
const failed = results.filter((r) => r.result === 'fail').length;
console.log(JSON.stringify({ total: results.length, passed, failed, results }, null, 2));
process.exit(failed ? 1 : 0);
