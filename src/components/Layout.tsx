import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, LayoutDashboard, Users, CalendarDays, Settings } from 'lucide-react';

export function Layout() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 font-extrabold text-xl text-primary">
          <Calendar className="w-6 h-6" />
          <span>AgendaInteli</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
          >
            <Users className="w-4 h-4" />
            Minhas Reuniões
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
          >
            <CalendarDays className="w-4 h-4" />
            Calendário
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Usuário</p>
            <p className="text-sm font-medium truncate text-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="w-full gap-2 justify-start">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 shrink-0">
          <div className="text-sm text-muted-foreground">
            Meus Projetos / <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm">Nova Reunião</Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
