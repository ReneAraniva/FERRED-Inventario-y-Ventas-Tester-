import { useState, useMemo } from 'react';
import { useThemeStore } from '../../store/themeStore';

// ─────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────
interface Producto {
  id: number;
  nombre: string;
  sku: string;
  categoria: string;
  central: number;
  norte: number;
}

// ─────────────────────────────────────────────────────────────
//  DATOS DE PRUEBA
// ─────────────────────────────────────────────────────────────
const PRODUCTOS_MOCK: Producto[] = [
  { id: 1,  nombre: 'Taladro Percutor 20V',         sku: 'DEW-992-B', categoria: 'Herramientas', central: 24,  norte: 8   },
  { id: 2,  nombre: 'Sierra Circular 7-1/4"',        sku: 'MAC-441-S', categoria: 'Herramientas', central: 15,  norte: 22  },
  { id: 3,  nombre: 'Mezcladora de Concreto 120L',  sku: 'CON-882-X', categoria: 'Maquinaria',   central: 3,   norte: 5   },
  { id: 4,  nombre: 'Set de Llaves Allen 12 pcs',   sku: 'FER-112-L', categoria: 'Ferretería',   central: 145, norte: 98  },
  { id: 5,  nombre: 'Nivel Láser Autonivelante',    sku: 'NIV-330-A', categoria: 'Medición',     central: 0,   norte: 4   },
  { id: 6,  nombre: 'Compresor 50L 2HP',            sku: 'COM-550-P', categoria: 'Maquinaria',   central: 7,   norte: 0   },
  { id: 7,  nombre: 'Martillo de Carpintero 20oz',  sku: 'MAR-220-C', categoria: 'Herramientas', central: 62,  norte: 55  },
  { id: 8,  nombre: 'Pintura Esmalte 1 Galón',      sku: 'PIN-101-E', categoria: 'Pintura',      central: 0,   norte: 0   },
  { id: 9,  nombre: 'Tornillos Autorroscantes x100',sku: 'TOR-440-X', categoria: 'Ferretería',   central: 320, norte: 210 },
  { id: 10, nombre: 'Cinta Métrica 8m',             sku: 'CIN-080-M', categoria: 'Medición',     central: 88,  norte: 91  },
  { id: 11, nombre: 'Disco de Corte 4.5"',          sku: 'DIS-045-C', categoria: 'Herramientas', central: 5,   norte: 2   },
  { id: 12, nombre: 'Cemento Portland 42.5kg',      sku: 'CEM-425-P', categoria: 'Construcción', central: 18,  norte: 33  },
  { id: 13, nombre: 'Rodillo Pintura 9"',           sku: 'ROD-090-P', categoria: 'Pintura',      central: 44,  norte: 12  },
  { id: 14, nombre: 'Broca HSS 6mm',                sku: 'BRO-006-H', categoria: 'Ferretería',   central: 0,   norte: 15  },
  { id: 15, nombre: 'Guantes de Trabajo L',         sku: 'GUA-L00-T', categoria: 'Seguridad',    central: 73,  norte: 68  },
  { id: 16, nombre: 'Casco de Seguridad',           sku: 'CAS-001-S', categoria: 'Seguridad',    central: 2,   norte: 0   },
];

const CATEGORIAS = ['Todas las Categorías', ...Array.from(new Set(PRODUCTOS_MOCK.map(p => p.categoria))).sort()];
const POR_PAGINA = 8;

// ─────────────────────────────────────────────────────────────
//  TOKENS DE COLOR
// ─────────────────────────────────────────────────────────────
const LIGHT = {
  cardBg:              '#FDFAF5',
  cardBorder:          'rgba(180,130,50,0.15)',
  cardShadow:          '0 2px 12px rgba(100,70,20,0.08)',

  pageTitle:           '#2C1A06',
  pageSub:             'rgba(80,50,15,0.5)',
  badgeBg:             'rgba(212,130,10,0.12)',
  badgeColor:          '#8B5010',
  badgeBorder:         'rgba(212,130,10,0.25)',

  statGlobal:          '#2C1A06',
  statOptimo:          '#0369A1',
  statAtencion:        '#B45309',
  statCritico:         '#B91C1C',
  statGlobalBorder:    'rgba(59,130,246,0.3)',
  statOptimoBorder:    'rgba(16,185,129,0.3)',
  statAtencionBorder:  'rgba(245,158,11,0.4)',
  statCriticoBorder:   'rgba(220,38,38,0.35)',

  searchBg:            '#FFFFFF',
  searchBorder:        'rgba(180,130,50,0.25)',
  searchBorderFocus:   '#D4820A',
  searchRing:          'rgba(212,130,10,0.1)',
  searchColor:         '#1C1005',
  searchIcon:          'rgba(160,110,40,0.4)',

  selectBg:            '#FFFFFF',
  selectBorder:        'rgba(180,130,50,0.25)',
  selectColor:         '#3D2209',

  btnBg:               'linear-gradient(135deg, #E8A020 0%, #D4820A 100%)',
  btnColor:            '#FFFFFF',
  btnShadow:           '0 3px 12px rgba(212,130,10,0.3)',

  tableHeaderBg:       'rgba(180,130,50,0.07)',
  tableHeaderColor:    'rgba(80,50,15,0.55)',
  tableRowBorder:      'rgba(180,130,50,0.1)',
  tableRowHover:       'rgba(212,130,10,0.04)',
  tableRowStripe:      'rgba(0,0,0,0.01)',
  productName:         '#2C1A06',
  productSku:          'rgba(80,50,15,0.45)',
  categoryBg:          'rgba(180,130,50,0.1)',
  categoryColor:       '#6B4010',
  categoryBorder:      'rgba(180,130,50,0.2)',

  dotGreen:            '#16A34A',
  dotOrange:           '#D97706',
  dotRed:              '#DC2626',
  diffPos:             '#16A34A',
  diffNeg:             '#DC2626',
  diffZero:            'rgba(80,50,15,0.35)',

  paginaBg:            'rgba(180,130,50,0.08)',
  paginaBorder:        'rgba(180,130,50,0.2)',
  paginaColor:         '#6B4010',
  paginaActiveBg:      'linear-gradient(135deg, #E8A020, #D4820A)',
  paginaActiveColor:   '#FFFFFF',
  paginaText:          'rgba(80,50,15,0.5)',

  footerColor:         'rgba(80,50,15,0.35)',
  emptyColor:          'rgba(80,50,15,0.4)',
};

const DARK = {
  cardBg:              '#162032',
  cardBorder:          'rgba(59,130,246,0.1)',
  cardShadow:          '0 2px 16px rgba(0,0,0,0.2)',

  pageTitle:           '#F0F6FF',
  pageSub:             'rgba(148,163,184,0.45)',
  badgeBg:             'rgba(59,130,246,0.1)',
  badgeColor:          '#93C5FD',
  badgeBorder:         'rgba(59,130,246,0.2)',

  statGlobal:          '#F0F6FF',
  statOptimo:          '#34D399',
  statAtencion:        '#FBBF24',
  statCritico:         '#F87171',
  statGlobalBorder:    'rgba(59,130,246,0.25)',
  statOptimoBorder:    'rgba(16,185,129,0.25)',
  statAtencionBorder:  'rgba(245,158,11,0.3)',
  statCriticoBorder:   'rgba(248,113,113,0.3)',

  searchBg:            'rgba(10,18,36,0.6)',
  searchBorder:        'rgba(59,130,246,0.12)',
  searchBorderFocus:   'rgba(59,130,246,0.55)',
  searchRing:          'rgba(59,130,246,0.08)',
  searchColor:         '#EFF6FF',
  searchIcon:          'rgba(148,163,184,0.35)',

  selectBg:            'rgba(10,18,36,0.6)',
  selectBorder:        'rgba(59,130,246,0.12)',
  selectColor:         '#EFF6FF',

  btnBg:               'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  btnColor:            '#FFFFFF',
  btnShadow:           '0 3px 12px rgba(16,185,129,0.25)',

  tableHeaderBg:       'rgba(59,130,246,0.05)',
  tableHeaderColor:    'rgba(148,163,184,0.5)',
  tableRowBorder:      'rgba(59,130,246,0.07)',
  tableRowHover:       'rgba(59,130,246,0.04)',
  tableRowStripe:      'rgba(255,255,255,0.01)',
  productName:         '#EFF6FF',
  productSku:          'rgba(148,163,184,0.4)',
  categoryBg:          'rgba(59,130,246,0.08)',
  categoryColor:       '#93C5FD',
  categoryBorder:      'rgba(59,130,246,0.15)',

  dotGreen:            '#34D399',
  dotOrange:           '#FBBF24',
  dotRed:              '#F87171',
  diffPos:             '#34D399',
  diffNeg:             '#F87171',
  diffZero:            'rgba(148,163,184,0.35)',

  paginaBg:            'rgba(59,130,246,0.07)',
  paginaBorder:        'rgba(59,130,246,0.15)',
  paginaColor:         '#93C5FD',
  paginaActiveBg:      'linear-gradient(135deg, #10B981, #059669)',
  paginaActiveColor:   '#FFFFFF',
  paginaText:          'rgba(148,163,184,0.4)',

  footerColor:         'rgba(148,163,184,0.25)',
  emptyColor:          'rgba(148,163,184,0.4)',
};

// ─────────────────────────────────────────────────────────────
//  ÍCONOS SVG
// ─────────────────────────────────────────────────────────────
const Ico = ({ d, size = 14, color }: { d: string; size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IcoSearch = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const IcoChevron = ({ color, dir = 'right' }: { color: string; dir?: 'left' | 'right' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const getStockColor = (qty: number, T: typeof DARK) => {
  if (qty === 0) return T.dotRed;
  if (qty <= 5)  return T.dotOrange;
  return T.dotGreen;
};

const getDiffColor = (diff: number, T: typeof DARK) => {
  if (diff > 0) return T.diffPos;
  if (diff < 0) return T.diffNeg;
  return T.diffZero;
};

// ─────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────
export default function StockPage() {
  const { isDark } = useThemeStore();
  const T = isDark ? DARK : LIGHT;

  const [busqueda,    setBusqueda]    = useState('');
  const [categoria,   setCategoria]   = useState('Todas las Categorías');
  const [pagina,      setPagina]      = useState(1);
  const [searchFocus, setSearchFocus] = useState(false);

  // ── Filtrado ──────────────────────────────────────────────
  const filtrados = useMemo(() => PRODUCTOS_MOCK.filter(p => {
    const matchNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                        p.sku.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat    = categoria === 'Todas las Categorías' || p.categoria === categoria;
    return matchNombre && matchCat;
  }), [busqueda, categoria]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // ── Stats ─────────────────────────────────────────────────
  const totalProductos = PRODUCTOS_MOCK.length;
  const enStock        = PRODUCTOS_MOCK.filter(p => p.central > 5 && p.norte > 5).length;
  const stockBajo      = PRODUCTOS_MOCK.filter(p => (p.central > 0 && p.central <= 5) || (p.norte > 0 && p.norte <= 5)).length;
  const sinStock       = PRODUCTOS_MOCK.filter(p => p.central === 0 || p.norte === 0).length;

  const handleCategoria = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoria(e.target.value);
    setPagina(1);
  };

  return (
    <>
      <style>{`
        @keyframes sp-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sp-stat { animation: sp-fadeUp 0.38s cubic-bezier(.22,.68,0,1.1) both; }
        .sp-stat:nth-child(1) { animation-delay: 0.04s; }
        .sp-stat:nth-child(2) { animation-delay: 0.09s; }
        .sp-stat:nth-child(3) { animation-delay: 0.14s; }
        .sp-stat:nth-child(4) { animation-delay: 0.19s; }
        .sp-row { transition: background 0.15s ease; }
        .sp-row:hover { background: var(--sp-row-hover) !important; }
        .sp-btn { transition: all 0.17s ease; }
        .sp-btn:hover  { filter: brightness(1.07); transform: translateY(-1px); }
        .sp-btn:active { transform: translateY(0); }
        .sp-pag { transition: all 0.14s ease; cursor: pointer; }
        .sp-pag:hover:not([data-active='true']):not(:disabled) { filter: brightness(1.1); }
      `}</style>

      {/* Variable CSS para hover de fila */}
      <div style={{ ['--sp-row-hover' as any]: T.tableRowHover } as React.CSSProperties} />

      <div style={{
        display: 'flex', flexDirection: 'column', gap: '20px',
        fontFamily: "'DM Sans', sans-serif;",
      }}>

        {/* ── ENCABEZADO ──────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: T.pageTitle,
              transition: 'color 0.35s ease',
            }}>
              Control de Stock
            </h1>
            <span style={{
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '3px 8px',
              background: T.badgeBg,
              color: T.badgeColor,
              border: `1px solid ${T.badgeBorder}`,
              borderRadius: '4px',
              transition: 'all 0.35s ease',
            }}>
              Solo Administrador
            </span>
          </div>
          <p style={{
            marginTop: '4px', fontSize: '12px',
            color: T.pageSub, fontStyle: 'italic',
            transition: 'color 0.35s ease',
          }}>
            Vista comparativa entre sucursales
          </p>
        </div>

        {/* ── STATS ───────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}>
          {[
            {
              label: 'Global',   sublabel: 'Total Productos',
              value: totalProductos.toLocaleString(),
              color: T.statGlobal,   border: T.statGlobalBorder,
              icon: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
            },
            {
              label: 'Óptimo',   sublabel: 'En Stock',
              value: enStock.toLocaleString(),
              color: T.statOptimo,   border: T.statOptimoBorder,
              icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
            },
            {
              label: 'Atención', sublabel: 'Stock Bajo',
              value: stockBajo.toLocaleString(),
              color: T.statAtencion, border: T.statAtencionBorder,
              icon: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
            },
            {
              label: 'Crítico',  sublabel: 'Sin Stock',
              value: sinStock.toLocaleString(),
              color: T.statCritico,  border: T.statCriticoBorder,
              icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01',
            },
          ].map(stat => (
            <div key={stat.label} className="sp-stat" style={{
              background: T.cardBg,
              border: `1px solid ${stat.border}`,
              borderLeft: `3px solid ${stat.color}`,
              borderRadius: '10px',
              padding: '14px 16px',
              boxShadow: T.cardShadow,
              transition: 'all 0.35s ease',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '8px',
              }}>
                <span style={{
                  fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: stat.color,
                }}>
                  {stat.label}
                </span>
                <Ico d={stat.icon} size={13} color={stat.color} />
              </div>
              <div style={{
                fontSize: 'clamp(20px, 2.5vw, 28px)',
                fontWeight: 700, color: stat.color,
                lineHeight: 1, marginBottom: '3px',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '10px', color: T.pageSub,
                fontStyle: 'italic', transition: 'color 0.35s ease',
              }}>
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* ── TABLA CARD ──────────────────────────────── */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: '10px',
          boxShadow: T.cardShadow,
          overflow: 'hidden',
          transition: 'all 0.35s ease',
        }}>

          {/* Filtros */}
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${T.tableRowBorder}`,
            display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
          }}>
            {/* Buscador */}
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <span style={{
                position: 'absolute', left: '11px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }}>
                <IcoSearch color={T.searchIcon} />
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Buscar producto por nombre..."
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 34px',
                  background: T.searchBg,
                  border: `1px solid ${searchFocus ? T.searchBorderFocus : T.searchBorder}`,
                  borderRadius: '6px',
                  color: T.searchColor,
                  fontSize: '12.5px',
                  fontFamily: "'DM Sans', sans-serif;",
                  outline: 'none',
                  boxShadow: searchFocus ? `0 0 0 3px ${T.searchRing}` : 'none',
                  transition: 'all 0.18s ease',
                }}
              />
            </div>

            {/* Select categoría */}
            <select
              value={categoria}
              onChange={handleCategoria}
              style={{
                flex: '0 1 190px',
                padding: '9px 12px',
                background: T.selectBg,
                border: `1px solid ${T.selectBorder}`,
                borderRadius: '6px',
                color: T.selectColor,
                fontSize: '12px',
                fontFamily: "'DM Sans', sans-serif;",
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Botón aplicar */}
            <button
              className="sp-btn"
              onClick={() => setPagina(1)}
              style={{
                padding: '9px 18px',
                background: T.btnBg,
                border: 'none',
                borderRadius: '6px',
                color: T.btnColor,
                fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif;",
                cursor: 'pointer',
                boxShadow: T.btnShadow,
                flexShrink: 0,
              }}
            >
              Aplicar
            </button>
          </div>

          {/* Tabla con scroll horizontal en mobile */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '540px' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, transition: 'background 0.35s ease' }}>
                  {['Producto', 'Categoría', 'Sucursal Central', 'Sucursal Norte', 'Diferencia'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px',
                      textAlign: col === 'Producto' || col === 'Categoría' ? 'left' : 'center',
                      fontSize: '9px', fontWeight: 700,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: T.tableHeaderColor,
                      borderBottom: `1px solid ${T.tableRowBorder}`,
                      transition: 'color 0.35s ease',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '48px', textAlign: 'center',
                      color: T.emptyColor, fontSize: '13px', fontStyle: 'italic',
                    }}>
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : paginados.map((p, i) => {
                  const diff = p.central - p.norte;
                  return (
                    <tr key={p.id} className="sp-row" style={{
                      background: i % 2 !== 0 ? T.tableRowStripe : 'transparent',
                      borderBottom: `1px solid ${T.tableRowBorder}`,
                    }}>
                      {/* Producto */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 700,
                          color: T.productName, transition: 'color 0.35s ease',
                        }}>
                          {p.nombre}
                        </div>
                        <div style={{
                          fontSize: '10px', color: T.productSku, marginTop: '2px',
                          fontStyle: 'italic', letterSpacing: '0.04em',
                          transition: 'color 0.35s ease',
                        }}>
                          SKU: {p.sku}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 8px',
                          background: T.categoryBg, color: T.categoryColor,
                          border: `1px solid ${T.categoryBorder}`,
                          borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap', transition: 'all 0.35s ease',
                        }}>
                          {p.categoria}
                        </span>
                      </td>

                      {/* Sucursal Central */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: getStockColor(p.central, T),
                            display: 'inline-block', flexShrink: 0,
                            boxShadow: `0 0 5px ${getStockColor(p.central, T)}`,
                          }} />
                          <span style={{
                            fontSize: '14px', fontWeight: 700,
                            color: getStockColor(p.central, T),
                          }}>
                            {p.central}
                          </span>
                        </div>
                      </td>

                      {/* Sucursal Norte */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: getStockColor(p.norte, T),
                            display: 'inline-block', flexShrink: 0,
                            boxShadow: `0 0 5px ${getStockColor(p.norte, T)}`,
                          }} />
                          <span style={{
                            fontSize: '14px', fontWeight: 700,
                            color: getStockColor(p.norte, T),
                          }}>
                            {p.norte}
                          </span>
                        </div>
                      </td>

                      {/* Diferencia */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: 700,
                          color: getDiffColor(diff, T),
                        }}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── PAGINACIÓN ────────────────────────────── */}
          <div style={{
            padding: '12px 18px',
            borderTop: `1px solid ${T.tableRowBorder}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '10px',
            transition: 'border-color 0.35s ease',
          }}>
            <span style={{
              fontSize: '10px', color: T.paginaText,
              fontStyle: 'italic', transition: 'color 0.35s ease',
            }}>
              Mostrando{' '}
              <strong style={{ color: T.productName }}>
                {filtrados.length === 0
                  ? '0'
                  : `${(pagina - 1) * POR_PAGINA + 1}–${Math.min(pagina * POR_PAGINA, filtrados.length)}`}
              </strong>
              {' '}de{' '}
              <strong style={{ color: T.productName }}>{filtrados.length.toLocaleString()}</strong>
              {' '}productos
            </span>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {/* Anterior */}
              <button
                className="sp-pag"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 11px',
                  background: T.paginaBg, border: `1px solid ${T.paginaBorder}`,
                  borderRadius: '5px',
                  color: pagina === 1 ? T.paginaText : T.paginaColor,
                  fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: "'DM Sans', sans-serif;",
                  cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                  opacity: pagina === 1 ? 0.4 : 1,
                }}
              >
                <IcoChevron color={T.paginaColor} dir="left" />
                Anterior
              </button>

              {/* Números de página */}
              {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                let num = i + 1;
                if (totalPaginas > 5) {
                  if (pagina <= 3) num = i + 1;
                  else if (pagina >= totalPaginas - 2) num = totalPaginas - 4 + i;
                  else num = pagina - 2 + i;
                }
                const isActive = pagina === num;
                return (
                  <button
                    key={num}
                    className="sp-pag"
                    data-active={isActive}
                    onClick={() => setPagina(num)}
                    style={{
                      width: '30px', height: '30px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? T.paginaActiveBg : T.paginaBg,
                      border: `1px solid ${T.paginaBorder}`,
                      borderRadius: '5px',
                      color: isActive ? T.paginaActiveColor : T.paginaColor,
                      fontSize: '11px', fontWeight: 700,
                      fontFamily: "'DM Sans', sans-serif;",
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                );
              })}

              {/* Siguiente */}
              <button
                className="sp-pag"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas || totalPaginas === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 11px',
                  background: T.paginaBg, border: `1px solid ${T.paginaBorder}`,
                  borderRadius: '5px',
                  color: (pagina === totalPaginas || totalPaginas === 0) ? T.paginaText : T.paginaColor,
                  fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: "'DM Sans', sans-serif;",
                  cursor: (pagina === totalPaginas || totalPaginas === 0) ? 'not-allowed' : 'pointer',
                  opacity: (pagina === totalPaginas || totalPaginas === 0) ? 0.4 : 1,
                }}
              >
                Siguiente
                <IcoChevron color={T.paginaColor} dir="right" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          fontSize: '9px', textAlign: 'center',
          color: T.footerColor, letterSpacing: '0.1em',
          transition: 'color 0.35s ease', paddingBottom: '4px',
        }}>
          © 2026 Ferred — Sistema de Gestión v2.4
        </p>
      </div>
    </>
  );
}