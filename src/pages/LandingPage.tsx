import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, ArrowRight, Users, Zap, Shield, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Agenda Inteligente</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#testimonials" className="hover:text-primary transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="shadow-lg shadow-primary/20">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3" />
              Revolucione sua produtividade
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-6">
              Pare de perder tempo em reuniões <span className="text-primary">desorganizadas.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
              A única agenda inteligente que controla o tempo, organiza tópicos e gera insights automáticos para suas reuniões de alta performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-xl shadow-xl shadow-primary/20">
                  Começar Grátis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-4 px-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">+500 times</p>
                  <p className="text-slate-500">já estão usando</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                alt="App Dashboard" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 opacity-50 grayscale">
          <span className="font-black text-2xl tracking-tighter">TECHCORP</span>
          <span className="font-black text-2xl tracking-tighter">STARTUP.IO</span>
          <span className="font-black text-2xl tracking-tighter">NEXUS</span>
          <span className="font-black text-2xl tracking-tighter">GLOBAL</span>
          <span className="font-black text-2xl tracking-tighter">PULSE</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Tudo o que você precisa para reuniões eficientes</h2>
            <p className="text-lg text-slate-600">Desenvolvemos as ferramentas certas para que você foque no que realmente importa: resultados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Clock, title: "Controle de Tempo", desc: "Cronômetro regressivo por tópico para garantir que nada passe do tempo." },
              { icon: Users, title: "Colaboração Real", desc: "Compartilhe agendas e defina responsáveis por cada parte da reunião." },
              { icon: Zap, title: "IA Inteligente", desc: "Insights e resumos automáticos gerados por inteligência artificial avançada." },
              { icon: Shield, title: "Segurança Total", desc: "Seus dados protegidos com criptografia de ponta e controle de acesso." },
              { icon: BarChart3, title: "Análise de Performance", desc: "Relatórios detalhados sobre como seu tempo está sendo investido." },
              { icon: CheckCircle2, title: "Exportação PDF", desc: "Gere atas de reunião profissionais em segundos com um clique." },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <f.icon className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Agenda Inteligente</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Agenda Inteligente. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
