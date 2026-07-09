"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Car,
  Wrench,
  Truck,
  Settings,
  Sparkles,
  ArrowRight,
  MessageSquare,
  MapPin,
  ShieldCheck,
  Zap,
  Search,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };
  const features = [
    {
      icon: Settings,
      title: "Repuestos Inteligentes",
      desc: "Encuentra la pieza exacta para tu vehículo. Nuestra IA interpreta tu solicitud en lenguaje natural.",
      color: "from-amber-500 to-orange-500",
    },
    {
      icon: Wrench,
      title: "Talleres Cercanos",
      desc: "Conecta con talleres mecánicos verificados cerca de tu ubicación en tiempo real.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Truck,
      title: "Servicio de Grúa",
      desc: "Asistencia de remolque 24/7. Solicita una grúa y rastrea su llegada en vivo.",
      color: "from-rose-500 to-red-500",
    },
    {
      icon: Sparkles,
      title: "Asistente IA",
      desc: "Chatbot contextual que diagnostica, recomienda piezas y sugiere servicios automotrices.",
      color: "from-indigo-500 to-purple-500",
    },
  ];

  const steps = [
    {
      n: "01",
      icon: Search,
      title: "Describe lo que necesitas",
      desc: "Escríbelo en tus propias palabras. La IA detecta marca, modelo, año y pieza.",
    },
    {
      n: "02",
      icon: MapPin,
      title: "Recibe cotizaciones",
      desc: "Proveedores, talleres y grúas cercanas responden con precios y disponibilidad.",
    },
    {
      n: "03",
      icon: ShieldCheck,
      title: "Elige y resuelve",
      desc: "Compara opciones, agenda el servicio y paga con seguridad. Listo.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right:[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[140px] pointer-events-none" />

      <header className="fixed top-4 left-4 right-4 md:top-6 md:left-1/2 md:-translate-x-1/2 md:w-fit z-50 rounded-2xl md:rounded-full border border-zinc-800/60 backdrop-blur-xl bg-zinc-950/60 shadow-2xl transition-all duration-300">
        <div className="px-5 md:px-8 h-16 flex items-center justify-between md:gap-12">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 text-zinc-950 font-bold" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Repuesto<span className="text-emerald-400">IA</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Servicios</a>
            <a href="#how" className="hover:text-zinc-100 transition-colors">Cómo funciona</a>
            <a href="#demo" className="hover:text-zinc-100 transition-colors">Demo</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 rounded-full hover:from-indigo-400 hover:to-emerald-400 transition-all shadow-lg shadow-indigo-500/20"
            >
              Crear cuenta
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800/60 p-5 bg-zinc-950/40 rounded-b-2xl flex flex-col gap-4">
            <nav className="flex flex-col gap-4 text-base font-medium text-zinc-300">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-zinc-100 transition-colors">Servicios</a>
              <a href="#how" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-zinc-100 transition-colors">Cómo funciona</a>
              <a href="#demo" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-zinc-100 transition-colors">Demo</a>
            </nav>
            <div className="flex flex-col gap-3 mt-2">
              <Link
                href="/login"
                className="w-full text-center px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="w-full text-center px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 rounded-xl hover:from-indigo-400 hover:to-emerald-400 transition-all shadow-lg shadow-indigo-500/20"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            MVP en vivo · IA Mock integrada
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Tu taller, repuestos y grúa
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              en un solo lugar.
            </span>
          </h1>

          <p className="mt-7 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Marketplace automotriz con IA. Describe lo que necesitas en lenguaje natural
            y conectamos con proveedores, talleres mecánicos y servicios de grúa verificados.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="group px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
            >
              Comenzar gratis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold rounded-2xl transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="relative p-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 text-center text-xs text-zinc-500 font-mono">
                  asistente.repuestoia.com
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-zinc-500">Tú</p>
                  <p className="text-zinc-100">
                    Necesito una bomba de gasolina para mi Hilux 2019
                  </p>
                  <p className="text-sm text-zinc-500 pt-2">RepuestoIA</p>
                  <p className="text-zinc-300 text-sm">
                    Detectado: <span className="text-emerald-400 font-semibold">Toyota Hilux 2019</span> ·{" "}
                    <span className="text-indigo-400 font-semibold">Bomba de gasolina</span>. Encontré
                    3 proveedores con disponibilidad cerca de ti.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Todo lo que tu vehículo necesita
            </h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Cuatro servicios integrados en una sola plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl backdrop-blur-sm transition-all hover:bg-zinc-900/60"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-zinc-950" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how" className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Resuelto en 3 pasos
            </h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Sin formularios eternos. Sin llamadas infinitas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.n}
                  className="relative p-7 bg-zinc-900/40 border border-zinc-800 rounded-3xl"
                >
                  <div className="absolute top-5 right-5 text-6xl font-black text-zinc-800/60 select-none">
                    {s.n}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="demo" className="max-w-7xl mx-auto px-6 py-20">
          <div className="relative overflow-hidden p-10 md:p-14 bg-gradient-to-br from-indigo-950/60 via-zinc-900/60 to-emerald-950/60 border border-zinc-800 rounded-3xl">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Demo en vivo
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                  Prueba las credenciales demo
                </h2>
                <p className="text-zinc-400 leading-relaxed">
                  Ingresa con cualquiera de las cuentas preconfiguradas y explora el
                  dashboard según el rol. Todo listo en SQLite, sin configuración extra.
                </p>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { role: "Admin", email: "admin@repuestoia.com", pwd: "admin123" },
                  { role: "Cliente", email: "juan@demo.com", pwd: "client123" },
                  { role: "Proveedor", email: "autopartes@demo.com", pwd: "prov123" },
                  { role: "Taller", email: "taller_elite@demo.com", pwd: "workshop123" },
                  { role: "Grúa", email: "gruas_rapid@demo.com", pwd: "tow123" },
                ].map((c) => (
                  <div
                    key={c.email}
                    className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl font-mono text-xs"
                  >
                    <span className="text-indigo-400 font-semibold w-20 shrink-0">{c.role}</span>
                    <span className="text-zinc-300 flex-1 truncate">{c.email}</span>
                    <span className="text-zinc-500">{c.pwd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-900 mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-lg flex items-center justify-center">
              <Car className="w-3.5 h-3.5 text-zinc-950" strokeWidth={2.5} />
            </div>
            <span>RepuestoIA · MVP Fase 1</span>
          </div>
          <div>Next.js 16 · NestJS 11 · Prisma · SQLite</div>
        </div>
      </footer>
    </div>
  );
}
