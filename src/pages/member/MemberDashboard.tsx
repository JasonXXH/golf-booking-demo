import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, LayoutGrid, List, LogOut, TreePine, Wallet } from 'lucide-react';
import type { Booking } from '@/types';
import { useAppStore, checkConflict, generateSlots, getDayHours } from '@/hooks/useAppStore';
import BayGrid from '@/components/BayGrid';
import BookingList from '@/components/BookingList';
import BookingModal from '@/components/BookingModal';

export default function MemberDashboard() {
  const { state, actions } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('bays');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<{ date?: string; bayId?: string; time?: string }>({});

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const memberId = state.currentUser?.id;
  const member = state.members.find((m) => m.id === memberId);
  const dayHours = getDayHours(dateStr, state.businessHours);
  const slots = generateSlots(dayHours.start, dayHours.end);

  const myBookings = state.bookings.filter((b) => b.memberId === memberId && b.status !== 'cancelled');
  const awaitingMe = myBookings.filter((b) => (b.status === 'pending' && b.pendingFor === 'member') || b.reschedule);
  const myPayments = state.payments
    .filter((p) => p.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSlotClick = (bayId: string, time: string) => {
    setModalInitial({ date: dateStr, bayId, time });
    setModalOpen(true);
  };

  const handleSaveBooking = (data: Omit<Booking, 'id' | 'createdAt'>) => {
    actions.addBooking({ ...data, id: `booking-${Date.now()}`, createdAt: new Date().toISOString() });
    toast.success(data.status === 'confirmed' ? '预约成功' : '已提交，等待确认');
    setModalOpen(false);
  };

  // 会员确认教练/前台为自己创建或修改的预约；确认时重新检查冲突与额度
  const handleConfirm = (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    if (!b || !member) return;
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
    const hrs = (new Date(`2000-01-01T${b.endTime}`).getTime() - new Date(`2000-01-01T${b.startTime}`).getTime()) / 3600000;
    const field = b.type === 'lesson' ? 'remainingLessonHours' : 'remainingPracticeHours';
    if (member[field] < hrs) {
      toast.error(`剩余额度不足（剩 ${member[field]}h，需 ${hrs}h），请先充值`);
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

  // 会员接受改约：接受前按新方案重新检查冲突与额度（旧课时会先退回，按净增校验）
  const handleAcceptReschedule = (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    if (!b || !b.reschedule || !member) return;
    const p = b.reschedule;
    const conflict = checkConflict(state.bookings, state.blockedSlots, {
      date: p.date, startTime: p.startTime, endTime: p.endTime,
      bayId: p.bayId, coachId: p.coachId, memberId: b.memberId,
      additionalMemberIds: p.additionalMembers?.map((m) => m.id),
      excludeId: b.id,
    });
    if (conflict) {
      toast.error(`无法接受改约：${conflict}`);
      return;
    }
    const newHrs = (new Date(`2000-01-01T${p.endTime}`).getTime() - new Date(`2000-01-01T${p.startTime}`).getTime()) / 3600000;
    const oldHrs = (new Date(`2000-01-01T${b.endTime}`).getTime() - new Date(`2000-01-01T${b.startTime}`).getTime()) / 3600000;
    const field = b.type === 'lesson' ? 'remainingLessonHours' : 'remainingPracticeHours';
    if (member[field] + (b.hoursDeducted ? oldHrs : 0) < newHrs) {
      toast.error(`剩余额度不足以覆盖新方案（需 ${newHrs}h），请先充值`);
      return;
    }
    actions.acceptReschedule(id);
    toast.success('已接受改约，按新时间执行');
  };

  // 会员拒绝改约：仅清除方案，原预约与课时保持不变
  const handleRejectReschedule = (id: string) => {
    actions.rejectReschedule(id);
    toast.success('已拒绝改约，原预约保持不变');
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
              <p className="text-[10px] text-muted-foreground">{member?.name} — 会员端</p>
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
            <Button size="sm" variant="ghost" onClick={() => actions.setUser(null)}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Member info card */}
        {member && (
          <div className="bg-white border rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold">{member.name}</div>
              <div className="text-sm text-muted-foreground">{member.phone}</div>
              {member.primaryCoachName && (
                <div className="text-xs text-muted-foreground mt-0.5">主教练：{member.primaryCoachName}</div>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{member.remainingLessonHours}h</div>
                <div className="text-xs text-muted-foreground">剩余课时</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{member.remainingPracticeHours}h</div>
                <div className="text-xs text-muted-foreground">剩余练习</div>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="bays" className="gap-1"><LayoutGrid className="w-4 h-4" />预约打位</TabsTrigger>
              <TabsTrigger value="mybookings" className="gap-1">
                <List className="w-4 h-4" />我的预约
                {awaitingMe.length > 0 && <span className="ml-1 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{awaitingMe.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1"><Wallet className="w-4 h-4" />付费记录</TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground">
              {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })} · 营业 {dayHours.start}-{dayHours.end}
            </div>
          </div>

          <TabsContent value="bays" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center gap-4 mb-3 text-sm flex-wrap">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />自主练习</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />教练课程</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />待确认（仍可预约）</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-white border border-dashed border-muted-foreground" />空闲（点击预订）</span>
              </div>
              <BayGrid date={dateStr} bays={state.bays} bookings={state.bookings} slots={slots} onSlotClick={handleSlotClick} />
            </div>
          </TabsContent>

          <TabsContent value="mybookings" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <BookingList bookings={myBookings} onCancel={handleCancel} onConfirm={handleConfirm} onAcceptReschedule={handleAcceptReschedule} onRejectReschedule={handleRejectReschedule} isMember />
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              {myPayments.length === 0 && <div className="text-center text-muted-foreground py-8">暂无付费记录</div>}
              <div className="space-y-2">
                {myPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={p.item === 'lesson' ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}>
                        {p.item === 'lesson' ? '教练课时' : '练习时长'} +{p.hours}h
                      </span>
                      <span className="text-muted-foreground">{format(new Date(p.createdAt), 'yyyy年MM月dd日')}</span>
                      <span className="text-muted-foreground">{p.method}</span>
                      {p.note && <span className="text-xs bg-muted px-2 py-0.5 rounded">{p.note}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      实收 ¥{p.amountPaid}{p.amountDue !== p.amountPaid ? ` / 应收 ¥${p.amountDue}` : ''} · 经办：{p.operatorName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveBooking}
        existingBookings={state.bookings}
        bays={state.bays}
        coaches={state.coaches}
        members={member ? [member] : []}
        blockedSlots={state.blockedSlots}
        businessHours={state.businessHours}
        settings={state.settings}
        initialDate={modalInitial.date}
        initialBayId={modalInitial.bayId}
        initialTime={modalInitial.time}
        role="member"
      />
    </div>
  );
}
