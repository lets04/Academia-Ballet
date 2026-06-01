# 💻 Guía de Uso - Ejemplos de Código

## Autenticación

### Acceder al usuario actual
```typescript
import { useAuth } from '@/contexts/auth';

export function MyComponent() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Bienvenido: {user?.email}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
```

## Tema Oscuro/Claro

### Toggle de tema
```typescript
import { useTheme } from '@/contexts/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Modo: {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

## Sucursales

### Usar selector de sucursal
```typescript
import { useBranch } from '@/contexts/branch';

export function BranchSelector() {
  const { branches, selectedBranchId, selectBranch } = useBranch();

  return (
    <select value={selectedBranchId || ''} onChange={(e) => selectBranch(e.target.value || null)}>
      <option value="">Todas</option>
      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
}
```

## Estudiantes

### Listar estudiantes
```typescript
import { studentService } from '@/services/students.service';
import { useState, useEffect } from 'react';

export function StudentList() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.list(true); // true = solo activos
        setStudents(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div>
      {isLoading ? <p>Cargando...</p> : (
        <ul>
          {students.map(s => <li key={s.id}>{s.full_name}</li>)}
        </ul>
      )}
    </div>
  );
}
```

### Crear estudiante
```typescript
import { studentService } from '@/services/students.service';
import { CreateStudentForm } from '@/types/forms';

const form: CreateStudentForm = {
  full_name: 'Juan Pérez',
  document_number: '12345678',
  birth_date: '2010-05-15',
  phone: '3123456789',
  guardian_name: 'María Pérez',
  guardian_phone: '3123456790',
  notes: 'Estudiante de ballet básico'
};

try {
  const newStudent = await studentService.create(form);
  console.log('Estudiante creado:', newStudent);
} catch (error) {
  console.error('Error al crear:', error);
}
```

### Buscar estudiante
```typescript
const results = await studentService.search('Juan');
// Busca en nombre y documento
```

## Grupos

### Listar grupos por sucursal
```typescript
import { groupService } from '@/services/group.service';

const groups = await groupService.list(branchId);
// Si no pasas branchId, devuelve todos
```

### Crear grupo
```typescript
import { groupService } from '@/services/group.service';
import { CreateGroupForm } from '@/types/forms';

const form: CreateGroupForm = {
  branch_id: 'north-branch-id',
  name: 'Ballet Básico Mañana',
  schedule: 'Lunes a Viernes 9:00 AM'
};

const newGroup = await groupService.create(form);
```

## Inscripciones

### Inscribir estudiante
```typescript
import { enrollmentService } from '@/services/enrollment.service';

const enrollment = await enrollmentService.create({
  student_id: 'student-id',
  group_id: 'group-id',
  monthly_fee: 250 // Bolivianos
});
```

### Transferir estudiante
```typescript
const result = await enrollmentService.transfer({
  student_id: 'student-id',
  current_enrollment_id: 'current-enr-id',
  new_group_id: 'new-group-id',
  new_monthly_fee: 300
});

console.log('Inscripción anterior:', result.oldEnrollment);
console.log('Inscripción nueva:', result.newEnrollment);
```

## Pagos

### Registrar pago
```typescript
import { paymentService } from '@/services/payment.service';

const payment = await paymentService.create({
  enrollment_id: 'enrollment-id',
  student_id: 'student-id',
  amount: 250,
  payment_date: '2026-06-01',
  month: '2026-06', // YYYY-MM
  notes: 'Pago de mensualidad'
});
```

### Obtener estado de mes
```typescript
const status = await paymentService.getMonthlyStatus(
  enrollmentId,
  '2026-06'
);

console.log(status); // { status: 'paid', totalPaid: 250, totalDue: 250 }
```

### Calcular deuda total
```typescript
const income = await paymentService.getTotalMonthlyIncome('2026-06', branchId);
const debt = await paymentService.getPendingDebt(branchId);

console.log(`Ingresos: Bs. ${income}`);
console.log(`Deuda pendiente: Bs. ${debt}`);
```

## Egresos

### Registrar egreso
```typescript
import { expenseService } from '@/services/expense.service';

const expense = await expenseService.create({
  branch_id: 'branch-id',
  title: 'Arriendo local',
  amount: 2000,
  expense_date: '2026-06-01',
  notes: 'Arriendo mes de junio'
});
```

### Obtener egresos del mes
```typescript
const expenses = await expenseService.list(branchId, '2026-06');
const total = await expenseService.getTotalMonthlyExpenses('2026-06', branchId);

console.log(`Total egresos: Bs. ${total}`);
```

## Componentes UI

### Botón
```typescript
import { Button } from '@/components/ui/button';

<Button variant="primary" size="md">
  Guardar
</Button>

// Variantes: default, secondary, danger, success, warning, outline, ghost
// Tamaños: default, sm, lg
```

### Input
```typescript
import { InputField } from '@/components/ui/input-field';

<InputField
  label="Nombre"
  placeholder="Ingrese nombre"
  error={errors.name}
  helperText="Máximo 255 caracteres"
/>
```

### Select
```typescript
import { SelectField } from '@/components/ui/select-field';

<SelectField
  label="Sucursal"
  placeholder="Seleccione sucursal"
  options={[
    { value: '1', label: 'Norte' },
    { value: '2', label: 'Centro' }
  ]}
  error={errors.branch}
/>
```

### Modal
```typescript
import { Modal } from '@/components/ui/modal';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Abrir Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Título del Modal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Guardar
            </Button>
          </>
        }
      >
        <p>Contenido del modal</p>
      </Modal>
    </>
  );
}
```

### Tabla
```typescript
import { Table, Column } from '@/components/ui/table';

interface Student {
  id: string;
  full_name: string;
  phone: string;
}

const columns: Column<Student>[] = [
  { key: 'full_name', header: 'Nombre' },
  { 
    key: 'phone', 
    header: 'Teléfono',
    render: (value) => value || 'N/A'
  }
];

<Table<Student>
  columns={columns}
  data={students}
  isLoading={isLoading}
  emptyMessage="No hay estudiantes"
  onRowClick={(student) => console.log(student)}
/>
```

## Notificaciones (Próximamente)

### Hook de notificaciones
```typescript
import { useNotification } from '@/hooks/useNotification';

export function MyComponent() {
  const { success, error, warning, info } = useNotification();

  return (
    <div>
      <button onClick={() => success('¡Guardado exitosamente!')}>
        Mostrar éxito
      </button>
      <button onClick={() => error('Error al guardar', 3000)}>
        Mostrar error
      </button>
    </div>
  );
}
```

## Patrones Comunes

### Cargar datos al montar componente
```typescript
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await someService.getData();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  return <div>{JSON.stringify(data)}</div>;
}
```

### Filtro con sucursal
```typescript
import { useBranch } from '@/contexts/branch';
import { useEffect, useState } from 'react';

export function FilteredList() {
  const { selectedBranchId } = useBranch();
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      const filtered = await someService.list(selectedBranchId);
      setData(filtered);
    };

    load();
  }, [selectedBranchId]); // Recarga cuando cambia la sucursal

  return <div>{/* render data */}</div>;
}
```

---

Para más información, consulta la documentación del proyecto o los archivos de servicios.
