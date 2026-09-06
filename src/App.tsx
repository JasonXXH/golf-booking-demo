import { useAppStore } from '@/hooks/useAppStore';
import { Toaster } from '@/components/ui/sonner';
import RoleSelect from './pages/RoleSelect';
import AdminDashboard from './pages/admin/AdminDashboard';
import CoachDashboard from './pages/coach/CoachDashboard';
import MemberDashboard from './pages/member/MemberDashboard';

export default function App() {
  const { state } = useAppStore();

  return (
    <>
      {!state.currentUser ? (
        <RoleSelect />
      ) : state.currentUser.role === 'admin' ? (
        <AdminDashboard />
      ) : state.currentUser.role === 'coach' ? (
        <CoachDashboard />
      ) : (
        <MemberDashboard />
      )}
      <Toaster richColors position="top-center" />
    </>
  );
}
