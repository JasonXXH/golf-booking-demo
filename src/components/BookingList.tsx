import type { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, GraduationCap, MapPin, Clock, Trash2, Calendar, Check, X, Pencil, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { todayStr, timeToMinutes } from '@/hooks/useAppStore';

interface BookingListProps {
  bookings: Booking[];
  onCancel: (id: string) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (booking: Booking) => void;
  onComplete?: (id: string) => void;
  onAcceptReschedule?: (id: string) => void;
  onRejectReschedule?: (id: string) => void;
  isAdmin?: boolean;
  isCoach?: boolean;
  isMember?: boolean;
}

export default function BookingList({
  bookings, onCancel, onConfirm, onReject, onEdit, onComplete,
  onAcceptReschedule, onRejectReschedule,
  isAdmin, isCoach, isMember,
}: BookingListProps) {
  const sorted = [...bookings]
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.startTime.localeCompare(b.startTime);
    });

  const today = todayStr();

  return (
    <div className="space-y-3">
      {sorted.length === 0 && <div className="text-center text-muted-foreground py-8">暂无预订记录</div>}
      {sorted.map((booking) => {
        const isLesson = booking.type === 'lesson';
        const isPending = booking.status === 'pending';
        const isConfirmed = booking.status === 'confirmed';
        const isCompleted = booking.status === 'completed';
        const waitingMember = isPending && booking.pendingFor === 'member';
        const waitingStaff = isPending && booking.pendingFor !== 'member';
        // 已开始或已过去的确认预约可以标记完成
        const canComplete =
          isConfirmed &&
          (booking.date < today ||
            (booking.date === today &&
              timeToMinutes(booking.startTime) <= new Date().getHours() * 60 + new Date().getMinutes()));

        return (
          <div key={booking.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', isLesson ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600')}>
              {isLesson ? <GraduationCap className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-semibold text-sm">{booking.memberName}</span>
                <Badge variant={isLesson ? 'default' : 'secondary'} className="text-[10px] h-5 px-1">{isLesson ? '教练课程' : '自主练习'}</Badge>
                {waitingStaff && <Badge variant="outline" className="text-[10px] h-5 px-1 text-amber-600 border-amber-300">待确认</Badge>}
                {waitingMember && <Badge variant="outline" className="text-[10px] h-5 px-1 text-violet-600 border-violet-300">待会员确认</Badge>}
                {booking.reschedule && <Badge variant="outline" className="text-[10px] h-5 px-1 text-orange-600 border-orange-300">改约待会员确认</Badge>}
                {isCompleted && <Badge variant="outline" className="text-[10px] h-5 px-1 text-muted-foreground">已完成</Badge>}
                {booking.price != null && <span className="text-[10px] text-muted-foreground">¥{booking.price}</span>}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(booking.date), 'MM月dd日', { locale: zhCN })}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.startTime}-{booking.endTime}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.bayName}</span>
                {isLesson && booking.coachName && <span className="flex items-center gap-1 text-blue-600"><GraduationCap className="w-3 h-3" />{booking.coachName}</span>}
              </div>
              {booking.additionalMembers && booking.additionalMembers.length > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5">+ {booking.additionalMembers.map((m) => m.name).join(', ')}</div>
              )}
              {booking.notes && <div className="text-xs text-muted-foreground mt-0.5">备注：{booking.notes}</div>}
              {booking.reschedule && (
                <div className="text-xs mt-1 px-2 py-1 rounded bg-orange-50 text-orange-700">
                  改约方案：{format(parseISO(booking.reschedule.date), 'MM月dd日', { locale: zhCN })} {booking.reschedule.startTime}-{booking.reschedule.endTime} · {booking.reschedule.bayName}
                  {booking.reschedule.coachName ? ` · ${booking.reschedule.coachName}` : ''}
                  （{booking.reschedule.requestedBy === 'coach' ? '教练' : '前台'}发起，确认前按原时间执行）
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {/* 待前台/教练确认 */}
              {waitingStaff && (isAdmin || isCoach) && onConfirm && (
                <Button size="icon" variant="ghost" title="确认" className="text-emerald-600" onClick={() => onConfirm(booking.id)}><Check className="w-4 h-4" /></Button>
              )}
              {waitingStaff && (isAdmin || isCoach) && onReject && (
                <Button size="icon" variant="ghost" title="拒绝" className="text-destructive" onClick={() => onReject(booking.id)}><X className="w-4 h-4" /></Button>
              )}
              {/* 待会员本人确认 */}
              {waitingMember && isMember && onConfirm && (
                <Button size="icon" variant="ghost" title="接受" className="text-emerald-600" onClick={() => onConfirm(booking.id)}><Check className="w-4 h-4" /></Button>
              )}
              {/* 改约方案：会员接受 / 拒绝 */}
              {booking.reschedule && isMember && onAcceptReschedule && (
                <Button size="icon" variant="ghost" title="接受改约" className="text-emerald-600" onClick={() => onAcceptReschedule(booking.id)}><Check className="w-4 h-4" /></Button>
              )}
              {booking.reschedule && isMember && onRejectReschedule && (
                <Button size="icon" variant="ghost" title="拒绝改约（保留原预约）" className="text-destructive" onClick={() => onRejectReschedule(booking.id)}><X className="w-4 h-4" /></Button>
              )}
              {(isAdmin || isCoach) && !isCompleted && !isPending && onEdit && (
                <Button size="icon" variant="ghost" title="改约" onClick={() => onEdit(booking)}><Pencil className="w-4 h-4" /></Button>
              )}
              {(isAdmin || isCoach) && canComplete && onComplete && (
                <Button size="icon" variant="ghost" title="标记完成" className="text-blue-600" onClick={() => onComplete(booking.id)}><CheckCircle2 className="w-4 h-4" /></Button>
              )}
              {!isCompleted && (
                <Button size="icon" variant="ghost" title={waitingMember && isMember ? '拒绝' : '取消'} className="text-muted-foreground hover:text-destructive" onClick={() => onCancel(booking.id)}><Trash2 className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
