export interface PublicMarketingAction {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
}

export interface PublicMarketingStat {
  label: string;
  value: string;
  detail?: string;
}

export interface PublicMarketingTextBlock {
  title: string;
  description: string;
}

export interface PublicMarketingRoute extends PublicMarketingTextBlock {
  href: string;
}

export interface PublicMarketingFaq {
  question: string;
  answer: string;
}

export const publicMarketingHomeHero = {
  eyebrow: 'Software para barberias',
  title: 'Agenda, pagos, staff y crecimiento en una sola plataforma para barberias.',
  description:
    'Beardly unifica reservas online, checkout, operacion diaria, cursos, marketplace y seguimiento del negocio sin depender de planillas ni mensajes sueltos.',
  actions: [
    { href: '/software-para-barberias', label: 'Ver la plataforma' },
    { href: '/shops', label: 'Explorar marketplace', variant: 'secondary' },
    {
      href: '/agenda-para-barberos',
      label: 'Ver agenda para barberos',
      variant: 'secondary',
    },
  ] as const satisfies readonly PublicMarketingAction[],
  stats: [
    {
      label: 'Flujo publico',
      value: 'Reservas con pago online o en local',
    },
    {
      label: 'Multi workspace',
      value: 'Admin y staff operando desde web y mobile',
    },
    {
      label: 'Growth',
      value: 'Marketplace, cursos y bolsa de trabajo',
    },
  ] as const satisfies readonly PublicMarketingStat[],
} as const;

export const publicMarketingHomeCapabilityGroups = [
  {
    title: 'Reservas y pagos',
    points: [
      'Checkout online o pago en local en el mismo flujo.',
      'Disponibilidad real por barbero, horario laboral y bloqueos.',
      'Reembolsos cuando el local cancela una cita pagada.',
    ],
  },
  {
    title: 'Operacion diaria',
    points: [
      'Agenda por staff, estados de cita y seguimiento de no-shows.',
      'Panel admin con metricas, ausencias y notificaciones del equipo.',
      'Paridad web y mobile para manejar barberias activas.',
    ],
  },
  {
    title: 'Crecimiento',
    points: [
      'Marketplace publico, perfiles de local y resenas verificadas.',
      'Bolsa de trabajo, cursos y convocatorias de modelos.',
      'Contenido indexable para captar reservas y nuevos clientes.',
    ],
  },
] as const;

export const publicMarketingHomeOperationalStages = [
  {
    title: 'Antes de la cita',
    description:
      'Captacion desde marketplace, disponibilidad real, checkout y validacion final del horario antes de cerrar la reserva.',
  },
  {
    title: 'Durante la operacion',
    description:
      'Staff, bloqueos, ausencias, estados de cita, payment status y vista clara de lo que queda pendiente.',
  },
  {
    title: 'Despues de la cita',
    description:
      'Resenas, metricas, reembolsos cuando corresponde y mas visibilidad sobre conversion y cancelaciones.',
  },
  {
    title: 'Expansion',
    description:
      'Cursos, convocatorias de modelos y postulaciones para hacer crecer la barberia desde la misma base de datos operativa.',
  },
] as const satisfies readonly PublicMarketingTextBlock[];

export const publicMarketingHomeKeyRoutes = [
  {
    href: '/software-para-barberias',
    title: 'Software para barberias',
    description: 'Explica agenda, staff, operaciones, pagos y crecimiento con enfoque B2B.',
  },
  {
    href: '/agenda-para-barberos',
    title: 'Agenda para barberos',
    description: 'Landing enfocada en disponibilidad, ocupacion, performance y trabajo diario del equipo.',
  },
  {
    href: '/shops',
    title: 'Marketplace de barberias',
    description: 'Descubre locales activos, perfiles publicos y reservas online por tenant.',
  },
  {
    href: '/suscripcion',
    title: 'Planes',
    description: 'Revisa cobros, upgrades y despliegue comercial de la plataforma.',
  },
] as const satisfies readonly PublicMarketingRoute[];

export const publicMarketingSoftwareHero = {
  eyebrow: 'Plataforma SaaS',
  title: 'Software para barberias con agenda, pagos, staff y crecimiento.',
  description:
    'Beardly centraliza reservas, agenda operativa, cobros, marketplace, cursos y seguimiento del negocio para que una barberia no dependa de herramientas sueltas.',
  actions: [
    { href: '/suscripcion', label: 'Ver planes' },
    { href: '/shops', label: 'Ver marketplace', variant: 'secondary' },
  ] as const satisfies readonly PublicMarketingAction[],
  stats: [
    {
      label: 'Checkout',
      value: 'Pago online o en local dentro del mismo flujo',
    },
    {
      label: 'Operacion',
      value: 'Admin y staff gestionando citas, horarios y bloqueos',
    },
    {
      label: 'Growth',
      value: 'Marketplace, bolsa de trabajo y cursos',
    },
  ] as const satisfies readonly PublicMarketingStat[],
} as const;

export const publicMarketingSoftwareSections = [
  {
    title: 'Reservas y pagos',
    description:
      'Permite reservas online por barberia, staff y servicio. Si el cliente no marca pagar en el local, el flujo abre checkout online con validacion final del horario.',
  },
  {
    title: 'Operacion del local',
    description:
      'Agenda diaria, bloqueos, ausencias, estados de cita, no-shows, metricas y control operativo para admins y staff desde web y mobile.',
  },
  {
    title: 'Crecimiento del negocio',
    description:
      'Marketplace publico, resenas verificadas, bolsa de trabajo, cursos y captacion de modelos sobre la misma base de datos del local.',
  },
] as const satisfies readonly PublicMarketingTextBlock[];

export const publicMarketingSoftwareFaqs = [
  {
    question: 'Sirve si mi barberia cobra online y tambien acepta pago en el local?',
    answer:
      'Si. El flujo soporta ambas opciones dentro de la misma reserva. Si el cliente no marca pagar en el local, pasa por checkout online.',
  },
  {
    question: 'Puedo manejar varias barberias o varios equipos?',
    answer:
      'Si. La plataforma ya trabaja con workspaces, roles y contexto activo por barberia tanto en web como en mobile.',
  },
  {
    question: 'Que pasa si el local cancela una cita pagada?',
    answer:
      'La plataforma procesa el reembolso automaticamente por defecto y deja trazabilidad del estado del pago en citas y payment intents.',
  },
] as const satisfies readonly PublicMarketingFaq[];

export const publicMarketingAgendaHero = {
  eyebrow: 'Operacion diaria',
  title: 'Agenda para barberos con disponibilidad real y menos friccion operativa.',
  description:
    'Beardly conecta disponibilidad por staff, estados de cita, bloqueos, ausencias, cobros y rendimiento para que la agenda no se rompa entre web, mobile y mostrador.',
  actions: [
    { href: '/shops', label: 'Probar reservas' },
    {
      href: '/software-para-barberias',
      label: 'Ver plataforma completa',
      variant: 'secondary',
    },
  ] as const satisfies readonly PublicMarketingAction[],
} as const;

export const publicMarketingAgendaWorkflowSteps = [
  'Publica servicios, staff y horarios laborales por barberia.',
  'El cliente reserva online y el sistema revalida el slot antes de crear la cita.',
  'Admin y staff actualizan estados, cobran en local o siguen pagos online.',
  'La barberia revisa metricas, cancelaciones, refunds y rendimiento por barbero.',
] as const;

export const publicMarketingAgendaBenefits = [
  {
    title: 'Disponibilidad',
    description:
      'Horarios laborales, tiempo de servicio, bloqueos y citas activas se combinan para calcular disponibilidad real por barbero.',
  },
  {
    title: 'Estados de cita',
    description:
      'Pendiente, confirmada, cancelada, no-show o realizada, con visibilidad del estado del pago y devoluciones cuando el local cancela.',
  },
  {
    title: 'Rendimiento',
    description:
      'Ticket promedio, facturacion, ocupacion y desempeno por barbero para ajustar capacidad y turnos de mayor demanda.',
  },
] as const satisfies readonly PublicMarketingTextBlock[];

export const publicMarketingSubscriptionHero = {
  eyebrow: 'Suscripcion',
  title: 'Gestiona tu suscripcion desde la cuenta',
  description:
    'Compara Free, Pro y Business. La suscripcion vive en tu cuenta y, si tienes una barberia administrable seleccionada, puedes iniciar el checkout desde esta pantalla.',
} as const;
