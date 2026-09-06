import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Edit, Plus } from 'lucide-react';
import type { Bay } from '@/types';

interface BayManagerProps {
  bays: Bay[];
  onAdd: (bay: Bay) => void;
  onUpdate: (bay: Bay) => void;
  onRemove: (id: string) => void;
}

export default function BayManager({ bays, onAdd, onUpdate, onRemove }: BayManagerProps) {
  const [editing, setEditing] = useState<Bay | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState<Partial<Bay>>({ name: '', equipmentType: '', pricePerHour: 100, status: 'available' });

  const openAdd = () => {
    setForm({ name: '', equipmentType: '', pricePerHour: 100, status: 'available' });
    setIsAdd(true);
    setEditing(null);
  };

  const openEdit = (bay: Bay) => {
    setForm({ ...bay });
    setIsAdd(false);
    setEditing(bay);
  };

  const submit = () => {
    if (!form.name || !form.equipmentType || !form.pricePerHour) return;
    if (isAdd) {
      onAdd({ ...form, id: `bay-${Date.now()}`, status: 'available' } as Bay);
    } else if (editing) {
      onUpdate({ ...editing, ...form } as Bay);
    }
    setEditing(null);
    setIsAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />新增打位</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bays.map((bay) => (
          <Card key={bay.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{bay.name}</div>
                  <div className="text-sm text-muted-foreground">{bay.equipmentType}</div>
                  <div className="text-sm font-medium mt-1">¥{bay.pricePerHour}/小时</div>
                  <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${bay.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {bay.status === 'available' ? '可用' : '维护中'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(bay)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemove(bay.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing || isAdd} onOpenChange={(v) => { if (!v) { setEditing(null); setIsAdd(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAdd ? '新增打位' : '编辑打位'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>设备类型</Label><Input value={form.equipmentType} onChange={(e) => setForm({ ...form, equipmentType: e.target.value })} /></div>
            <div className="space-y-1"><Label>每小时价格 (¥)</Label><Input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} /></div>
            <Button onClick={submit} className="w-full">{isAdd ? '新增' : '保存'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
