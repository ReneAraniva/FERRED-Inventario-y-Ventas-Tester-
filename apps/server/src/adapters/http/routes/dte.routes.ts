/**
 * DTE Routes
 * Manejo de todas las operaciones relacionadas con DTEs (Documento Tributario Electrónico)
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  construirJsonDTE,
  enviarDteHacienda,
  generarQRDte,
  obtenerEstadoDTE,
  listarDTEsSucursal,
  reenviarDTE,
} from '../../dte/dte.service';

const router = Router();

/**
 * POST /api/dte/generar
 * Genera un DTE completo (JSON, código de generación, número de control)
 */
router.post('/generar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { facturaId } = req.body;
    
    if (!facturaId || typeof facturaId !== 'number') {
      return res.status(400).json({ error: 'facturaId es requerido y debe ser un número' });
    }

    const dte = await construirJsonDTE(facturaId);
    res.json({
      mensaje: 'DTE generado correctamente',
      ...dte,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dte/enviar
 * Envía un DTE al Sandbox/Producción de Hacienda
 */
router.post('/enviar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { facturaId } = req.body;
    
    if (!facturaId || typeof facturaId !== 'number') {
      return res.status(400).json({ error: 'facturaId es requerido y debe ser un número' });
    }

    const resultado = await enviarDteHacienda(facturaId);
    res.json({
      mensaje: 'DTE enviado a Hacienda',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dte/qr/:codigoGeneracion
 * Obtiene el código QR de un DTE
 */
router.get('/qr/:codigoGeneracion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codigoGeneracion } = req.params;
    
    if (!codigoGeneracion) {
      return res.status(400).json({ error: 'codigoGeneracion es requerido' });
    }

    const qrBase64 = await generarQRDte(codigoGeneracion);
    res.json({
      codigoGeneracion,
      qr: qrBase64,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dte/estado/:facturaId
 * Obtiene el estado actual de un DTE
 */
router.get('/estado/:facturaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facturaId = Number(req.params.facturaId);
    
    if (!facturaId || isNaN(facturaId)) {
      return res.status(400).json({ error: 'facturaId es requerido y debe ser un número válido' });
    }

    const estadoDTE = await obtenerEstadoDTE(facturaId);
    res.json({
      mensaje: 'Estado del DTE obtenido',
      ...estadoDTE,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dte/sucursal/:sucursalId
 * Lista todos los DTEs de una sucursal
 */
router.get('/sucursal/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Number(req.query.offset) || 0;
    
    if (!sucursalId || isNaN(sucursalId)) {
      return res.status(400).json({ error: 'sucursalId es requerido y debe ser un número válido' });
    }

    const resultado = await listarDTEsSucursal(sucursalId, limit, offset);
    res.json({
      mensaje: 'DTEs de la sucursal obtenidos',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dte/reenviar/:facturaId
 * Reenvía un DTE que falló anteriormente
 */
router.post('/reenviar/:facturaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facturaId = Number(req.params.facturaId);
    
    if (!facturaId || isNaN(facturaId)) {
      return res.status(400).json({ error: 'facturaId es requerido y debe ser un número válido' });
    }

    const resultado = await reenviarDTE(facturaId);
    res.json({
      mensaje: 'DTE reenviado a Hacienda',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
});

export { router as dteRoutes };
