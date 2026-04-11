import { Router, Request, Response, NextFunction } from 'express';
import { prisma }       from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';

export const inventarioRoutes = Router();

type CriticoSucursalRow = {
  id: number;
  productoId: number;
  sucursalId: number;
  cantidad: number;
  minimo: number;
  actualizadoEn: Date;
  nombre: string;
  tipoUnidad: string | null;
};

type StockBajoAdminRow = {
  productoId: number;
  cantidad: number;
  minimo: number;
  nombre: string;
  tipoUnidad: string | null;
  sucursalNombre: string;
};

type StockBajoSucursalRow = {
  productoId: number;
  cantidad: number;
  minimo: number;
  nombre: string;
  tipoUnidad: string | null;
};

export async function sincronizarStockTotal(productoId: number): Promise<void> {
  const resultado = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });

  const totalStock = resultado._sum.cantidad ?? 0;

  await prisma.producto.update({
    where: { id: productoId },
    data:  { stockActual: totalStock },
  });
}

async function getStockTotal(productoId: number): Promise<number> {
  const r = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });
  return r._sum.cantidad ?? 0;
}

// ── GET /api/inventario/status — estado de conectividad ──────
inventarioRoutes.get('/status', (_req, res) => {
  res.json({ online: SyncService.isOnline() });
});

// ── GET /api/inventario/stock/:sucursalId ────────────────────
// Lista el stock de todos los productos para una sucursal
inventarioRoutes.get('/stock/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    const cacheKey   = `stock:${sucursalId}`;

    // Intentar desde caché si offline
    if (!SyncService.isOnline()) {
      const cached = OfflineCache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const stocks = await prisma.stockSucursal.findMany({
      where:   { sucursalId },
      include: {
        producto: {
          select: {
            id: true, nombre: true, codigoBarras: true,
            precioVenta: true, precioConIva: true, tieneIva: true,
            tipoUnidad: true, activo: true,
            categoria: { select: { nombre: true } },
          },
        },
      },
      orderBy: { producto: { nombre: 'asc' } },
    });

    OfflineCache.set(cacheKey, stocks);
    return res.json(stocks);
  } catch (err) { return next(err); }
});

// ── GET /api/inventario/criticos/:sucursalId ─────────────────
// Productos bajo el mínimo de ESA sucursal
inventarioRoutes.get('/criticos/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);

    const criticosRows = await prisma.$queryRaw<CriticoSucursalRow[]>`
      SELECT
        ss.id,
        ss.producto_id AS "productoId",
        ss.sucursal_id AS "sucursalId",
        ss.cantidad,
        ss.minimo,
        ss.actualizado_en AS "actualizadoEn",
        p.nombre,
        p.tipo_unidad AS "tipoUnidad"
      FROM stock_sucursal ss
      INNER JOIN productos p ON p.id = ss.producto_id
      WHERE ss.sucursal_id = ${sucursalId}
        AND p.activo = ${true}
        AND ss.cantidad <= ss.minimo
      ORDER BY ss.cantidad ASC
    `;

    const criticos = criticosRows.map((c: CriticoSucursalRow) => ({
      id: c.id,
      productoId: c.productoId,
      sucursalId: c.sucursalId,
      cantidad: c.cantidad,
      minimo: c.minimo,
      actualizadoEn: c.actualizadoEn,
      producto: { nombre: c.nombre, tipoUnidad: c.tipoUnidad },
    }));

    return res.json({ total: criticos.length, criticos });
  } catch (err) { return next(err); }
});

// ── PATCH /api/inventario/:productoId/ajuste ─────────────────
// Ajuste manual de stock para una sucursal específica
inventarioRoutes.patch(
  '/:productoId/ajuste',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productoId = Number(req.params.productoId);
      const sucursalId = Number(req.body.sucursalId);
      const cantidad   = Number(req.body.cantidad);
      const minimoInput = req.body.minimo;
      const minimo = minimoInput !== undefined ? Number(minimoInput) : undefined;
      const motivo     = req.body.motivo as string | undefined;

      if (!Number.isFinite(cantidad)) return res.status(400).json({ error: 'cantidad inválida' });
      if (minimo !== undefined && (!Number.isFinite(minimo) || minimo < 0)) {
        return res.status(400).json({ error: 'minimo inválido' });
      }
      if (!sucursalId)                return res.status(400).json({ error: 'sucursalId requerido' });

      const producto = await prisma.producto.findUnique({
        where:  { id: productoId },
        select: { stockMinimo: true },
      });
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

      // crea el registro si no existe aún para esta sucursal
      const stock = await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId, sucursalId } },
        create: {
          productoId,
          sucursalId,
          cantidad: Math.max(0, cantidad),
          minimo: minimo ?? producto.stockMinimo,
        },
        update: {
          cantidad,
          ...(minimo !== undefined ? { minimo } : {}),
        },
      });

      // sincronizar stock_actual como SUMA de todas las sucursales
      await sincronizarStockTotal(productoId);

      // Registrar para sync si estamos offline
      await logPendiente('stockSucursal', 'UPDATE', {
        id: stock.id, productoId, sucursalId, cantidad: stock.cantidad, motivo,
      }, req.usuario?.id);

      OfflineCache.invalidate(`stock:${sucursalId}`);
      return res.json({ ok: true, stock, stockTotal: await getStockTotal(productoId) });
    } catch (err) { return next(err); }
  }
);

// ── POST /api/inventario/transferencia ───────────────────────
// Transfiere stock entre sucursales (solo ADMIN)
inventarioRoutes.post(
  '/transferencia',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productoId, origenId, destinoId, cantidad } = req.body as {
        productoId: number;
        origenId:   number;
        destinoId:  number;
        cantidad:   number;
      };

      if (!productoId || !origenId || !destinoId || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: 'Datos de transferencia inválidos' });
      }

      const producto = await prisma.producto.findUnique({
        where:  { id: productoId },
        select: { activo: true, stockMinimo: true },
      });
      if (!producto || !producto.activo) {
        return res.status(404).json({ error: 'Producto no existe o está inactivo' });
      }

      // Verificar stock suficiente en origen
      const origen = await prisma.stockSucursal.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
      });

      if (!origen || origen.cantidad < cantidad) {
        return res.status(409).json({
          error: `Stock insuficiente en sucursal origen. Disponible: ${origen?.cantidad ?? 0}`,
        });
      }

      // Ejecutar transferencia en transacción
      const [stockOrigen, stockDestino] = await prisma.$transaction([
        prisma.stockSucursal.update({
          where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
          data:  { cantidad: { decrement: cantidad } },
        }),
        prisma.stockSucursal.upsert({
          where:  { productoId_sucursalId: { productoId, sucursalId: destinoId } },
          create: { productoId, sucursalId: destinoId, cantidad, minimo: producto.stockMinimo },
          update: { cantidad: { increment: cantidad } },
        }),
      ]);

      // sincronizar stock_actual después de la transferencia
      await sincronizarStockTotal(productoId);

      OfflineCache.invalidate(`stock:${origenId}`);
      OfflineCache.invalidate(`stock:${destinoId}`);

      return res.json({
        mensaje: 'Transferencia realizada',
        origen:  stockOrigen,
        destino: stockDestino,
      });
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/stock-comparativo ────────────────────
// T-06.1: Stock de todos los productos en AMBAS sucursales
// Solo accesible para ADMIN — ve todo sin restricción de sucursal
inventarioRoutes.get(
  '/stock-comparativo',
  roleMiddleware('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        select: {
          id:          true,
          nombre:      true,
          codigoBarras: true,
          tipoUnidad:  true,
          stockMinimo: true,
          precioVenta: true,
          categoria:   { select: { nombre: true } },
          stocks: {
            include: {
              sucursal: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      const resultado = productos.map((p: any) => {
        const sucursales = p.stocks.map((s: any) => ({
          sucursalId:     s.sucursalId,
          sucursalNombre: s.sucursal.nombre,
          cantidad:       s.cantidad,
          minimo:         s.minimo,
          estado:
            s.cantidad === 0        ? 'critico'  :
            s.cantidad <= s.minimo  ? 'bajo'     :
                                      'disponible',
        }));

        const stockTotal = sucursales.reduce((acc: number, s: { cantidad: number }) => acc + s.cantidad, 0);

        return {
          id:           p.id,
          nombre:       p.nombre,
          codigoBarras: p.codigoBarras,
          tipoUnidad:   p.tipoUnidad,
          stockMinimo:  p.stockMinimo,
          precioVenta:  p.precioVenta,
          categoria:    p.categoria?.nombre ?? 'Sin categoría',
          stockTotal,
          sucursales,
        };
      });

      return res.json(resultado);
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/stock-bajo ───────────────────────────
// Dashboard: productos con stock bajo o crítico
// ADMIN -> ve ambas sucursales | CAJERO/BODEGA -> solo su sucursal
inventarioRoutes.get('/stock-bajo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario    = req.usuario;
    const esAdmin    = usuario?.rol === 'ADMIN';
    const sucursalId = usuario?.sucursalId;

    if (esAdmin) {
      // Admin ve todos los productos con stock crítico en CUALQUIER sucursal
      const criticos = await prisma.$queryRaw<StockBajoAdminRow[]>`
        SELECT
          ss.producto_id AS "productoId",
          ss.cantidad,
          ss.minimo,
          p.nombre,
          p.tipo_unidad AS "tipoUnidad",
          s.nombre AS "sucursalNombre"
        FROM stock_sucursal ss
        INNER JOIN productos p ON p.id = ss.producto_id
        INNER JOIN sucursales s ON s.id = ss.sucursal_id
        WHERE p.activo = ${true}
          AND (ss.cantidad = 0 OR ss.cantidad <= ss.minimo)
        ORDER BY ss.cantidad ASC
      `;

      // Agrupar por producto para no duplicar
      const porProducto = new Map<number, any>();
      for (const c of criticos) {
        if (!porProducto.has(c.productoId)) {
          porProducto.set(c.productoId, {
            id:          c.productoId,
            nombre:      c.nombre,
            tipoUnidad:  c.tipoUnidad,
            sucursales:  [],
          });
        }
        porProducto.get(c.productoId).sucursales.push({
          sucursalNombre: c.sucursalNombre,
          cantidad:       c.cantidad,
          minimo:         c.minimo,
          estado:         c.cantidad === 0 ? 'critico' : 'bajo',
        });
      }

      return res.json([...porProducto.values()]);
    }

    // No-admin: solo su sucursal
    const criticos = await prisma.$queryRaw<StockBajoSucursalRow[]>`
      SELECT
        ss.producto_id AS "productoId",
        ss.cantidad,
        ss.minimo,
        p.nombre,
        p.tipo_unidad AS "tipoUnidad"
      FROM stock_sucursal ss
      INNER JOIN productos p ON p.id = ss.producto_id
      WHERE ss.sucursal_id = ${sucursalId}
        AND p.activo = ${true}
        AND (ss.cantidad = 0 OR ss.cantidad <= ss.minimo)
      ORDER BY ss.cantidad ASC
    `;

    return res.json(criticos.map(c => ({
      id:         c.productoId,
      nombre:     c.nombre,
      tipoUnidad: c.tipoUnidad,
      cantidad:   c.cantidad,
      minimo:     c.minimo,
      estado:     c.cantidad === 0 ? 'critico' : 'bajo',
    })));

  } catch (err) { return next(err); }
});

// ── GET /api/inventario/sync-pendientes ──────────────────────
// Cuenta de registros pendientes de sincronizar (para indicador UI)
inventarioRoutes.get('/sync-pendientes', async (_req, res, next) => {
  try {
    const count   = await prisma.syncLog.count({ where: { status: 'PENDIENTE' } });
    const errores = await prisma.syncLog.count({ where: { status: 'ERROR' } });
    return res.json({ pendientes: count, errores, online: SyncService.isOnline() });
  } catch (err) { return next(err); }
});