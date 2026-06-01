# 🎭 Academia Ballet - Sistema de Gestión

Sistema completo de gestión administrativa para academias de ballet, permitiendo manejar estudiantes, grupos, inscripciones, pagos y egresos de forma centralizada.

## ✨ Características Principales

### 1. **Autenticación Segura**
- Login con email y contraseña usando Supabase Auth
- Dos usuarios administradores con permisos totales
- Gestión de sesiones automática

### 2. **Gestión de Sucursales**
- Soporte para múltiples sucursales (Norte y Centro)
- Filtrado de información por sucursal
- Vista global y por sucursal

### 3. **Gestión de Estudiantes**
- Registro de estudiantes con datos completos
- Búsqueda por nombre o documento
- Información de tutores
- Estado activo/inactivo

### 4. **Gestión de Grupos**
- Creación de grupos por sucursal
- Horarios flexibles
- Seguimiento de estudiantes por grupo

### 5. **Inscripciones**
- Inscribir estudiantes a grupos
- Mensualidades personalizadas por estudiante
- Transferencias entre grupos/sucursales
- Historial completo de movimientos

### 6. **Gestión de Pagos**
- Registro de pagos mensuales
- Cálculo automático de deudas
- Estados: Pagado, Parcial, Pendiente
- Historial completo de pagos

### 7. **Gestión de Egresos**
- Registro de gastos por sucursal
- Categorización flexible
- Reportes por período

### 8. **Dashboard Inteligente**
- Indicadores en tiempo real
- Estudiantes activos
- Ingresos del mes
- Egresos del mes
- Deuda total pendiente
- Filtrable por sucursal

### 9. **Tema Oscuro/Claro**
- Soporte para modo día y noche
- Persiste en localStorage
- Diseño responsive

## 🎨 Diseño Visual

### Colores Corporativos
- **Fucsia Intenso (#E11D8A)**: Botones y acciones principales
- **Azul Vibrante (#2563EB)**: Acciones secundarias
- **Verde (#22C55E)**: Estados activos y pagos realizados
- **Amarillo (#EAB308)**: Advertencias y pagos parciales
- **Rojo (#EF4444)**: Deudas y errores

### Modo Día
- Fondo gris muy claro (#F8FAFC)
- Superficies blancas (#FFFFFF)
- Texto principal oscuro (#0F172A)

### Modo Noche
- Fondo oscuro (#020617)
- Sidebars en azul oscuro (#0F172A)
- Texto claro (#F8FAFC)

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd frontend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Luego edita `.env.local` con tus credenciales de Supabase:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Configurar Supabase**
   - Ver [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para crear las tablas
   - Crear dos usuarios administradores en Supabase Auth

5. **Iniciar desarrollo**
   ```bash
   npm run dev
   ```

6. **Construir para producción**
   ```bash
   npm run build
   ```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/              # Componentes base (Button, Input, etc)
│   │   ├── sidebar.tsx      # Navegación lateral
│   │   ├── topbar.tsx       # Barra superior
│   │   └── protected-route.tsx # Protección de rutas
│   ├── contexts/            # React Contexts
│   │   ├── auth.tsx         # Contexto de autenticación
│   │   ├── theme.tsx        # Contexto de tema
│   │   └── branch.tsx       # Contexto de sucursales
│   ├── hooks/               # Custom hooks
│   │   └── useNotification.ts # Hook de notificaciones
│   ├── layouts/             # Layouts principales
│   │   └── dashboard-layout.tsx
│   ├── pages/               # Páginas de la aplicación
│   │   ├── login-page.tsx
│   │   ├── dashboard-page.tsx
│   │   ├── students-page.tsx (próximamente)
│   │   └── ...
│   ├── services/            # Servicios CRUD
│   │   ├── branch.service.ts
│   │   ├── students.service.ts
│   │   ├── group.service.ts
│   │   ├── enrollment.service.ts
│   │   ├── payment.service.ts
│   │   └── expense.service.ts
│   ├── types/               # Tipos TypeScript
│   │   ├── index.ts
│   │   ├── forms.ts
│   │   └── student.ts
│   ├── lib/                 # Utilidades
│   │   ├── supabase.ts      # Cliente Supabase
│   │   └── utils.ts         # Funciones auxiliares
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Entrada de la aplicación
│   └── index.css            # Estilos globales
├── public/                  # Archivos estáticos
├── tailwind.config.ts       # Configuración de Tailwind
├── vite.config.ts           # Configuración de Vite
├── tsconfig.json            # Configuración de TypeScript
├── package.json             # Dependencias
└── SUPABASE_SETUP.md        # Guía de configuración de BD
```

## 🔄 Flujo de Desarrollo

### Página de Login
1. Usuario ingresa email y contraseña
2. Supabase valida credenciales
3. Se establece sesión
4. Se redirige al dashboard

### Dashboard
1. Muestra estadísticas en tiempo real
2. Selector de sucursal en el topbar
3. Acciones rápidas para crear registros
4. Información filtrada por sucursal seleccionada

### Gestión de Datos
- Los servicios se conectan directamente con Supabase
- Los datos se cargan bajo demanda
- Se mantiene sincronización automática

## 🎯 Próximas Funcionalidades

- [ ] Página de Gestión de Estudiantes
- [ ] Página de Gestión de Grupos
- [ ] Página de Gestión de Inscripciones
- [ ] Página de Gestión de Pagos
- [ ] Página de Gestión de Egresos
- [ ] Historial de Estudiante
- [ ] Reportes avanzados
- [ ] Exportación a Excel/PDF
- [ ] Notificaciones de deudas
- [ ] Sistema de roles más granulares

## 🛠️ Tecnologías Utilizadas

- **React 18** - Framework de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool moderno
- **Tailwind CSS** - Framework de estilos
- **Supabase** - Backend as a Service
- **React Router v6** - Enrutamiento
- **Clsx & TailwindMerge** - Utilidades CSS

## 📝 Scripts Disponibles

```bash
npm run dev      # Inicia servidor de desarrollo
npm run build    # Construye para producción
npm run preview  # Previsualiza build
npm run lint     # Ejecuta linter
```

## 🔐 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) en base de datos
- Variables de entorno protegidas
- Rutas protegidas con ProtectedRoute
- HTTPS en producción (recomendado)

## 📞 Soporte

Para preguntas o problemas:
1. Revisar [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. Verificar configuración de variables de entorno
3. Consultar la documentación oficial de Supabase

## 📄 Licencia

Este proyecto es propietario de Academia Ballet.

---

**Versión:** 1.0.0  
**Última actualización:** 2026-06-01  
**Desarrollado con ❤️ para Academia Ballet**
