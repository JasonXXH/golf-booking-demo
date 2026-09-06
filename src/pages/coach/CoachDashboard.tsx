import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, LogOut, GraduationCap, List, Users, TreePine, Coffee, Wallet, PlusCircle } from 'lucide-react';
import type { Booking, Member } from '@/types';
import { useAppStore, checkConflict, generateSlots, getDayHours } from '@/hooks/useAppStore';
import CoachSchedule from '@/components/CoachSchedule';
import BookingList from '@/components/BookingList';
import BookingModal from '@/components/BookingModal';
import RechargeDialog from '@/components/RechargeDialog';
import BlockedSlotsPanel from '@/components/BlockedSlotsPanel';

export default function CoachDashboard() {
  const { state, actions } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('schedule');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [rechargeMember, setRechargeMember] = useState<Member | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const coachId = state.currentUser?.id || '';
  const operator = { id: coachId, name: state.currentUser?.name || '教练' };
  const dayHours = getDayHours(dateStr, state.businessHours);
  const slots = generateSlots(dayHours.start, dayHours.end);

  // 教练相关的课程
  const myBookings = state.bookings.filter((b) => b.coachId === coachId && b.status !== 'cancelled');
  const myDayBookings = myBookings.filter((b) => b.date === dateStr);
  const pendingBookings = myBookings.filter((b) => b.status === 'pending' && b.pendingFor !== 'member');

  // 教练的学员
  const myStudents = state.members.filter((m) => m.primaryCoachId === coachId);

  // 弹窗会员列表：学员 + 当前编辑预约的主会员/额外学员（课程可能是前台代约的非学员会员）
  const modalMembers = useMemo(() => {
    const list = [...myStudents];
    const ensure = (id: string) => {
      if (!list.some((m) => m.id === id)) {
        const m = state.members.find((x) => x.id === id);
        if (m) list.push(m);
      }
    };
    if (editingBooking) {
      ensure(editingBooking.memberId);
      editingBooking.additionalMembers?.forEach((am) => ensure(am.id));
    }
    return list;
  }, [myStudents, editingBooking, state.members]);

  // 确认前重新检查冲突（待确认不占位）
  const handleConfirm = (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return;
    const conflict = checkConflict(state.bookings, state.blockedSlots, {
      date: b.date, startTime: b.startTime, endTime: b.endTime,
      bayId: b.bayId, coachId: b.coachId, memberId: b.memberId,
      additionalMemberIds: b.additionalMembers?.map((m) => m.id),
      excludeId: b.id,
    });
    if (conflict) {
      toast.error(`无法确认：${conflict}`);
      return;
    }
    actions.confirmBooking(id);
    toast.success('已确认，课时已扣减');
  };

  const handleCancel = (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    actions.cancelBooking(id);
    toast.success(b?.hoursDeducted ? '已取消，课时已退还' : '已取消');
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setModalOpen(true);
  };

  const handleSaveBooking = (data: Omit<Booking, 'id' | 'createdAt'>, editingId?: string) => {
    if (editingId) {
      const old = state.bookings.find((b) => b.id === editingId);
      if (!old) return;
      if (old.status === 'confirmed') {
        // 改约方案与原预约分离：原预约保持 confirmed，会员接受后才替换，拒绝不影响原预约
        actions.proposeReschedule(editingId, {
          date: data.date, startTime: data.startTime, endTime: data.endTime,
          bayId: data.bayId, bayName: data.bayName,
          coachId: data.coachId, coachName: data.coachName,
          additionalMembers: data.additionalMembers,
          notes: data.notes,
          price: data.price,
          requestedBy: 'coach',
          requestedAt: new Date().toISOString(),
        });
        toast.success('改约方案已提交，等待会员确认；确认前原预约保持不变');
      } else {
        actions.updateBooking({ ...old, ...data });
        toast.success('已修改，等待会员确认');
      }
    } else {
      actions.addBooking({ ...data, id: `booking-${Date.now()}`, createdAt: new Date().toISOString() });
      toast.success('已为学员创建预约，等待会员确认');
    }
    setModalOpen(false);
    setEditingBooking(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TreePine className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">高尔夫室内练习场</h1>
              <p className="text-[10px] text-muted-foreground">{state.currentUser?.name} — 教练端</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN }) : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={() => { setEditingBooking(null); setModalOpen(true); }}>
              <PlusCircle className="w-4 h-4 mr-1" />代学员预约
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.setUser(null)}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="schedule" className="gap-1"><GraduationCap className="w-4 h-4" />我的课表</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              <List className="w-4 h-4" />待确认
              {pendingBookings.length > 0 && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingBookings.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1"><List className="w-4 h-4" />预约管理</TabsTrigger>
            <TabsTrigger value="students" className="gap-1"><Users className="w-4 h-4" />我的学员</TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1"><Coffee className="w-4 h-4" />休息时间</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <div className="text-sm text-muted-foreground mb-2">
                {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })} — 共 {myDayBookings.length} 节课
              </div>
              <CoachSchedule
                date={dateStr}
                coaches={state.coaches.filter((c) => c.id === coachId)}
                bookings={state.bookings}
                blockedSlots={state.blockedSlots}
                slots={slots}
              />
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <BookingList
                bookings={pendingBookings}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onReject={handleCancel}
                isCoach
              />
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <BookingList
                bookings={myBookings}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onReject={handleCancel}
                onEdit={handleEditBooking}
                onComplete={(id) => { actions.completeBooking(id); toast.success('已标记完成'); }}
                isCoach
              />
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myStudents.map((student) => {
                const paidTotal = state.payments
                  .filter((p) => p.memberId === student.id)
                  .reduce((s, p) => s + p.amountPaid, 0);
                return (
                  <div key={student.id} className="bg-white border rounded-lg p-4">
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.phone}</div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-blue-600">课时: {student.remainingLessonHours}h</span>
                      <span className="text-emerald-600">练习: {student.remainingPracticeHours}h</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      历史课时: {state.bookings.filter((b) => b.memberId === student.id && b.type === 'lesson' && b.status === 'completed').length} 节
                      · 累计付费 ¥{paidTotal}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setRechargeMember(student)}>
                        <Wallet className="w-3 h-3 mr-1" />充值
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingBooking(null); setModalOpen(true); }}>
                        <PlusCircle className="w-3 h-3 mr-1" />代约
                      </Button>
                    </div>
                  </div>
                );
              })}
              {myStudents.length === 0 && <div className="text-center text-muted-foreground py-8 col-span-full">暂无分配学员</div>}
            </div>
          </TabsContent>

          <TabsContent value="blocked" className="mt-2">
            <BlockedSlotsPanel
              coaches={state.coaches}
              blockedSlots={state.blockedSlots}
              bookings={state.bookings}
              fixedCoachId={coachId}
              onAdd={actions.addBlocked}
              onRemove={actions.removeBlocked}
            />
          </TabsContent>
        </Tabs>
      </main>

      <BookingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBooking(null); }}
        onSave={handleSaveBooking}
        existingBookings={state.bookings}
        bays={state.bays}
        coaches={state.coaches.filter((c) => c.id === coachId)}
        members={modalMembers}
        blockedSlots={state.blockedSlots}
        businessHours={state.businessHours}
        settings={state.settings}
        initialDate={dateStr}
        role="coach"
        editing={editingBooking}
      />

      <RechargeDialog
        member={rechargeMember}
        open={!!rechargeMember}
        onClose={() => setRechargeMember(null)}
        operator={operator}
        onSubmit={(p) => { actions.addPayment(p); toast.success(`已为 ${p.memberName} 充值 ${p.hours}h`); }}
      />
    </div>
  );
}
