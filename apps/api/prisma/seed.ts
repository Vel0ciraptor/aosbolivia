import { PrismaClient } from '@prisma/client';
import { Role, UserStatus, BusinessStatus } from '../src/common/enums';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RepuestoIA database...');

  // ── Limpiar base de datos (orden por relaciones FK) ──
  await prisma.message.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.part.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.workshopService.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.towService.deleteMany();
  await prisma.request.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // ─────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@repuestoia.com' },
    update: {},
    create: {
      name: 'Admin RepuestoIA',
      email: 'admin@repuestoia.com',
      password: adminPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─────────────────────────────────────────────────────
  // CLIENTES
  // ─────────────────────────────────────────────────────
  const clientPassword = await bcrypt.hash('client123', 10);
  const client1 = await prisma.user.upsert({
    where: { email: 'juan@demo.com' },
    update: {},
    create: {
      name: 'Juan Pérez',
      email: 'juan@demo.com',
      password: clientPassword,
      phone: '+58 412 1234567',
      role: Role.CLIENT,
      status: UserStatus.ACTIVE,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'maria@demo.com' },
    update: {},
    create: {
      name: 'María González',
      email: 'maria@demo.com',
      password: clientPassword,
      phone: '+58 414 9876543',
      role: Role.CLIENT,
      status: UserStatus.ACTIVE,
    },
  });

  const client3 = await prisma.user.upsert({
    where: { email: 'carlos@demo.com' },
    update: {},
    create: {
      name: 'Carlos Rodríguez',
      email: 'carlos@demo.com',
      password: clientPassword,
      phone: '+58 416 5552222',
      role: Role.CLIENT,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✅ Clientes creados (3)`);

  // ── Vehículos de Juan ──
  const hilux = await prisma.vehicle.create({
    data: {
      userId: client1.id,
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2019,
      motor: '2.8 TDI',
      combustible: 'Diesel',
      placa: 'ABC-123',
    },
  });
  const explorer = await prisma.vehicle.create({
    data: {
      userId: client1.id,
      marca: 'Ford',
      modelo: 'Explorer',
      anio: 2021,
      motor: '2.3 EcoBoost',
      combustible: 'Gasolina',
      placa: 'XYZ-789',
    },
  });

  // ── Vehículos de María ──
  const corolla = await prisma.vehicle.create({
    data: {
      userId: client2.id,
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2020,
      motor: '1.8 VVTi',
      combustible: 'Gasolina',
      placa: 'MNO-456',
    },
  });

  // ── Vehículos de Carlos ──
  const civic = await prisma.vehicle.create({
    data: {
      userId: client3.id,
      marca: 'Honda',
      modelo: 'Civic',
      anio: 2018,
      motor: '1.5 VTEC Turbo',
      combustible: 'Gasolina',
      placa: 'PQR-321',
    },
  });
  console.log(`✅ Vehículos creados (4)`);

  // ─────────────────────────────────────────────────────
  // PROVEEDOR 1 — AutoPartes Caracas
  // ─────────────────────────────────────────────────────
  const provPass = await bcrypt.hash('prov123', 10);
  const provUser1 = await prisma.user.upsert({
    where: { email: 'autopartes@demo.com' },
    update: {},
    create: {
      name: 'AutoPartes Caracas',
      email: 'autopartes@demo.com',
      password: provPass,
      role: Role.PROVIDER,
      status: UserStatus.ACTIVE,
    },
  });

  const provider1 = await prisma.provider.upsert({
    where: { userId: provUser1.id },
    update: {},
    create: {
      userId: provUser1.id,
      nombre: 'AutoPartes Caracas C.A.',
      telefono: '+58 212 5551234',
      email: 'ventas@autopartescaracas.com',
      direccion: 'Av. Libertador, Caracas',
      latitud: 10.4806,
      longitud: -66.9036,
      estado: BusinessStatus.ACTIVE,
    },
  });

  await prisma.part.createMany({
    data: [
      {
        providerId: provider1.id,
        nombre: 'Bomba de Gasolina Toyota Hilux',
        descripcion: 'Bomba de combustible OEM para Hilux 2015-2022',
        marca: 'Toyota',
        modelo: 'Hilux',
        anioDesde: 2015,
        anioHasta: 2022,
        precio: 85.0,
        stock: 5,
      },
      {
        providerId: provider1.id,
        nombre: 'Filtro de aceite Toyota',
        descripcion: 'Filtro de aceite original Toyota Hilux',
        marca: 'Toyota',
        modelo: 'Hilux',
        anioDesde: 2010,
        anioHasta: 2023,
        precio: 12.5,
        stock: 20,
      },
      {
        providerId: provider1.id,
        nombre: 'Pastillas de freno delanteras Ford Explorer',
        descripcion: 'Kit pastillas freno delantera EBC',
        marca: 'Ford',
        modelo: 'Explorer',
        anioDesde: 2018,
        anioHasta: 2023,
        precio: 55.0,
        stock: 8,
      },
      {
        providerId: provider1.id,
        nombre: 'Alternador Toyota Hilux 2.8D',
        descripcion: 'Alternador remanufacturado 130A',
        marca: 'Toyota',
        modelo: 'Hilux',
        anioDesde: 2016,
        anioHasta: 2022,
        precio: 145.0,
        stock: 3,
      },
      {
        providerId: provider1.id,
        nombre: 'Correa de distribución Toyota Corolla',
        descripcion: 'Kit completo correa + tensor Dayco',
        marca: 'Toyota',
        modelo: 'Corolla',
        anioDesde: 2018,
        anioHasta: 2022,
        precio: 68.0,
        stock: 7,
      },
      {
        providerId: provider1.id,
        nombre: 'Bujías NGK Honda Civic',
        descripcion: 'Set 4 bujías iridium NGK',
        marca: 'Honda',
        modelo: 'Civic',
        anioDesde: 2016,
        anioHasta: 2022,
        precio: 38.0,
        stock: 15,
      },
    ],
  });
  console.log(`✅ Proveedor 1 y catálogo creados`);

  // ─────────────────────────────────────────────────────
  // PROVEEDOR 2 — Repuestos del Norte
  // ─────────────────────────────────────────────────────
  const provUser2 = await prisma.user.upsert({
    where: { email: 'repuestos_norte@demo.com' },
    update: {},
    create: {
      name: 'Repuestos del Norte',
      email: 'repuestos_norte@demo.com',
      password: provPass,
      role: Role.PROVIDER,
      status: UserStatus.ACTIVE,
    },
  });

  const provider2 = await prisma.provider.upsert({
    where: { userId: provUser2.id },
    update: {},
    create: {
      userId: provUser2.id,
      nombre: 'Repuestos del Norte S.A.',
      telefono: '+58 212 7778899',
      email: 'info@repuestosdelnorte.com',
      direccion: 'Centro Comercial El Norte, Local 14',
      latitud: 10.51,
      longitud: -66.88,
      estado: BusinessStatus.ACTIVE,
    },
  });

  await prisma.part.createMany({
    data: [
      {
        providerId: provider2.id,
        nombre: 'Bomba de Gasolina Toyota Hilux (Genérica)',
        descripcion: 'Bomba combustible compatible, marca Facet',
        marca: 'Toyota',
        modelo: 'Hilux',
        anioDesde: 2015,
        anioHasta: 2022,
        precio: 62.0,
        stock: 10,
      },
      {
        providerId: provider2.id,
        nombre: 'Amortiguadores delanteros Ford Explorer',
        descripcion: 'Par amortiguadores Monroe OESpectrum',
        marca: 'Ford',
        modelo: 'Explorer',
        anioDesde: 2019,
        anioHasta: 2023,
        precio: 180.0,
        stock: 4,
      },
      {
        providerId: provider2.id,
        nombre: 'Disco de freno Toyota Corolla',
        descripcion: 'Par discos ventilados delanteros Brembo',
        marca: 'Toyota',
        modelo: 'Corolla',
        anioDesde: 2018,
        anioHasta: 2023,
        precio: 95.0,
        stock: 6,
      },
      {
        providerId: provider2.id,
        nombre: 'Sensor O2 Honda Civic',
        descripcion: 'Sensor de oxígeno OEM aguas arriba',
        marca: 'Honda',
        modelo: 'Civic',
        anioDesde: 2016,
        anioHasta: 2022,
        precio: 42.0,
        stock: 5,
      },
    ],
  });
  console.log(`✅ Proveedor 2 y catálogo creados`);

  // ─────────────────────────────────────────────────────
  // TALLER — Elite Motors
  // ─────────────────────────────────────────────────────
  const workshopPass = await bcrypt.hash('workshop123', 10);
  const workshopUser = await prisma.user.upsert({
    where: { email: 'taller_elite@demo.com' },
    update: {},
    create: {
      name: 'Taller Elite Motors',
      email: 'taller_elite@demo.com',
      password: workshopPass,
      role: Role.WORKSHOP,
      status: UserStatus.ACTIVE,
    },
  });

  const workshop = await prisma.workshop.upsert({
    where: { userId: workshopUser.id },
    update: {},
    create: {
      userId: workshopUser.id,
      nombre: 'Taller Elite Motors',
      descripcion:
        'Especialistas en mecánica general, frenos, suspensión y motor. Más de 15 años de experiencia.',
      telefono: '+58 412 9876543',
      direccion: 'Urb. La Castellana, Caracas',
      latitud: 10.495,
      longitud: -66.856,
      horario: {
        lunes: '8:00 - 18:00',
        martes: '8:00 - 18:00',
        miercoles: '8:00 - 18:00',
        jueves: '8:00 - 18:00',
        viernes: '8:00 - 18:00',
        sabado: '8:00 - 13:00',
        domingo: 'Cerrado',
      },
      estado: BusinessStatus.ACTIVE,
    },
  });

  await prisma.workshopService.createMany({
    data: [
      {
        workshopId: workshop.id,
        nombre: 'Cambio de aceite y filtros',
        descripcion: 'Incluye aceite 5W-30 sintético y filtros',
        precioReferencial: 25.0,
      },
      {
        workshopId: workshop.id,
        nombre: 'Servicio de frenos',
        descripcion: 'Revisión, rectificación y cambio de pastillas',
        precioReferencial: 80.0,
      },
      {
        workshopId: workshop.id,
        nombre: 'Diagnóstico computarizado',
        descripcion: 'Escaneo OBD2 completo con reporte',
        precioReferencial: 30.0,
      },
      {
        workshopId: workshop.id,
        nombre: 'Alineación y balanceo',
        descripcion: 'Alineación láser 4 ruedas',
        precioReferencial: 40.0,
      },
      {
        workshopId: workshop.id,
        nombre: 'Servicio completo de suspensión',
        descripcion: 'Revisión y reemplazo de amortiguadores, rotulas y brazos',
        precioReferencial: 220.0,
      },
      {
        workshopId: workshop.id,
        nombre: 'Cambio de correa de distribución',
        descripcion: 'Kit completo con tensor y bomba de agua',
        precioReferencial: 150.0,
      },
    ],
  });
  console.log(`✅ Taller y servicios creados`);

  // ─────────────────────────────────────────────────────
  // GRÚA — Grúas Rápidas 24h
  // ─────────────────────────────────────────────────────
  const towPass = await bcrypt.hash('tow123', 10);
  const towUser = await prisma.user.upsert({
    where: { email: 'gruas_rapid@demo.com' },
    update: {},
    create: {
      name: 'Grúas Rápidas 24h',
      email: 'gruas_rapid@demo.com',
      password: towPass,
      role: Role.TOW_SERVICE,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.towService.upsert({
    where: { userId: towUser.id },
    update: {},
    create: {
      userId: towUser.id,
      nombre: 'Grúas Rápidas 24h',
      telefono: '+58 414 1112233',
      direccion: 'Autopista Caracas-La Guaira, Km 2',
      latitud: 10.505,
      longitud: -66.92,
      costoBase: 25.0,
      costoKm: 2.5,
      cobertura: 50.0,
      estado: BusinessStatus.ACTIVE,
    },
  });
  console.log(`✅ Servicio de grúa creado`);

  // ─────────────────────────────────────────────────────
  // SOLICITUDES (Requests) — variadas y con estados
  // ─────────────────────────────────────────────────────

  // Solicitud 1: Juan pide bomba de gasolina (OPEN, con cotizaciones)
  const req1 = await prisma.request.create({
    data: {
      userId: client1.id,
      vehicleId: hilux.id,
      categoria: 'REPUESTO',
      titulo: 'Bomba de gasolina Toyota Hilux 2019',
      descripcion:
        'Necesito una bomba de gasolina para mi Hilux 2019 2.8 diesel. El motor se apaga a altas temperaturas y el mecánico me dijo que es la bomba.',
      aiParsed: {
        categoria: 'REPUESTO',
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2019,
        pieza: 'bomba de gasolina',
        confianza: 0.95,
      },
      estado: 'OPEN',
    },
  });

  // Solicitud 2: Juan pide servicio de frenos (IN_PROGRESS)
  const req2 = await prisma.request.create({
    data: {
      userId: client1.id,
      vehicleId: explorer.id,
      categoria: 'TALLER',
      titulo: 'Revisión y cambio de frenos Ford Explorer 2021',
      descripcion:
        'Mi Explorer está haciendo un ruido metálico al frenar, especialmente en reversa. Necesito revisión urgente de frenos delanteros.',
      aiParsed: {
        categoria: 'TALLER',
        marca: 'Ford',
        modelo: 'Explorer',
        anio: 2021,
        servicio: 'servicio de frenos',
        urgencia: 'alta',
        confianza: 0.88,
      },
      estado: 'IN_PROGRESS',
    },
  });

  // Solicitud 3: Juan tuvo un accidente (GRUA, cerrada)
  const req3 = await prisma.request.create({
    data: {
      userId: client1.id,
      vehicleId: hilux.id,
      categoria: 'GRUA',
      titulo: 'Grúa urgente - Autopista Francisco Fajardo',
      descripcion:
        'Se me dañó el vehículo en la autopista Francisco Fajardo a la altura de Chacaíto. Necesito grúa de manera urgente.',
      aiParsed: {
        categoria: 'GRUA',
        ubicacion: 'Autopista Francisco Fajardo, Chacaíto',
        urgencia: 'muy_alta',
        confianza: 0.99,
      },
      estado: 'CLOSED',
    },
  });

  // Solicitud 4: María pide amortiguadores (OPEN)
  const req4 = await prisma.request.create({
    data: {
      userId: client2.id,
      vehicleId: corolla.id,
      categoria: 'REPUESTO',
      titulo: 'Amortiguadores delanteros Toyota Corolla 2020',
      descripcion:
        'Necesito amortiguadores delanteros para mi Corolla 2020. El carro bota mucho en los huecos y ya están muy blandos.',
      aiParsed: {
        categoria: 'REPUESTO',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020,
        pieza: 'amortiguadores delanteros',
        confianza: 0.91,
      },
      estado: 'OPEN',
    },
  });

  // Solicitud 5: María pide cambio de aceite (CLOSED, aceptada)
  const req5 = await prisma.request.create({
    data: {
      userId: client2.id,
      vehicleId: corolla.id,
      categoria: 'TALLER',
      titulo: 'Cambio de aceite y filtros Corolla',
      descripcion:
        'Necesito cambio de aceite sintético y filtros para mi Toyota Corolla 2020. Son 10,000 km desde el último cambio.',
      aiParsed: {
        categoria: 'TALLER',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020,
        servicio: 'cambio de aceite',
        confianza: 0.97,
      },
      estado: 'CLOSED',
    },
  });

  // Solicitud 6: Carlos pide diagnóstico (OPEN)
  const req6 = await prisma.request.create({
    data: {
      userId: client3.id,
      vehicleId: civic.id,
      categoria: 'TALLER',
      titulo: 'Diagnóstico OBD2 - Luz check engine Honda Civic',
      descripcion:
        'Mi Civic 2018 tiene la luz del check engine encendida desde hace 3 días. No sé qué es pero quiero un diagnóstico.',
      aiParsed: {
        categoria: 'TALLER',
        marca: 'Honda',
        modelo: 'Civic',
        anio: 2018,
        servicio: 'diagnóstico computarizado',
        confianza: 0.93,
      },
      estado: 'OPEN',
    },
  });

  // Solicitud 7: Carlos pide bujías (IN_PROGRESS)
  const req7 = await prisma.request.create({
    data: {
      userId: client3.id,
      vehicleId: civic.id,
      categoria: 'REPUESTO',
      titulo: 'Bujías iridium Honda Civic 1.5T',
      descripcion:
        'Quiero cambiar las bujías de mi Civic 2018 1.5 turbo. Tienen 60,000 km y el motor tiene vibración al arrancar.',
      aiParsed: {
        categoria: 'REPUESTO',
        marca: 'Honda',
        modelo: 'Civic',
        anio: 2018,
        pieza: 'bujías iridium',
        confianza: 0.89,
      },
      estado: 'IN_PROGRESS',
    },
  });

  console.log(`✅ Solicitudes creadas (7)`);

  // ─────────────────────────────────────────────────────
  // COTIZACIONES (Quotes)
  // ─────────────────────────────────────────────────────

  // Cotizaciones para req1 (bomba Hilux) - 2 proveedores compiten
  const quote1 = await prisma.quote.create({
    data: {
      requestId: req1.id,
      providerId: provider1.id,
      precio: 85.0,
      comentario:
        'Bomba OEM Toyota disponible en stock. Incluye garantía de 6 meses. Despacho en 24h.',
      tiempoEntrega: '1-2 días hábiles',
      estado: 'PENDING',
    },
  });

  const quote2 = await prisma.quote.create({
    data: {
      requestId: req1.id,
      providerId: provider2.id,
      precio: 62.0,
      comentario:
        'Bomba compatible marca Facet, excelente calidad. 3 meses de garantía. Retiro en tienda o envío.',
      tiempoEntrega: '2-3 días hábiles',
      estado: 'PENDING',
    },
  });

  // Cotización para req2 (frenos Explorer) - taller
  const quote3 = await prisma.quote.create({
    data: {
      requestId: req2.id,
      workshopId: workshop.id,
      precio: 80.0,
      comentario:
        'Servicio de frenos completo. Incluye revisión de discos, cambio de pastillas EBC y sangrado del sistema. Cita disponible mañana.',
      tiempoEntrega: '1 día',
      estado: 'ACCEPTED',
    },
  });

  // Cotización para req3 (grúa - cerrada)
  const quote4 = await prisma.quote.create({
    data: {
      requestId: req3.id,
      precio: 45.0,
      comentario:
        'Grúa disponible. Tiempo estimado de llegada: 20 minutos. Costo base $25 + $2.50/km recorrido.',
      tiempoEntrega: '20 minutos',
      estado: 'ACCEPTED',
    },
  });

  // Cotizaciones para req4 (amortiguadores Corolla)
  const quote5 = await prisma.quote.create({
    data: {
      requestId: req4.id,
      providerId: provider1.id,
      precio: 130.0,
      comentario:
        'Par de amortiguadores delanteros KYB Excel-G para Corolla 2020. Stock disponible.',
      tiempoEntrega: '2-3 días hábiles',
      estado: 'PENDING',
    },
  });

  const quote6 = await prisma.quote.create({
    data: {
      requestId: req4.id,
      workshopId: workshop.id,
      precio: 280.0,
      comentario:
        'Suministro e instalación de amortiguadores Monroe. Incluye alineación gratis. Garantía 1 año.',
      tiempoEntrega: '1-2 días',
      estado: 'PENDING',
    },
  });

  // Cotizaciones para req5 (cambio aceite - cerrada/aceptada)
  const quote7 = await prisma.quote.create({
    data: {
      requestId: req5.id,
      workshopId: workshop.id,
      precio: 25.0,
      comentario: 'Cambio de aceite Castrol Edge 5W-30 + filtro + revisión de niveles. Sin cita.',
      tiempoEntrega: '1 hora',
      estado: 'ACCEPTED',
    },
  });

  // Cotizaciones para req6 (diagnóstico Civic)
  const quote8 = await prisma.quote.create({
    data: {
      requestId: req6.id,
      workshopId: workshop.id,
      precio: 30.0,
      comentario:
        'Diagnóstico OBD2 completo con escáner profesional. Reporte detallado de códigos de falla. Disponible hoy.',
      tiempoEntrega: '2 horas',
      estado: 'PENDING',
    },
  });

  // Cotizaciones para req7 (bujías Civic)
  const quote9 = await prisma.quote.create({
    data: {
      requestId: req7.id,
      providerId: provider1.id,
      precio: 38.0,
      comentario: 'Set 4 bujías NGK Iridium para Civic 1.5T. Recomendadas por el fabricante.',
      tiempoEntrega: '1 día hábil',
      estado: 'ACCEPTED',
    },
  });

  const quote10 = await prisma.quote.create({
    data: {
      requestId: req7.id,
      providerId: provider2.id,
      precio: 34.0,
      comentario: 'Bujías NGK compatibles. Buen precio, disponibles en nuestro local.',
      tiempoEntrega: '2 días hábiles',
      estado: 'PENDING',
    },
  });

  console.log(`✅ Cotizaciones creadas (10)`);

  // ─────────────────────────────────────────────────────
  // MENSAJES (Chat de solicitudes)
  // ─────────────────────────────────────────────────────

  // Mensajes en req1 (bomba Hilux)
  await prisma.message.createMany({
    data: [
      {
        requestId: req1.id,
        senderId: client1.id,
        message: 'Hola, ¿tienen disponibilidad inmediata? Necesito la bomba urgente.',
        isAI: false,
      },
      {
        requestId: req1.id,
        senderId: provUser1.id,
        message:
          'Buenos días Juan, sí tenemos stock. La bomba es OEM Toyota, con 6 meses de garantía. ¿Prefieres despacho o retiras tú?',
        isAI: false,
      },
      {
        requestId: req1.id,
        senderId: client1.id,
        message: '¿Pueden instalármela también? Preferiría no llevarla a otro lado.',
        isAI: false,
      },
      {
        requestId: req1.id,
        senderId: provUser1.id,
        message:
          'La instalación la hacemos nosotros mismos o podemos referirte a Taller Elite Motors que está a 2km. ¿Te parece?',
        isAI: false,
      },
    ],
  });

  // Mensajes en req2 (frenos Explorer) con IA
  await prisma.message.createMany({
    data: [
      {
        requestId: req2.id,
        senderId: client1.id,
        message:
          'IA, ¿qué podría ser ese ruido metálico al frenar? ¿Es peligroso seguir manejando?',
        isAI: false,
      },
      {
        requestId: req2.id,
        senderId: admin.id,
        message:
          '🤖 El ruido metálico al frenar generalmente indica que las pastillas de freno están completamente desgastadas y el metal está rozando con el disco. Esto es peligroso: puede dañar los discos y aumentar la distancia de frenado. Recomiendo NO manejar el vehículo hasta hacer la revisión. El Taller Elite Motors puede atenderte hoy.',
        isAI: true,
      },
      {
        requestId: req2.id,
        senderId: workshopUser.id,
        message:
          'Confirmo lo del asistente. Tenemos cita disponible para las 10am mañana. ¿Te confirmo?',
        isAI: false,
      },
      {
        requestId: req2.id,
        senderId: client1.id,
        message: 'Perfecto, confirmado para las 10am. Muchas gracias.',
        isAI: false,
      },
    ],
  });

  // Mensajes en req6 (diagnóstico Civic)
  await prisma.message.createMany({
    data: [
      {
        requestId: req6.id,
        senderId: client3.id,
        message: '¿El diagnóstico incluye borrar los códigos de error o solo leerlos?',
        isAI: false,
      },
      {
        requestId: req6.id,
        senderId: admin.id,
        message:
          '🤖 El diagnóstico OBD2 incluye lectura de todos los códigos de falla actuales y pendientes, identificación de los sistemas afectados, y un reporte detallado. El borrado de códigos se incluye solo después de reparar la falla para verificar que no regresa.',
        isAI: true,
      },
      {
        requestId: req6.id,
        senderId: workshopUser.id,
        message:
          'Exacto, así trabajamos nosotros. El diagnóstico toma aprox 45 minutos. ¿Puedes venir esta tarde?',
        isAI: false,
      },
    ],
  });

  console.log(`✅ Mensajes creados`);

  // ─────────────────────────────────────────────────────
  // RESUMEN FINAL
  // ─────────────────────────────────────────────────────
  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('  Admin:      admin@repuestoia.com / admin123');
  console.log('  Cliente 1:  juan@demo.com / client123');
  console.log('  Cliente 2:  maria@demo.com / client123');
  console.log('  Cliente 3:  carlos@demo.com / client123');
  console.log('  Proveedor:  autopartes@demo.com / prov123');
  console.log('  Proveedor2: repuestos_norte@demo.com / prov123');
  console.log('  Taller:     taller_elite@demo.com / workshop123');
  console.log('  Grúa:       gruas_rapid@demo.com / tow123');
  console.log('\n📊 Datos creados:');
  console.log('  - 8 usuarios (1 admin, 3 clientes, 2 proveedores, 1 taller, 1 grúa)');
  console.log('  - 4 vehículos');
  console.log('  - 10 repuestos en catálogo');
  console.log('  - 7 solicitudes (variedad de estados y categorías)');
  console.log('  - 10 cotizaciones (PENDING, ACCEPTED)');
  console.log('  - 11 mensajes de chat (incluyendo respuestas de IA)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
