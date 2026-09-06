import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarIcon, Plus, LayoutGrid, GraduationCap, List,
  TreePine, Settings, LogOut, Users, MapPin,
} from 'lucide-react';
import type { Booking, Member } from '@/types';
import { DEFAULT_DAY_HOURS } from '@/types';
import { useAppStore, checkConflict, generateSlots, getDayHours } from '@/hooks/useAppStore';
import StatsPanel from '@/components/StatsPanel';
import BayGrid from '@/components/BayGrid';
import CoachSchedule from '@/components/CoachSchedule';
import BookingList from '@/components/BookingList';
import BookingModal from '@/components/BookingModal';
import BayManager from '@/components/admin/BayManager';
import CoachManager from '@/components/admin/CoachManager';
import MemberManager from '@/components/admin/MemberManager';
import RechargeDialog from '@/components/RechargeDialog';
import BlockedSlotsPanel from '@/components/BlockedSlotsPanel';

export default function AdminDashboard() {
  const { state, actions } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('bays');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<{ date?: string; bayId?: string; time?: string }>({});
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [rechargeMember, setRechargeMember] = useState<Member | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayHours = getDayHours(dateStr, state.businessHours);
  const slots = generateSlots(dayHours.start, dayHours.end);
  const operator = { id: state.currentUser?.id || 'admin-1', name: state.currentUser?.name || '前台' };

  const handleSlotClick = (bayId: string, time: string) => {
    setEditingBooking(null);
    setModalInitial({ date: dateStr, bayId, time });
    setModalOpen(true);
  };

  const handleAddBooking = () => {
    setEditingBooking(null);
    setModalInitial({ date: dateStr });
    setModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setModalInitial({});
    setModalOpen(true);
  };

  const handleSaveBooking = (data: Omit<Booking, 'id' | 'createdAt'>, editingId?: string) => {
    if (editingId) {
      const old = state.bookings.find((b) => b.id === editingId);
      if (!old) return;
      actions.updateBooking({ ...old, ...data });
      toast.success('预订已修改');
    } else {
      actions.addBooking({ ...data, id: `booking-${Date.now()}`, createdAt: new Date().toISOString() });
      toast.success('预订成功');
    }
    setModalOpen(false);
    setEditingBooking(null);
  };

  // 前台也可以确认教练课；确认时重新检查冲突（pending 不占位）
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
              <p className="text-[10px] text-muted-foreground">管理员后台</p>
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
            <Button size="sm" onClick={handleAddBooking}><Plus className="w-4 h-4 mr-1" />新增预订</Button>
            <Button size="sm" variant="ghost" onClick={() => actions.setUser(null)}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <StatsPanel date={dateStr} bookings={state.bookings} bays={state.bays} payments={state.payments} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="bays" className="gap-1"><LayoutGrid className="w-4 h-4" />打位视图</TabsTrigger>
              <TabsTrigger value="coaches" className="gap-1"><GraduationCap className="w-4 h-4" />教练排班</TabsTrigger>
              <TabsTrigger value="list" className="gap-1"><List className="w-4 h-4" />预订列表</TabsTrigger>
              <TabsTrigger value="bays-manage" className="gap-1"><MapPin className="w-4 h-4" />打位管理</TabsTrigger>
              <TabsTrigger value="coaches-manage" className="gap-1"><Users className="w-4 h-4" />教练管理</TabsTrigger>
              <TabsTrigger value="members-manage" className="gap-1"><Users className="w-4 h-4" />会员管理</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1"><Settings className="w-4 h-4" />设置</TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground">
              {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })} · 营业 {dayHours.start}-{dayHours.end}
            </div>
          </div>

          <TabsContent value="bays" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <Legend />
              <BayGrid date={dateStr} bays={state.bays} bookings={state.bookings} slots={slots} onSlotClick={handleSlotClick} />
            </div>
          </TabsContent>

          <TabsContent value="coaches" className="mt-2 space-y-4">
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center gap-4 mb-3 text-sm flex-wrap">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />有课程安排</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />待确认</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-200 border" />不可预约</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/5 border" />空闲</span>
              </div>
              <CoachSchedule date={dateStr} coaches={state.coaches.filter((c) => c.status === 'active')} bookings={state.bookings} blockedSlots={state.blockedSlots} slots={slots} />
            </div>
            <BlockedSlotsPanel
              coaches={state.coaches}
              blockedSlots={state.blockedSlots}
              bookings={state.bookings}
              onAdd={actions.addBlocked}
              onRemove={actions.removeBlocked}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-2">
            <div className="bg-white rounded-lg border p-3">
              <BookingList
                bookings={state.bookings}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onReject={handleCancel}
                onEdit={handleEditBooking}
                onComplete={(id) => { actions.completeBooking(id); toast.success('已标记完成'); }}
                isAdmin
              />
            </div>
          </TabsContent>

          <TabsContent value="bays-manage" className="mt-2">
            <BayManager bays={state.bays} onAdd={actions.addBay} onUpdate={actions.updateBay} onRemove={actions.removeBay} />
          </TabsContent>

          <TabsContent value="coaches-manage" className="mt-2">
            <CoachManager coaches={state.coaches} onAdd={actions.addCoach} onUpdate={actions.updateCoach} onRemove={actions.removeCoach} />
          </TabsContent>

          <TabsContent value="members-manage" className="mt-2">
            <MemberManager
              members={state.members}
              coaches={state.coaches}
              onAdd={actions.addMember}
              onUpdate={actions.updateMember}
              onRemove={actions.removeMember}
              onRecharge={(m) => setRechargeMember(m)}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-2">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      <BookingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBooking(null); }}
        onSave={handleSaveBooking}
        existingBookings={state.bookings}
        bays={state.bays}
        coaches={state.coaches}
        members={state.members}
        blockedSlots={state.blockedSlots}
        businessHours={state.businessHours}
        settings={state.settings}
        initialDate={modalInitial.date}
        initialBayId={modalInitial.bayId}
        initialTime={modalInitial.time}
        role="admin"
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

function SettingsPanel() {
  const { state, actions } = useAppStore();
  const [hoursDate, setHoursDate] = useState<Date | undefined>(new Date());
  const [start, setStart] = useState(DEFAULT_DAY_HOURS.start);
  const [end, setEnd] = useState(DEFAULT_DAY_HOURS.end);
  const [msg, setMsg] = useState('');

  const timeOptions = generateSlots('00:00', '24:00');

  const saveDayHours = () => {
    if (!hoursDate) return;
    if (start >= end) {
      setMsg('开始时间必须早于结束时间');
      return;
    }
    actions.setDayHours(format(hoursDate, 'yyyy-MM-dd'), { start, end });
    setMsg('已保存该日期的营业时间');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-medium text-sm">预约规则</div>
        <div className="space-y-1">
          <Label>最多提前预约天数</Label>
          <Input
            type="number" min="1" max="90"
            value={state.settings.advanceBookingDays}
            onChange={(e) => actions.updateSettings({ ...state.settings, advanceBookingDays: Math.max(1, Number(e.target.value) || 30) })}
          />
        </div>
        <div className="space-y-1">
          <Label>方案保留时长（分钟，候补/待会员确认用）</Label>
          <Input
            type="number" min="5" max="120"
            value={state.settings.holdMinutes}
            onChange={(e) => actions.updateSettings({ ...state.settings, holdMinutes: Math.max(5, Number(e.target.value) || 30) })}
          />
        </div>
        <p className="text-xs text-muted-foreground">默认营业时间 {DEFAULT_DAY_HOURS.start} - {DEFAULT_DAY_HOURS.end}，可在右侧按日期覆盖。时间粒度 15 分钟，最短预约 1 小时。</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-medium text-sm">按日期设置营业时间</div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1"><Label>日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {hoursDate ? format(hoursDate, 'yyyy年MM月dd日', { locale: zhCN }) : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={hoursDate} onSelect={setHoursDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1"><Label>开始</Label>
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>结束</Label>
            <Select value={end} onValueChange={setEnd}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={saveDayHours}>保存</Button>
        </div>
        {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
        <div className="space-y-1">
          {Object.keys(state.businessHours).length === 0 && (
            <div className="text-sm text-muted-foreground py-2">暂无特殊日期，全部使用默认营业时间</div>
          )}
          {Object.entries(state.businessHours).sort(([a], [b]) => a.localeCompare(b)).map(([d, h]) => (
            <div key={d} className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5">
              <span>{d}</span>
              <span className="text-muted-foreground">{h.start} - {h.end}</span>
              <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => actions.setDayHours(d, null)}>恢复默认</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 mb-3 text-sm flex-wrap">
      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />自主练习</span>
      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />教练课程</span>
      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />待确认（不占位）</span>
      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-white border border-dashed border-muted-foreground" />空闲</span>
    </div>
  );
}
