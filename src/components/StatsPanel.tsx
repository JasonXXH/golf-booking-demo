import type { Booking, Bay, PaymentRecord } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, MapPin, GraduationCap, Clock, Wallet } from 'lucide-react';

interface StatsPanelProps {
  date: string;
  bookings: Booking[];
  bays: Bay[];
  payments: PaymentRecord[];
}

export default function StatsPanel({ date, bookings, bays, payments }: StatsPanelProps) {
  const dayBookings = bookings.filter((b) => b.date === date && b.status !== 'cancelled');
  const lessonCount = dayBookings.filter((b) => b.type === 'lesson').length;
  const pendingCount = dayBookings.filter((b) => b.status === 'pending').length;
  const uniqueMembers = new Set(dayBookings.map((b) => b.memberId)).size;
  const occupiedBays = new Set(dayBookings.map((b) => b.bayId)).size;
  const dayRevenue = payments
    .filter((p) => p.createdAt.slice(0, 10) === date)
    .reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Calendar className="w-4 h-4 text-primary" /></div>
        <div><div className="text-xl font-bold">{dayBookings.length}</div><div className="text-[10px] text-muted-foreground">当日预订</div></div>
      </CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><GraduationCap className="w-4 h-4 text-blue-600" /></div>
        <div><div className="text-xl font-bold">{lessonCount}</div><div className="text-[10px] text-muted-foreground">教练课程</div></div>
      </CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
        <div><div className="text-xl font-bold">{pendingCount}</div><div className="text-[10px] text-muted-foreground">待确认</div></div>
      </CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div>
        <div><div className="text-xl font-bold">{uniqueMembers}</div><div className="text-[10px] text-muted-foreground">到场会员</div></div>
      </CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-purple-600" /></div>
        <div><div className="text-xl font-bold">{occupiedBays}/{bays.length}</div><div className="text-[10px] text-muted-foreground">打位占用</div></div>
      </CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center"><Wallet className="w-4 h-4 text-rose-600" /></div>
        <div><div className="text-xl font-bold">¥{dayRevenue}</div><div className="text-[10px] text-muted-foreground">当日收款</div></div>
      </CardContent></Card>
    </div>
  );
}
