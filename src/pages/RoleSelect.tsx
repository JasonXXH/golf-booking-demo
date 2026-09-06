import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import type { UserRole, CurrentUser } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, GraduationCap, User, TreePine, ArrowLeft } from 'lucide-react';

const ROLES: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { role: 'admin', label: '管理员 / 前台', icon: <Shield className="w-6 h-6" />, desc: '管理打位、教练、会员，代客预约' },
  { role: 'coach', label: '教练', icon: <GraduationCap className="w-6 h-6" />, desc: '查看课表、管理学员、确认预约' },
  { role: 'member', label: '会员', icon: <User className="w-6 h-6" />, desc: '自助预约、查看记录' },
];

export default function RoleSelect() {
  const { state, actions } = useAppStore();
  const [pickedRole, setPickedRole] = useState<UserRole | null>(null);
  const [search, setSearch] = useState('');

  // 可选账号：管理员取 users 配置；教练/会员从管理模块数据动态生成
  function accountsFor(role: UserRole): CurrentUser[] {
    if (role === 'admin') return state.users.filter((u) => u.role === 'admin');
    if (role === 'coach') {
      return state.coaches
        .filter((c) => c.status === 'active')
        .map((c) => ({ role: 'coach' as const, id: c.id, name: c.name }));
    }
    return state.members.map((m) => ({ role: 'member' as const, id: m.id, name: m.name }));
  }

  const accounts = pickedRole ? accountsFor(pickedRole) : [];
  const filtered = accounts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.trim();
    if (a.name.includes(q)) return true;
    if (pickedRole === 'member') {
      const m = state.members.find((x) => x.id === a.id);
      return m?.phone.includes(q) ?? false;
    }
    return false;
  });

  const roleMeta = ROLES.find((r) => r.role === pickedRole);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <TreePine className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">高尔夫室内练习场</h1>
          <p className="text-sm text-muted-foreground">订场管理系统</p>
        </div>
      </div>

      {!pickedRole ? (
        <div className="grid gap-4 w-full max-w-md">
          {ROLES.map((r) => (
            <Card
              key={r.role}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setPickedRole(r.role); setSearch(''); }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {r.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-sm text-muted-foreground">{r.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setPickedRole(null)}><ArrowLeft className="w-4 h-4" /></Button>
            <div className="font-semibold">选择{roleMeta?.label}账号</div>
          </div>
          {pickedRole !== 'admin' && (
            <Input placeholder="搜索姓名或手机号" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
            {filtered.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => actions.setUser(a)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {roleMeta?.icon}
                  </div>
                  <div className="font-medium">{a.name}</div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">没有匹配的账号</div>}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center">
        演示模式：选择角色和账号即可进入对应视图<br />
        数据保存在浏览器本地，刷新不会丢失
      </p>
    </div>
  );
}
