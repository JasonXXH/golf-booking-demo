import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit, Plus } from 'lucide-react';
import type { Coach } from '@/types';

interface CoachManagerProps {
  coaches: Coach[];
  onAdd: (coach: Coach) => void;
  onUpdate: (coach: Coach) => void;
  onRemove: (id: string) => void;
}

export default function CoachManager({ coaches, onAdd, onUpdate, onRemove }: CoachManagerProps) {
  const [editing, setEditing] = useState<Coach | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState<Partial<Coach>>({ name: '', specialty: '', phone: '', status: 'active' });

  const openAdd = () => {
    setForm({ name: '', specialty: '', phone: '', status: 'active' });
    setIsAdd(true);
    setEditing(null);
  };

  const openEdit = (coach: Coach) => {
    setForm({ ...coach });
    setIsAdd(false);
    setEditing(coach);
  };

  const submit = () => {
    if (!form.name || !form.specialty) return;
    if (isAdd) {
      onAdd({ ...form, id: `coach-${Date.now()}` } as Coach);
    } else if (editing) {
      onUpdate({ ...editing, ...form } as Coach);
    }
    setEditing(null);
    setIsAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />新增教练</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.map((coach) => (
          <Card key={coach.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{coach.name}</div>
                  <div className="text-sm text-muted-foreground">{coach.specialty}</div>
                  <div className="text-sm text-muted-foreground">{coach.phone}</div>
                  <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${coach.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {coach.status === 'active' ? '在职' : '离职'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(coach)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(coach.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing || isAdd} onOpenChange={(v) => { if (!v) { setEditing(null); setIsAdd(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAdd ? '新增教练' : '编辑教练'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>姓名</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>专长</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
            <div className="space-y-1"><Label>电话</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button onClick={submit} className="w-full">{isAdd ? '新增' : '保存'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
