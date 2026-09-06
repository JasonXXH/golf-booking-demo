import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Member, PaymentRecord } from '@/types';

interface RechargeDialogProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  operator: { id: string; name: string };
  onSubmit: (payment: PaymentRecord) => void;
}

const METHODS = ['微信', '支付宝', '现金', '刷卡', '转账', '赠送/补偿'];

export default function RechargeDialog({ member, open, onClose, operator, onSubmit }: RechargeDialogProps) {
  const [item, setItem] = useState<'practice' | 'lesson'>('lesson');
  const [hours, setHours] = useState('10');
  const [amountDue, setAmountDue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [method, setMethod] = useState('微信');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!member) return null;

  function submit() {
    const h = parseFloat(hours);
    if (!h || h <= 0) {
      setError('请填写有效的额度小时数');
      return;
    }
    const due = parseFloat(amountDue) || 0;
    const paid = parseFloat(amountPaid) || 0;
    onSubmit({
      id: `payment-${Date.now()}`,
      memberId: member!.id,
      memberName: member!.name,
      item,
      hours: h,
      amountDue: due,
      amountPaid: paid,
      method,
      note: note || undefined,
      createdAt: new Date().toISOString(),
      operatorId: operator.id,
      operatorName: operator.name,
    });
    setItem('lesson'); setHours('10'); setAmountDue(''); setAmountPaid('');
    setMethod('微信'); setNote(''); setError('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>额度充值 — {member.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground flex gap-3">
            <span className="text-blue-600">现有教练课时: {member.remainingLessonHours}h</span>
            <span className="text-emerald-600">现有练习时长: {member.remainingPracticeHours}h</span>
          </div>
          <div className="space-y-1"><Label>充值项目</Label>
            <div className="flex gap-2">
              <Button type="button" variant={item === 'lesson' ? 'default' : 'outline'} className="flex-1" onClick={() => setItem('lesson')}>教练课时</Button>
              <Button type="button" variant={item === 'practice' ? 'default' : 'outline'} className="flex-1" onClick={() => setItem('practice')}>练习时长</Button>
            </div>
          </div>
          <div className="space-y-1"><Label>增加额度（小时）</Label>
            <Input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>应收金额（¥）</Label>
              <Input type="number" min="0" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1"><Label>实收金额（¥）</Label>
              <Input type="number" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1"><Label>付款方式</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>备注</Label>
            <Input placeholder="折扣、赠课、补偿等说明（可选）" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
          <Button onClick={submit} className="w-full">确认充值</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
