import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, Wallet } from 'lucide-react';
import type { Member, Coach } from '@/types';

interface MemberManagerProps {
  members: Member[];
  coaches: Coach[];
  onAdd: (member: Member) => void;
  onUpdate: (member: Member) => void;
  onRemove: (id: string) => void;
  onRecharge?: (member: Member) => void;
}

export default function MemberManager({ members, coaches, onAdd, onUpdate, onRemove, onRecharge }: MemberManagerProps) {
  const [editing, setEditing] = useState<Member | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState<Partial<Member>>({ name: '', phone: '', remainingLessonHours: 0, remainingPracticeHours: 0 });

  const openAdd = () => {
    setForm({ name: '', phone: '', remainingLessonHours: 0, remainingPracticeHours: 0 });
    setIsAdd(true);
    setEditing(null);
  };

  const openEdit = (member: Member) => {
    setForm({ ...member });
    setIsAdd(false);
    setEditing(member);
  };

  const submit = () => {
    if (!form.name || !form.phone) return;
    const primaryCoach = coaches.find((c) => c.id === form.primaryCoachId);
    const payload = {
      ...form,
      primaryCoachName: primaryCoach?.name,
    };
    if (isAdd) {
      onAdd({ ...payload, id: `member-${Date.now()}` } as Member);
    } else if (editing) {
      onUpdate({ ...editing, ...payload } as Member);
    }
    setEditing(null);
    setIsAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />新增会员</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{member.name}</div>
                  <div className="text-sm text-muted-foreground">{member.phone}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    教练: {member.primaryCoachName || '未分配'}
                  </div>
                  <div className="flex gap-3 mt-2 text-sm">
                    <span className="text-blue-600">课程: {member.remainingLessonHours}h</span>
                    <span className="text-emerald-600">练习: {member.remainingPracticeHours}h</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {onRecharge && (
                    <Button size="icon" variant="ghost" title="额度充值" className="text-emerald-600" onClick={() => onRecharge(member)}><Wallet className="w-4 h-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(member)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(member.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing || isAdd} onOpenChange={(v) => { if (!v) { setEditing(null); setIsAdd(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isAdd ? '新增会员' : '编辑会员'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>姓名</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>电话</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>主教练</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.primaryCoachId || ''} onChange={(e) => setForm({ ...form, primaryCoachId: e.target.value || undefined })}>
                <option value="">未分配</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>剩余课时 (h)</Label><Input type="number" value={form.remainingLessonHours || 0} onChange={(e) => setForm({ ...form, remainingLessonHours: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>剩余练习 (h)</Label><Input type="number" value={form.remainingPracticeHours || 0} onChange={(e) => setForm({ ...form, remainingPracticeHours: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={submit} className="w-full">{isAdd ? '新增' : '保存'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
