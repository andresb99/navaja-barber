'use client';

import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { upsertCourseSessionAction } from '@/app/admin/actions';

interface CourseOption {
  id: string;
  title: string;
}

export function AdminCourseSessionForm({ courses }: { courses: CourseOption[] }) {
  return (
    <form action={upsertCourseSessionAction} className="mt-4 grid gap-3">
      <Select
        name="course_id"
        aria-label="Curso"
        label="Curso"
        labelPlacement="inside"
        placeholder="Selecciona curso"
        isRequired
      >
        {courses.map((item) => (
          <SelectItem key={String(item.id)}>{String(item.title)}</SelectItem>
        ))}
      </Select>
      <Input
        id="course-session-start-at"
        name="start_at"
        type="datetime-local"
        label="Inicio"
        labelPlacement="inside"
        classNames={{
          input: 'temporal-placeholder-hidden',
        }}
        required
      />
      <Input
        name="capacity"
        type="number"
        label="Capacidad"
        labelPlacement="inside"
        defaultValue="10"
        required
      />
      <Input name="location" label="Lugar" labelPlacement="inside" required />
      <Select
        name="status"
        aria-label="Estado de sesion"
        label="Estado"
        labelPlacement="inside"
        defaultSelectedKeys={['scheduled']}
      >
        <SelectItem key="scheduled">Programada</SelectItem>
        <SelectItem key="cancelled">Cancelada</SelectItem>
        <SelectItem key="completed">Finalizada</SelectItem>
      </Select>
      <Button type="submit" className="action-primary w-fit px-5 text-sm font-semibold">
        Guardar sesion
      </Button>
    </form>
  );
}
