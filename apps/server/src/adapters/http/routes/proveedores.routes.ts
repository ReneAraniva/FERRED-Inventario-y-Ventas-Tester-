/**
 * proveedores.routes.ts
 * HU-14 — T-14.1: Recepcion de productos desde proveedores
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }                from '../../db/prisma/prisma.client';
import { logPendiente }          from '../../sync/sync.service';
import { sincronizarStockTotal } from './inventario.routes';
import { roleMiddleware }        from '../middleware/role.middleware';

export const proveedoresRoutes = Router();

const ItemRecepcionSchema = z.object({
  productoId:       z.number().int().positive(),
  cantidadRecibida: z.number().positive(),
  cantidadPedida:   z.number().positive().optional(),
  observacion:      z.string().optional(),
});

const RecepcionSchema = z.object({
  sucursalId: z.number().int().positive(),
  items:      z.array(ItemRecepcionSchema).min(1, 'Debe incluir al menos un producto'),
  proveedor:  z.string().optional().default('Sin especificar'),
});

// POST /api/proveedores/recepcion
// Solo ADMIN y BODEGA pueden registrar recepciones
proveedoresRoutes.post(
  '/recepcion',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RecepcionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:   'Datos de recepcion invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const { sucursalId, items, proveedor } = parsed.data;
      const usuarioId = (req as any).usuario?.id ?? null;

      // Verificar que los productos existen
      const productosIds = items.map(i => i.productoId);
      const productos    = await prisma.producto.findMany({
        where: { id: { in: productosIds }, activo: true },
      });

      if (productos.length !== productosIds.length) {
        return res.status(404).json({ error: 'Uno o mas productos no existen' });
      }

      // Procesar recepcion: upsert de stock + registro en sync_log
      const resultados = [];

      for (const item of items) {
        const producto = productos.find((p: any) => p.id === item.productoId)!;

        // Incrementar stock en la sucursal
        const stockActualizado = await prisma.stockSucursal.upsert({
          where:  { productoId_sucursalId: { productoId: item.productoId, sucursalId } },
          create: { productoId: item.productoId, sucursalId, cantidad: item.cantidadRecibida, minimo: 0 },
          update: { cantidad: { increment: item.cantidadRecibida } },
        });

        // Sincronizar stock_actual del producto
        await sincronizarStockTotal(item.productoId);

        // Registrar el movimiento en sync_log para trazabilidad
        await logPendiente('stockSucursal', 'UPDATE', {
          id:               stockActualizado.id,
          productoId:       item.productoId,
          sucursalId,
          cantidadAgregada: item.cantidadRecibida,
          cantidadPedida:   item.cantidadPedida ?? null,
          esRecepcion:      true,
          proveedor,
          observacion:      item.observacion ?? null,
        }, usuarioId);

        resultados.push({
          productoId:       item.productoId,
          nombre:           producto.nombre,
          cantidadRecibida: item.cantidadRecibida,
          stockNuevo:       stockActualizado.cantidad,
          recepcionParcial: item.cantidadPedida
            ? item.cantidadRecibida < item.cantidadPedida
            : false,
        });
      }

      return res.status(201).json({
        ok:         true,
        sucursalId,
        proveedor,
        resultados,
        mensaje:    `${items.length} producto(s) recibido(s) correctamente`,
      });

    } catch (err) { return next(err); }
  }
);

// GET /api/proveedores/historial
// Historial de recepciones desde sync_log
proveedoresRoutes.get(
  '/historial',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuario    = (req as any).usuario;
      const esAdmin    = usuario?.rol === 'ADMIN';
      const sucursalId = usuario?.sucursalId;

      const { desde, hasta, limite = '50' } = req.query as Record<string, string>;
      const take = Math.min(Number(limite), 100);

      // Buscar registros de recepcion en sync_log
      const where: any = {
        tabla:     'stockSucursal',
        operacion: 'UPDATE',
      };

      if (desde) where.creadoEn = { ...where.creadoEn, gte: new Date(desde) };
      if (hasta) where.creadoEn = { ...where.creadoEn, lte: new Date(hasta) };

      const logs = await prisma.syncLog.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        take,
        include: { usuario: { select: { nombre: true, rol: true } } },
      });

      // Filtrar solo los que son recepciones y de la sucursal del usuario
      const recepciones = logs
        .map((log: any) => {
          try { return { ...log, payloadObj: JSON.parse(log.payload) }; }
          catch { return null; }
        })
        .filter((log: any) => log !== null && log.payloadObj?.esRecepcion === true)
        .filter((log: any) => esAdmin || log!.payloadObj?.sucursalId === sucursalId);

      return res.json(recepciones.map((log: any) => ({
        id:               log!.id,
        fecha:            log!.creadoEn,
        bodeguero:        log!.usuario?.nombre ?? 'Sistema',
        productoId:       log!.payloadObj.productoId,
        sucursalId:       log!.payloadObj.sucursalId,
        cantidadRecibida: log!.payloadObj.cantidadAgregada,
        proveedor:        log!.payloadObj.proveedor,
        observacion:      log!.payloadObj.observacion,
        recepcionParcial: log!.payloadObj.recepcionParcial ?? false,
      })));

    } catch (err) { return next(err); }
  }
);