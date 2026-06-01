# Configuración de Supabase para Academia Ballet

Este documento contiene la configuración completa de la base de datos utilizada por el sistema administrativo de BAFOLDANZ.

## Pasos de Configuración

### 1. Crear proyecto en Supabase

1. Crear una cuenta en Supabase.
2. Crear un nuevo proyecto.
3. Obtener las credenciales desde:

Settings → API

4. Configurar el archivo `.env`

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxx
```

---

## Modelo de Base de Datos

### Tabla: branches

Representa las sucursales de la academia.

```sql
create table branches (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz default now()
);
```

Datos iniciales:

```sql
insert into branches(name)
values
('Norte'),
('Centro');
```

---

### Tabla: students

Información personal de los estudiantes.

```sql
create table students (
    id uuid primary key default gen_random_uuid(),

    full_name text not null,

    document_number text,

    birth_date date,

    phone text,

    guardian_name text,

    guardian_phone text,

    notes text,

    is_active boolean default true,

    created_at timestamptz default now()
);
```

---

### Tabla: groups

Representa los grupos y horarios de cada sucursal.

```sql
create table groups (
    id uuid primary key default gen_random_uuid(),

    branch_id uuid not null
        references branches(id),

    name text not null,

    schedule text not null,

    is_active boolean default true,

    created_at timestamptz default now()
);
```

Ejemplos:

* Grupo 67
* Grupo 45
* Grupo Infantil

---

### Tabla: enrollments

Relaciona estudiantes con grupos.

La mensualidad se almacena aquí porque cada estudiante puede tener un monto distinto.

```sql
create table enrollments (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references students(id),

    group_id uuid not null
        references groups(id),

    monthly_fee numeric(10,2) not null,

    start_date date not null default current_date,

    end_date date,

    is_active boolean default true,

    created_at timestamptz default now()
);
```

---

### Tabla: payment_periods

Representa cada mensualidad generada.

```sql
create table payment_periods (
    id uuid primary key default gen_random_uuid(),

    enrollment_id uuid not null
        references enrollments(id),

    month integer not null check (month between 1 and 12),

    year integer not null,

    total_amount numeric(10,2) not null,

    created_at timestamptz default now()
);
```

Ejemplo:

* Junio 2026
* Julio 2026

---

### Tabla: payments

Permite registrar pagos parciales o completos.

```sql
create table payments (
    id uuid primary key default gen_random_uuid(),

    payment_period_id uuid not null
        references payment_periods(id),

    amount numeric(10,2) not null,

    payment_date timestamptz default now(),

    payment_method text,

    notes text
);
```

Ejemplo:

Mensualidad: 300 Bs

Pago 1: 100 Bs
Pago 2: 200 Bs

Saldo pendiente: 0 Bs

---

### Tabla: expenses

Permite registrar egresos de la academia.

```sql
create table expenses (
    id uuid primary key default gen_random_uuid(),

    branch_id uuid not null
        references branches(id),

    title text not null,

    amount numeric(10,2) not null,

    expense_date date default current_date,

    notes text,

    created_at timestamptz default now()
);
```

Ejemplos:

* Alquiler
* Servicios básicos
* Publicidad
* Vestuario
* Profesor
* Otros

---

## Índices

```sql
create index idx_groups_branch
on groups(branch_id);

create index idx_enrollments_student
on enrollments(student_id);

create index idx_enrollments_group
on enrollments(group_id);

create index idx_payment_periods_enrollment
on payment_periods(enrollment_id);

create index idx_payments_period
on payments(payment_period_id);

create index idx_expenses_branch
on expenses(branch_id);
```

---

## Row Level Security (RLS)

Habilitar RLS en todas las tablas:

```sql
alter table branches enable row level security;
alter table students enable row level security;
alter table groups enable row level security;
alter table enrollments enable row level security;
alter table payment_periods enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
```

Política inicial para usuarios autenticados:

```sql
create policy "Authenticated users full access"
on branches
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on students
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on groups
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on enrollments
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on payment_periods
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on payments
for all
using (auth.role() = 'authenticated');

create policy "Authenticated users full access"
on expenses
for all
using (auth.role() = 'authenticated');
```

---

## Autenticación

El sistema utilizará Supabase Auth mediante correo y contraseña.

Usuarios iniciales:

* [admin1@academia.com](mailto:admin1@academia.com)
* [admin2@academia.com](mailto:admin2@academia.com)

Ambos tendrán permisos administrativos completos.

---

## Estructura del Sistema

Módulos incluidos en la primera versión:

* Dashboard
* Estudiantes
* Grupos
* Inscripciones
* Pagos parciales
* Egresos
* Sucursales
* Login

Funcionalidades futuras:

* Asistencia por QR
* Reportes avanzados
* Exportación a Excel
* Historial de auditoría
* Credenciales digitales

```
```
