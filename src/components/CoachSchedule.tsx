import type { Booking, Coach, BlockedSlot } from '@/types';
import { SLOT_MINUTES } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, User, Coffee } from 'lucide-react';
import { timeToMinutes } from '@/hooks/useAppStore';

interface CoachScheduleProps {
  date: string;
  coaches: Coach[];
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  slots: string[];
}

export default function CoachSchedule({ date, coaches, bookings, blockedSlots, slots }: CoachScheduleProps) {
  const dayBookings = bookings.filter((b) => b.date === date && b.status !== 'cancelled' && b.type === 'lesson');
  const dayBlocked = blockedSlots.filter((s) => s.date === date);

  function getCoachBookingAt(coachId: string, time: string): Booking | undefined {
    const t = timeToMinutes(time);
    return dayBookings.find((b) => {
      if (b.coachId !== coachId) return false;
      const s = timeToMinutes(b.startTime);
      const e = timeToMinutes(b.endTime);
      return t >= s && t < e;
    });
  }

  function isSlotStart(coachId: string, time: string): boolean {
    return dayBookings.some((b) => b.coachId === coachId && b.startTime === time);
  }

  function getBlockedAt(coachId: string, time: string): BlockedSlot | undefined {
    const t = timeToMinutes(time);
    return dayBlocked.find((s) => {
      if (s.coachId !== coachId) return false;
      return t >= timeToMinutes(s.startTime) && t < timeToMinutes(s.endTime);
    });
  }

  function isBlockedStart(coachId: string, time: string): boolean {
    return dayBlocked.some((s) => s.coachId === coachId && s.startTime === time);
  }

  const cols = `72px repeat(${coaches.length}, minmax(100px, 1fr))`;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="bg-muted/50 border-b border-r p-2 text-xs font-medium text-muted-foreground text-center">时间</div>
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-muted/50 border-b border-r p-2 text-xs font-semibold text-center">
                <div>{coach.name}</div>
                <div className="text-[10px] font-normal text-muted-foreground">{coach.specialty}</div>
              </div>
            ))}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {slots.map((time, idx) => {
              const isEven = idx % 4 < 2;
              return (
                <div key={time} className="grid" style={{ gridTemplateColumns: cols }}>
                  <div className={cn('border-b border-r p-1 text-[10px] text-muted-foreground text-center flex items-center justify-center', isEven ? 'bg-muted/20' : 'bg-white')}>{time}</div>
                  {coaches.map((coach) => {
                    const booking = getCoachBookingAt(coach.id, time);
                    const isStart = isSlotStart(coach.id, time);
                    if (booking) {
                      const isPending = booking.status === 'pending';
                      const durationMins = timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime);
                      const slotCount = durationMins / SLOT_MINUTES;
                      if (isStart) {
                        return (
                          <div key={`${coach.id}-${time}`}
                            className={cn('border-b border-r p-1.5 text-xs relative overflow-hidden', isPending ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200')}
                            style={{ gridRow: `span ${slotCount}` }}>
                            <div className="flex items-center gap-1 font-medium truncate"><User className="w-3 h-3 shrink-0" /><span className="truncate">{booking.memberName}</span></div>
                            {booking.additionalMembers && booking.additionalMembers.length > 0 && (
                              <div className="text-[10px] opacity-70">+{booking.additionalMembers.length}人</div>
                            )}
                            <div className="text-[10px] mt-0.5 opacity-70 flex items-center gap-1"><Clock className="w-3 h-3" />{booking.bayName}</div>
                            {isPending && <div className="text-[10px] text-amber-700 font-medium mt-0.5">{booking.pendingFor === 'member' ? '待会员确认' : '待确认'}</div>}
                            <div className="text-[10px] mt-0.5 opacity-60">{booking.startTime}-{booking.endTime}</div>
                          </div>
                        );
                      }
                      return <div key={`${coach.id}-${time}`} className="hidden" />;
                    }
                    const blocked = getBlockedAt(coach.id, time);
                    if (blocked) {
                      const isBStart = isBlockedStart(coach.id, time);
                      const durationMins = timeToMinutes(blocked.endTime) - timeToMinutes(blocked.startTime);
                      const slotCount = durationMins / SLOT_MINUTES;
                      if (isBStart) {
                        return (
                          <div key={`${coach.id}-${time}`}
                            className="border-b border-r p-1 text-[10px] bg-gray-200/70 text-gray-600 relative overflow-hidden"
                            style={{ gridRow: `span ${slotCount}` }}>
                            <div className="flex items-center gap-1 font-medium"><Coffee className="w-3 h-3 shrink-0" />{blocked.reason || '休息'}</div>
                            <div className="opacity-60">{blocked.startTime}-{blocked.endTime}</div>
                          </div>
                        );
                      }
                      return <div key={`${coach.id}-${time}`} className="hidden" />;
                    }
                    return (
                      <div key={`${coach.id}-${time}`} className={cn('border-b border-r p-1 text-xs text-center text-muted-foreground/30', isEven ? 'bg-muted/5' : 'bg-white')}>—</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
