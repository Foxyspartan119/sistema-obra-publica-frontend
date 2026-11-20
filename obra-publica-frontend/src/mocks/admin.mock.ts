import type { UserRole } from '../types/obra.types';

export type AccountStatus = 'ACTIVO' | 'SUSPENDIDO';

export interface AdminUserRecord {
    id: number;
    nombre: string;
    area: string;
    correo: string;
    rol: UserRole;
    obrasAsignadas: string[];
    estado: AccountStatus;
    tieneHistorialOperativo: boolean;
}

export interface AuditLogPreviewItem {
    id: string;
    fechaHora: string;
    actor: string;
    accion: 'Crear' | 'Firmar' | 'Autorizar' | 'Rechazar' | 'Suspender' | 'Relevar';
    detalle: string;
}

export const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
    {
        id: 1,
        nombre: 'Ana Solís',
        area: 'Administración',
        correo: 'ana.solis@obra.gob.mx',
        rol: 'ADMINISTRADOR',
        obrasAsignadas: [],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 2,
        nombre: 'Javier Mendoza',
        area: 'Superintendente',
        correo: 'javier.mendoza@obra.gob.mx',
        rol: 'SUPERINTENDENTE',
        obrasAsignadas: ['OP-2024-001', 'OP-2024-003'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 3,
        nombre: 'Lucía Ramírez',
        area: 'Supervisión',
        correo: 'lucia.ramirez@obra.gob.mx',
        rol: 'SUPERVISOR',
        obrasAsignadas: ['OP-2024-002', 'OP-2024-005'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 4,
        nombre: 'Marco Torres',
        area: 'Residencia',
        correo: 'marco.torres@obra.gob.mx',
        rol: 'RESIDENTE',
        obrasAsignadas: ['OP-2024-004'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 5,
        nombre: 'Sofía Gómez',
        area: 'Supervisión',
        correo: 'sofia.gomez@obra.gob.mx',
        rol: 'SUPERVISOR',
        obrasAsignadas: ['OP-2024-003', 'OP-2024-006'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 6,
        nombre: 'Carlos López',
        area: 'Dirección de Obras',
        correo: 'carlos.lopez@obra.gob.mx',
        rol: 'DIRECTIVO',
        obrasAsignadas: ['OP-2024-004', 'OP-2024-007'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 7,
        nombre: 'Elena Ruiz',
        area: 'Residencia',
        correo: 'elena.ruiz@obra.gob.mx',
        rol: 'RESIDENTE',
        obrasAsignadas: ['OP-2024-002'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 8,
        nombre: 'Diego Hernández',
        area: 'Supervisión',
        correo: 'diego.hernandez@obra.gob.mx',
        rol: 'SUPERVISOR',
        obrasAsignadas: ['OP-2024-005', 'OP-2024-008'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 9,
        nombre: 'Valeria Medina',
        area: 'Dirección de Obras',
        correo: 'valeria.medina@obra.gob.mx',
        rol: 'DIRECTIVO',
        obrasAsignadas: ['OP-2024-006', 'OP-2024-009'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: true,
    },
    {
        id: 10,
        nombre: 'Óscar Soto',
        area: 'Residencia',
        correo: 'oscar.soto@obra.gob.mx',
        rol: 'RESIDENTE',
        obrasAsignadas: ['OP-2024-004'],
        estado: 'ACTIVO',
        tieneHistorialOperativo: false,
    } as AdminUserRecord,
];

export const INITIAL_AUDIT_PREVIEW: AuditLogPreviewItem[] = [
    {
        id: 'log-1',
        fechaHora: '14 oct 2024 · 08:45:12',
        actor: 'Ana Solís',
        accion: 'Crear',
        detalle: 'Cuenta de usuario para Javier Mendoza',
    },
    {
        id: 'log-2',
        fechaHora: '14 oct 2024 · 09:42:08',
        actor: 'Javier Mendoza',
        accion: 'Firmar',
        detalle: 'Bitácora N.° 128 de OP-2024-001',
    },
    {
        id: 'log-3',
        fechaHora: '14 oct 2024 · 10:15:30',
        actor: 'Lucía Ramírez',
        accion: 'Autorizar',
        detalle: 'Estimación N.° 06 de OP-2024-002',
    },
    {
        id: 'log-4',
        fechaHora: '14 oct 2024 · 11:05:47',
        actor: 'Carlos López',
        accion: 'Rechazar',
        detalle: 'Solicitud de cambio de rol para Elena Ruiz',
    },
];