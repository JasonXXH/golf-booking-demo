import type { Booking, Bay } from '@/types';
import { SLOT_MINUTES } from '@/types';
import { cn } from '@/lib/utils';
import { User, GraduationCap, Wrench } from 'lucide-react';
import { timeToMinutes } from '@/hooks/useAppStore';

interface BayGridProps {
  date: string;
  bays: Bay[];
  bookings: Booking[];
  slots: string[];
  onSlotClick: (bayId: string, time: string) => void;
}

export default function BayGrid({ date, bays, bookings, slots, onSlotClick }: BayGridProps) {
  const dayBookings = bookings.filter((b) => b.date === date && b.status !== 'cancelled');

  function getBookingAt(bayId: string, time: string): Booking | undefined {
    const t = timeToMinutes(time);
    return dayBookings.find((b) => {
      if (b.bayId !== bayId) return false;
      const s = timeToMinutes(b.startTime);
      const e = timeToMinutes(b.endTime);
      return t >= s && t < e;
    });
  }

  function isSlotStart(bayId: string, time: string): boolean {
    return dayBookings.some((b) => b.bayId === bayId && b.startTime === time && b.status !== 'cancelled');
  }

  const cols = `72px repeat(${bays.length}, minmax(72px, 1fr))`;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="bg-muted/50 border-b border-r p-2 text-xs font-medium text-muted-foreground text-center sticky left-0 z-10">时间</div>
            {bays.map((bay) => (
              <div key={bay.id} className="bg-muted/50 border-b border-r p-2 text-xs font-semibold text-center">
                <div className="flex items-center justify-center gap-1">
                  {bay.name}
                  {bay.status === 'maintenance' && <Wrench className="w-3 h-3 text-red-500" />}
                </div>
                <div className="text-[10px] font-normal text-muted-foreground">
                  ¥{bay.pricePerHour}/h{bay.status === 'maintenance' ? ' · 维护中' : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {slots.map((time, idx) => {
              const isEven = idx % 4 < 2;
              return (
                <div key={time} className="grid" style={{ gridTemplateColumns: cols }}>
                  <div className={cn('border-b border-r p-1 text-[10px] text-muted-foreground text-center flex items-center justify-center', isEven ? 'bg-muted/20' : 'bg-white')}>{time}</div>
                  {bays.map((bay) => {
                    if (bay.status === 'maintenance') {
                      return <div key={`${bay.id}-${time}`} className="border-b border-r bg-gray-100/70" title="维护中" />;
                    }
                    const booking = getBookingAt(bay.id, time);
                    const isStart = isSlotStart(bay.id, time);
                    if (booking) {
                      const isLesson = booking.type === 'lesson';
                      const isPending = booking.status === 'pending';
                      const durationMins = timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime);
                      const slotCount = durationMins / SLOT_MINUTES;
                      if (isStart) {
                        return (
                          <div key={`${bay.id}-${time}`}
                            className={cn('border-b border-r p-1 text-[11px] relative overflow-hidden',
                              isPending ? 'bg-amber-100 text-amber-800 border-amber-200 cursor-pointer hover:bg-amber-200' :
                              isLesson ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            )}
                            style={{ gridRow: `span ${slotCount}` }}
                            onClick={isPending ? () => onSlotClick(bay.id, time) : undefined}
                            title={isPending ? '待确认（尚未占位），点击仍可预约' : undefined}
                          >
                            <div className="flex items-center gap-0.5 font-medium truncate">
                              {isLesson ? <GraduationCap className="w-3 h-3 shrink-0" /> : <User className="w-3 h-3 shrink-0" />}
                              <span className="truncate">{booking.memberName}</span>
                            </div>
                            {isLesson && booking.coachName && <div className="text-[10px] truncate opacity-80">{booking.coachName}</div>}
                            {booking.additionalMembers && booking.additionalMembers.length > 0 && (
                              <div className="text-[10px] opacity-70">+{booking.additionalMembers.length}人</div>
                            )}
                            {isPending && <div className="text-[10px] text-amber-700 font-medium">{booking.pendingFor === 'member' ? '待会员确认' : '待确认'}</div>}
                            <div className="text-[10px] opacity-60">{booking.startTime}-{booking.endTime}</div>
                          </div>
                        );
                      }
                      return <div key={`${bay.id}-${time}`} className="hidden" />;
                    }
                    return (
                      <button key={`${bay.id}-${time}`} onClick={() => onSlotClick(bay.id, time)}
                        className={cn('border-b border-r p-1 text-xs hover:bg-primary/10 transition-colors text-center', isEven ? 'bg-muted/10' : 'bg-white')}>
                        <span className="text-muted-foreground/40">+</span>
                      </button>
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
