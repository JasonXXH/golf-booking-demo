import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Trash2, Coffee } from 'lucide-react';
import type { BlockedSlot, Booking, Coach } from '@/types';
import { timeToMinutes, todayStr } from '@/hooks/useAppStore';

interface BlockedSlotsPanelProps {
  coaches: Coach[];
  blockedSlots: BlockedSlot[];
  bookings: Booking[];
  fixedCoachId?: string; // 教练端固定为自己；管理端可选任意教练
  onAdd: (slot: BlockedSlot) => void;
  onRemove: (id: string) => void;
}

export default function BlockedSlotsPanel({
  coaches, blockedSlots, bookings, fixedCoachId, onAdd, onRemove,
}: BlockedSlotsPanelProps) {
  const [coachId, setCoachId] = useState(fixedCoachId || '');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const effectiveCoachId = fixedCoachId || coachId;
  const list = blockedSlots
    .filter((s) => (!effectiveCoachId || s.coachId === effectiveCoachId) && s.date >= todayStr())
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // 以 15 分钟粒度生成全天时间选项
  const timeOptions: string[] = [];
  for (let t = 0; t < 24 * 60; t += 15) {
    timeOptions.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }

  function submit() {
    if (!effectiveCoachId) {
      setError('请选择教练');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    // 规则：与已确认课程冲突时报错，需先处理已有课程
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    const hit = bookings.find((b) => {
      if (b.coachId !== effectiveCoachId || b.date !== dateStr) return false;
      if (b.status !== 'confirmed') return false;
      const bs = timeToMinutes(b.startTime);
      const be = timeToMinutes(b.endTime);
      return s < be && e > bs;
    });
    if (hit) {
      setError(`该时段与已确认课程冲突（${hit.memberName} ${hit.startTime}-${hit.endTime}），请先处理已有课程`);
      return;
    }
    const coach = coaches.find((c) => c.id === effectiveCoachId);
    onAdd({
      id: `blocked-${Date.now()}`,
      coachId: effectiveCoachId,
      coachName: coach?.name || '',
      date: dateStr,
      startTime,
      endTime,
      reason: reason || undefined,
    });
    setReason('');
    setError('');
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-medium text-sm flex items-center gap-1"><Coffee className="w-4 h-4" />设置不可预约时段（休息 / 准备）</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {!fixedCoachId && (
            <div className="space-y-1"><Label>教练</Label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger><SelectValue placeholder="选择教练" /></SelectTrigger>
                <SelectContent>
                  {coaches.filter((c) => c.status === 'active').map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'yyyy年MM月dd日', { locale: zhCN }) : '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1"><Label>开始</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>结束</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{timeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>原因</Label>
            <Input placeholder="如：午休、外出" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
        <Button onClick={submit} size="sm">添加</Button>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="font-medium text-sm mb-2">未来的不可预约时段</div>
        {list.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">暂无设置</div>}
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{s.coachName}</span>
                <span>{format(new Date(s.date), 'MM月dd日')}</span>
                <span className="text-muted-foreground">{s.startTime} - {s.endTime}</span>
                {s.reason && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.reason}</span>}
              </div>
              <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(s.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
