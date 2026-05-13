export type Lang = "en" | "es";

const en = {
  "nav.home": "Home",
  "nav.schedule": "Schedule",
  "nav.tasks": "Tasks",
  "nav.clients": "Clients",
  "nav.family": "Family",
  "nav.team": "Team",
  "nav.notifications": "Alerts",
  "nav.messages": "Messages",
  "nav.me": "Me",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancelar",
  "common.back": "Atrás",
  "common.loading": "Cargando...",
  "common.required": "obligatorio",
  "common.optional": "opcional",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.confirm": "Confirmar",
  "common.yes": "Sí",
  "common.no": "No",
  "common.add": "Agregar",
  "auth.title": "Carer Vista Pro",
  "auth.signInTitle": "Inicie sesión en su cuenta",
  "auth.signUpTitle": "Cree su cuenta de implementación pública",
  "auth.fullName": "Nombre completo",
  "auth.email": "Correo electrónico",
  "auth.password": "Contraseña",
  "auth.signIn": "Iniciar sesión",
  "auth.signingIn": "Iniciando sesión...",
  "auth.createAccount": "Crear cuenta",
  "auth.creating": "Creando...",
  "auth.forgotPassword": "¿Olvidó su contraseña?",
  "auth.newDeployment": "¿Nueva implementación? Cree la primera cuenta",
  "auth.alreadyHaveAccount": "¿Ya tiene una cuenta? Inicie sesión",
  "auth.checkEmail": "Revise su correo electrónico para confirmar su cuenta, luego regrese para finalizar la configuración.",
  "auth.errors.fullNameRequired": "Se requiere el nombre completo.",
  "setup.title": "Bienvenido a Carer Vista Pro",
  "setup.subtitle": "Configuremos el espacio de trabajo de su agencia",
  "me.title": "Mi cuenta",
  "me.email": "Correo electrónico",
  "me.phone": "Teléfono",
  "me.organization": "Organización",
  "me.notSet": "No establecido",
  "me.signOut": "Cerrar sesión",
  "me.helpAndHowTo": "Ayuda y guía",
  "me.myInvoices": "Mis facturas",
  "me.payroll": "Nómina",
  "me.manageTeam": "Administrar equipo",
  "me.clientsAndGeofence": "Clientes y geocerca",
  "me.familyAccess": "Acceso familiar",
  "me.homeInfo": "Información del hogar",
  "me.settings": "Configuración",
  "me.language": "Idioma",
  "me.languageEn": "English",
  "me.languageEs": "Español",
  "me.languageSubtitle": "Los cambios surten efecto al recargar la página.",
  "pay.thisPeriod": "Este período de pago",
  "pay.lastPeriod": "Período anterior",
  "pay.runsFriToFri": "Los períodos van de viernes a viernes, se cierran a las 9 PM.",
  "pay.viewAll": "Ver todo →",
  "pay.hours": "h",
  "shift.scheduled": "Programado",
  "shift.notYetStarted": "Aún no comenzado",
  "shift.inProgress": "En curso",
  "shift.completed": "Completado",
  "shift.flagged": "Marcado",
  "shift.client": "Cliente",
  "shift.caregiver": "Cuidador",
  "shift.location": "Ubicación",
  "shift.bonus": "Bono",
  "shift.pay": "Pago",
  "shift.checkIn": "Registrar entrada",
  "shift.checkOut": "Registrar salida",
  "shift.tasks": "Tareas",
  "shift.viewAllTasks": "Ver las {n} tareas →",
  "shift.handoffNote": "Nota de relevo",
  "shift.handoffNoteFromLast": "Nota del último turno",
  "shift.handoffNotePlaceholder": "¿Algo que el próximo cuidador deba saber? (opcional)",
  "shift.leaveHandoffNote": "Dejar una nota para el próximo cuidador",
  "shift.viewedBy": "Visto por {name}",
  "shift.notYetViewed": "Aún no visto",
  "help.title": "Ayuda",
  "help.backLink": "← Atrás",
  "messages.title": "Mensajes",
  "messages.newMessage": "Nuevo mensaje",
  "messages.send": "Enviar",
  "messages.typeMessage": "Escribir un mensaje...",
  "schedule.title": "Horario",
  "schedule.today": "Hoy",
  "schedule.tomorrow": "Mañana",
  "schedule.upcoming": "Próximos",
  "schedule.past": "Pasados",
  "schedule.noShifts": "No hay turnos programados.",
  "schedule.newShift": "Nuevo turno",
  "role.admin": "Administrador",
  "role.client": "Cliente",
  "'role.caregiver": "Cuidador",
  "'role.family": "Familia",
};

const dictionaries: Record<Lang, Record<string, string>> = {
  en,
  es,
};

export function t(
  key: TranslationKey,
  lang: Lang = "en",
  vars?: Record<string, string | number>
): string {
  let s = (dictionaries[lang] as any)?.[key] ?? (en as any)[key];
  if (!s) return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

export function useTranslation() {
  const lang = "en"; 
  return { t: (key: TranslationKey, vars?: Record<string, string | number>) => t(key, lang, vars), lang };
}

export type { TranslationKey };
