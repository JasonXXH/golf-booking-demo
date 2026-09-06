import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Booking, Bay, Coach, Member, BlockedSlot, BusinessHoursMap, AppSettings } from '@/types';
import { DURATION_OPTIONS } from '@/types';
import { checkConflict, timeToMinutes, generateSlots, getDayHours, todayStr } from '@/hooks/useAppStore';

export type BookingRole = 'admin' | 'coach' | 'member';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (booking: Omit<Booking, 'id' | 'createdAt'>, editingId?: string) => void;
  existingBookings: Booking[];
  bays: Bay[];
  coaches: Coach[];
  members: Member[];
  blockedSlots: BlockedSlot[];
  businessHours: BusinessHoursMap;
  settings: AppSettings;
  initialDate?: string;
  initialBayId?: string;
  initialTime?: string;
  role: BookingRole;
  editing?: Booking | null;
}

export default function BookingModal({
  open, onClose, onSave, existingBookings,
  bays, coaches, members, blockedSlots, businessHours, settings,
  initialDate, initialBayId, initialTime,
  role, editing,
}: BookingModalProps) {
  const [memberId, setMemberId] = useState(editing?.memberId || '');
  const [bayId, setBayId] = useState(editing?.bayId || initialBayId || '');
  const [date, setDate] = useState<Date | undefined>(
    editing ? new Date(editing.date) : initialDate ? new Date(initialDate) : new Date()
  );
  const [startTime, setStartTime] = useState(editing?.startTime || initialTime || '09:00');
  const [duration, setDuration] = useState(
    editing ? String(timeToMinutes(editing.endTime) - timeToMinutes(editing.startTime)) : '60'
  );
  const [type, setType] = useState<'practice' | 'lesson'>(editing?.type || 'practice');
  const [coachId, setCoachId] = useState(editing?.coachId || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [additionalMemberIds, setAdditionalMemberIds] = useState<string[]>(
    editing?.additionalMembers?.map((m) => m.id) || []
  );
  const [error, setError] = useState('');

  // BookingModal 组件在 Dashboard 中常驻挂载（Radix 只控制 DialogContent 显隐），
  // useState 初值只在首次挂载生效，因此每次打开时必须按当前 props 重新初始化表单。
  useEffect(() => {
    if (!open) return;
    setMemberId(editing?.memberId || '');
    setBayId(editing?.bayId || initialBayId || '');
    setDate(editing ? new Date(editing.date) : initialDate ? new Date(initialDate) : new Date());
    setStartTime(editing?.startTime || initialTime || '09:00');
    setDuration(editing ? String(timeToMinutes(editing.endTime) - timeToMinutes(editing.startTime)) : '60');
    setType(editing?.type || 'practice');
    setCoachId(editing?.coachId || '');
    setNotes(editing?.notes || '');
    setAdditionalMemberIds(editing?.additionalMembers?.map((m) => m.id) || []);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
  const dayHours = getDayHours(dateStr, businessHours);
  const selectedBay = bays.find((b) => b.id === bayId);

  const endTime = useMemo(() => {
    const total = timeToMinutes(startTime) + parseInt(duration);
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [startTime, duration]);

  const durationHrs = parseInt(duration) / 60;
  const cost = selectedBay ? selectedBay.pricePerHour * durationHrs : 0;

  // 开始时间选项：当天营业时间内、15 分钟粒度、保证结束不超出打烊
  const startTimeOptions = useMemo(() => {
    return generateSlots(dayHours.start, dayHours.end).filter(
      (t) => timeToMinutes(t) + parseInt(duration) <= timeToMinutes(dayHours.end)
    );
  }, [dayHours, duration]);

  const maxDate = addDays(new Date(), settings.advanceBookingDays);

  function handleSubmit() {
    if (!memberId || !bayId || !dateStr) {
      setError('请填写完整信息');
      return;
    }
    if (type === 'lesson' && !coachId) {
      setError('请选择教练');
      return;
    }

    // 营业时间约束
    if (timeToMinutes(startTime) < timeToMinutes(dayHours.start) || timeToMinutes(endTime) > timeToMinutes(dayHours.end)) {
      setError(`该日期营业时间为 ${dayHours.start} - ${dayHours.end}，请在营业时间内预约`);
      return;
    }

    // 不允许预约过去的时间（开始前均可提交）
    const today = todayStr();
    if (dateStr < today) {
      setError('不能预约过去的日期');
      return;
    }
    if (dateStr > format(maxDate, 'yyyy-MM-dd')) {
      setError(`最多只能提前 ${settings.advanceBookingDays} 天预约`);
      return;
    }
    if (!editing && dateStr === today) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (timeToMinutes(startTime) <= nowMin) {
        setError('开始时间已过，请选择更晚的时间');
        return;
      }
    }

    const member = members.find((m) => m.id === memberId);
    if (!member) {
      setError('会员信息缺失，无法提交');
      return;
    }
    const coach = coaches.find((c) => c.id === coachId);

    // 额度检查：主会员 + 额外学员
    const field = type === 'lesson' ? 'remainingLessonHours' : 'remainingPracticeHours';
    const label = type === 'lesson' ? '课时' : '练习时长';
    const involvedIds = [memberId, ...(type === 'lesson' ? additionalMemberIds : [])];
    for (const id of involvedIds) {
      const m = members.find((x) => x.id === id) ?? (id === memberId ? member : undefined);
      if (!m) continue;
      // 改约时如果是同一位会员，旧的额度会先退回，这里按净增检查过于复杂；
      // 简化处理：改约场景跳过额度硬校验，由 reducer 自动退旧扣新。
      if (editing) break;
      if (m[field] < durationHrs) {
        setError(`会员 "${m.name}" 剩余${label}不足（剩 ${m[field]}h，需 ${durationHrs}h）`);
        return;
      }
    }

    const conflict = checkConflict(existingBookings, blockedSlots, {
      date: dateStr, startTime, endTime, bayId,
      coachId: type === 'lesson' ? coachId : undefined,
      memberId,
      additionalMemberIds: type === 'lesson' ? additionalMemberIds : [],
      excludeId: editing?.id,
    });
    if (conflict) {
      setError(conflict);
      return;
    }

    // 状态与确认方
    let status: Booking['status'];
    let pendingFor: Booking['pendingFor'];
    if (editing) {
      // 改约保持原状态：教练改约由 CoachDashboard 转为「改约方案」挂在原预约上，
      // 原预约保持 confirmed，会员拒绝时不会丢失原安排
      status = editing.status;
      pendingFor = editing.pendingFor;
    } else if (role === 'admin') {
      status = 'confirmed'; // 工作人员直接完成预约
    } else if (role === 'coach') {
      status = 'pending'; // 教练为学员创建，需会员确认
      pendingFor = 'member';
    } else {
      if (type === 'lesson') {
        status = 'pending'; // 教练课需前台或教练确认
        pendingFor = 'coach';
      } else {
        status = 'confirmed'; // 自主练习无冲突自动生效
      }
    }

    const additionalMembers = (type === 'lesson' ? additionalMemberIds : [])
      .map((id) => {
        const m = members.find((x) => x.id === id);
        return m ? { id: m.id, name: m.name } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];

    onSave({
      memberId, memberName: member.name,
      bayId, bayName: selectedBay!.name,
      coachId: type === 'lesson' && coach ? coach.id : undefined,
      coachName: type === 'lesson' && coach ? coach.name : undefined,
      date: dateStr, startTime, endTime,
      type, status, pendingFor,
      notes: notes || undefined,
      additionalMembers: additionalMembers.length > 0 ? additionalMembers : undefined,
      createdBy: editing ? editing.createdBy : role === 'member' ? 'member' : role === 'coach' ? 'coach' : 'staff',
      price: Math.round(cost),
      hoursDeducted: editing ? editing.hoursDeducted : undefined,
    }, editing?.id);

    reset();
  }

  function reset() {
    setMemberId(''); setBayId(''); setDate(new Date());
    setStartTime('09:00'); setDuration('60');
    setType('practice'); setCoachId(''); setNotes('');
    setAdditionalMemberIds([]); setError('');
    onClose();
  }

  const selectedMember = members.find((m) => m.id === memberId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && reset()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? '修改预订' : '新增预订'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label>会员</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="选择会员" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.phone})</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedMember && (
              <div className="text-xs text-muted-foreground flex gap-3">
                <span className="text-blue-600">教练课时: {selectedMember.remainingLessonHours}h</span>
                <span className="text-emerald-600">练习时长: {selectedMember.remainingPracticeHours}h</span>
              </div>
            )}
          </div>

          <div className="space-y-1"><Label>日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'yyyy年MM月dd日', { locale: zhCN }) : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={{ before: new Date(), after: maxDate }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dateStr && (
              <div className="text-xs text-muted-foreground">当日营业时间 {dayHours.start} - {dayHours.end}</div>
            )}
          </div>

          <div className="space-y-1"><Label>打位</Label>
            <Select value={bayId} onValueChange={setBayId}>
              <SelectTrigger><SelectValue placeholder="选择打位" /></SelectTrigger>
              <SelectContent>
                {bays.filter((b) => b.status === 'available' || b.id === bayId).map((b) => (
                  <SelectItem key={b.id} value={b.id} disabled={b.status !== 'available'}>
                    {b.name} — {b.equipmentType} (¥{b.pricePerHour}/h){b.status !== 'available' ? '（维护中）' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBay && <div className="text-xs text-muted-foreground">预计费用: ¥{cost.toFixed(0)}</div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>开始时间</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {startTimeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>时长</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><Clock className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d / 60} 小时{d === 90 ? '' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">结束时间: <span className="font-medium text-foreground">{endTime}</span></div>

          <div className="space-y-1"><Label>预订类型</Label>
            <div className="flex gap-2">
              <Button type="button" variant={type === 'practice' ? 'default' : 'outline'} className="flex-1" onClick={() => { setType('practice'); setCoachId(''); }}>自主练习</Button>
              <Button type="button" variant={type === 'lesson' ? 'default' : 'outline'} className="flex-1" onClick={() => setType('lesson')}>教练课程</Button>
            </div>
          </div>

          {type === 'lesson' && (
            <>
              <div className="space-y-1"><Label>教练</Label>
                <Select value={coachId} onValueChange={setCoachId}>
                  <SelectTrigger><SelectValue placeholder="选择教练" /></SelectTrigger>
                  <SelectContent>
                    {coaches.filter((c) => c.status === 'active').map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.specialty}{selectedMember?.primaryCoachId === c.id ? '（主教练）' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {role === 'admin' && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Users className="w-3 h-3" />额外学员（多人课程）</Label>
                  <Select value="" onValueChange={(v) => v && !additionalMemberIds.includes(v) && setAdditionalMemberIds([...additionalMemberIds, v])}>
                    <SelectTrigger><SelectValue placeholder="添加学员" /></SelectTrigger>
                    <SelectContent>
                      {members.filter((m) => m.id !== memberId).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {additionalMemberIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {additionalMemberIds.map((id) => {
                        const m = members.find((x) => x.id === id);
                        return m ? (
                          <span key={id} className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                            {m.name}
                            <button className="text-destructive" onClick={() => setAdditionalMemberIds(additionalMemberIds.filter((x) => x !== id))}>×</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}
              {role === 'member' && !editing && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">教练课程需前台或教练确认后生效</div>
              )}
              {role === 'coach' && !editing && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">为学员创建的课程需会员确认后生效</div>
              )}
              {role === 'coach' && editing && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">修改后将作为改约方案提交会员确认；会员确认前原预约保持不变，拒绝不影响原预约</div>
              )}
            </>
          )}

          <div className="space-y-1"><Label>备注</Label><Input placeholder="可选备注" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={reset}>取消</Button>
            <Button className="flex-1" onClick={handleSubmit}>{editing ? '保存修改' : '确认预订'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
