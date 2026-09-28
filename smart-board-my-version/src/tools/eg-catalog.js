'use strict';

/*
 * Engineering Graphics (U21ME101) — simulation catalogue.
 * Organised Semester I → Engineering Graphics → Unit → Topic → Simulation.
 * Keep in sync with dashboard/frontend/src/simulations/registry.ts (EG_BOARD_SIMULATIONS)
 * and dashboard/backend/src/constants/simulations.catalog.ts (EG_SIMULATION_TEMPLATES).
 */
(function () {
  const subject = { name: 'Engineering Graphics', code: 'U21ME101', semester: 1, department: 'Information Technology', programme: 'B.Tech Information Technology', regulation: 'R2021 CBCS' };
  const units = [
    { unit: 1, title: 'Drawing Basics & Geometrical Construction' },
    { unit: 3, title: 'Projection of Points, Lines and Planes' },
    { unit: 4, title: 'Solids, Sections and Development' },
    { unit: 5, title: 'Orthographic, Isometric and Perspective Projection' },
  ];
  // [id, unit, topic, title, icon, subtype, description]
  const rows = [
    ['eg-projection-generator', 4, '3D Object → Projection', '3D Object → Projection Generator', '🧊', 'projection-generator', 'Flagship: pick a solid, rotate it, choose a view and watch the front, top and side views generate with projection lines.'],
    ['eg-projection-solids', 4, 'Projection of Solids', 'Projection of Solids', '🔷', 'projection-of-solids', 'Prism, pyramid, cylinder and cone — axis perpendicular, inclined to HP, inclined to VP — views drawn stage by stage.'],
    ['eg-section-solids', 4, 'Section of Solids', 'Section of Solids', '🔪', 'section-of-solids', 'Move a cutting plane through a solid: sectional front/top/side views, hatched section and its true shape.'],
    ['eg-development', 4, 'Development of Surfaces', 'Development of Surfaces', '📜', 'development-of-surfaces', 'Unfold prisms, pyramids, cylinders and cones — including truncated solids — with the key dimensions.'],
    ['eg-geometric-construction', 1, 'Geometrical Construction', 'Geometrical Construction', '📐', 'geometric-construction', 'Bisectors, angles, regular polygons, circles and tangents — compass-and-ruler steps with snapping.'],
    ['eg-dimensioning', 1, 'Dimensioning', 'Dimensioning Simulator', '📏', 'dimensioning', 'Linear, angular, radial and diameter dimensions with extension lines, arrowheads and BIS notation.'],
    ['eg-drawing-workspace', 1, 'Drawing Workspace', '3D Engineering Drawing Workspace', '✏️', 'drawing-workspace', 'Draw lines, circles, arcs and polygons with snapping; select, move, rotate, dimension, generate views and export.'],
    ['eg-orthographic', 3, 'Orthographic Projection', 'Orthographic Projection', '📐', 'orthographic-projection', 'Front, top and side views of points, lines and planes with reference planes and projectors in all quadrants.'],
    ['eg-isometric', 5, 'Isometric Projection', 'Isometric Projection', '🧱', 'isometric-projection', 'Orthographic views → isometric object and back, isometric axes, isometric scale and projection guides.'],
    ['eg-sectional-view', 5, 'Sectional Views', 'Sectional View Simulator', '🧩', 'sectional-view', 'Cut a machine component with a movable plane — full/half section, hatched areas and sectional views.'],
    ['eg-perspective', 5, 'Perspective Projection', 'Perspective Projection', '🛤️', 'perspective-projection', 'Station point, picture plane, ground line, horizon, vanishing points and visual rays — step by step.'],
  ];
  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const simulations = rows.map(([id, unit, topic, title, icon, subtype, description]) => ({ id, unit, topic, title, icon, subtype, description, unitTitle: unitTitle(unit) }));
  const byId = new Map(simulations.map((s) => [s.id, s]));
  window.EduverseEGCatalog = { subject, units, simulations, simulationType: 'engineering-graphics', get: (id) => byId.get(id) || null };
})();
