'use strict';

/*
 * Matrices and Calculus (U25MA102) — simulation catalogue, organised
 * Semester I → Engineering Mathematics → Unit → Topic → Simulation (authoritative 5-unit syllabus).
 * Keep in sync with dashboard registry (MA_BOARD_SIMULATIONS) and backend (MA_SIMULATION_TEMPLATES).
 */
(function () {
  const subject = { name: 'Matrices and Calculus', code: 'U25MA102', semester: 1, department: 'Information Technology', programme: 'B.Tech Information Technology', regulation: 'R2025 CBCS' };
  const units = [
    { unit: 1, title: 'Matrices', subtype: 'matrices' },
    { unit: 2, title: 'Functions of Several Variables', subtype: 'several-variables' },
    { unit: 3, title: 'Multiple Integrals', subtype: 'multiple-integrals' },
    { unit: 4, title: 'Line and Surface Integrals', subtype: 'vector-calculus' },
    { unit: 5, title: 'Ordinary Differential Equations', subtype: 'ode' },
  ];
  // [id, unit, topic, title, icon, description, flagship]
  const rows = [
    ['ma-matrix-ops', 1, 'Matrix Operations', 'Matrix Operations Visualizer', '🧮', 'Addition, subtraction, scalar multiple, product and transpose — every entry calculated step by step.'],
    ['ma-eigen', 1, 'Eigenvalues & Eigenvectors', 'Eigenvalue & Eigenvector Visualizer', '⭐', 'Matrix → det(A − λI) = 0 → eigenvalues → eigenvectors → see which vectors keep their direction.', true],
    ['ma-cayley-hamilton', 1, 'Cayley-Hamilton', 'Cayley-Hamilton Theorem Simulator', '🔁', 'Characteristic polynomial, substitute A, verify p(A) = 0 and use it to find A⁻¹.'],
    ['ma-diagonalization', 1, 'Diagonalization', 'Matrix Diagonalization', '🔳', 'Eigenvalues, eigenvectors, modal matrix P, D = P⁻¹AP (or orthogonal Pᵀ A P) and verification.'],
    ['ma-orthogonal', 1, 'Orthogonal Transformation', 'Orthogonal Transformation', '🔄', 'Rotations/reflections preserve lengths and angles; reduce a quadratic form to canonical form.'],
    ['ma-matrix-applications', 1, 'Applications', 'Matrix Applications', '🧩', 'Linear systems, network flow and population models: input → matrix form → calculation → result.'],
    ['ma-partial', 2, 'Partial Derivatives', 'Partial Derivative Visualizer', '∂', 'Freeze y and vary x (and vice versa): slices of the surface, fₓ, f_y and higher partial derivatives.'],
    ['ma-total-derivative', 2, 'Total Derivative', 'Total Derivative Simulator', '🔗', 'du/dt = u_x dx/dt + u_y dy/dt — each component calculated and compared with direct substitution.'],
    ['ma-jacobian', 2, 'Jacobians', 'Jacobian Visualizer', '🧭', 'Partial derivatives → Jacobian matrix → determinant, and how a small square is mapped.'],
    ['ma-taylor2', 2, 'Taylor Series', 'Taylor Series for Two Variables', '⭐', 'f(x,y) about (a,b): derivatives, terms, polynomial of order 1–4 and the approximation error.', true],
    ['ma-extrema', 2, 'Extreme Values', 'Extreme Values of Two Variables', '⭐', 'fₓ = f_y = 0 → critical points → rt − s² test → maximum, minimum or saddle, on contour and 3-D views.', true],
    ['ma-lagrange', 2, 'Lagrange Multipliers', 'Lagrange Multipliers', '⭐', 'Objective and constraint → ∇f = λ∇g → candidate points highlighted where level curves touch the constraint.', true],
    ['ma-double-integral', 3, 'Double Integrals', 'Double Integral Visualizer', '∬', 'Region, inner and outer integration step by step, and the volume under the surface.'],
    ['ma-change-order', 3, 'Change of Order', 'Change of Order of Integration', '⭐', 'Plot the region, find the boundary curves, slice the other way and read the new limits.', true],
    ['ma-triple-integral', 3, 'Triple Integrals', 'Triple Integral Visualizer', '∭', 'Inner, middle and outer integration over a 3-D region, with the region drawn in 3-D.'],
    ['ma-area', 3, 'Area', 'Area Using Double Integral', '📐', 'Area between two curves: intersections, limits and strips building up the area.'],
    ['ma-volume', 3, 'Volume', 'Volume Using Triple Integral', '🧊', 'Volume of a solid bounded by surfaces — limits, slices and the accumulated volume.'],
    ['ma-line-integral', 4, 'Line Integral', 'Line Integral Visualizer', '〰️', '∫_C F·dr along a parametrised path: direction, F·r′(t) and the running accumulation.'],
    ['ma-surface-integral', 4, 'Surface Integral', 'Surface Integral Visualizer', '🌐', 'Surface, normal vectors and flux ∬ F·n dS computed through a parametrisation.'],
    ['ma-green', 4, "Green's Theorem", "Green's Theorem Simulator", '⭐', '∮ P dx + Q dy = ∬ (Q_x − P_y) dA — both sides computed and compared.', true],
    ['ma-stokes', 4, "Stokes' Theorem", "Stokes' Theorem Simulator", '🌀', '∮ F·dr around the boundary = ∬ (∇×F)·n dS over the surface, in 3-D.'],
    ['ma-gauss', 4, 'Gauss Divergence Theorem', 'Gauss Divergence Theorem Simulator', '📦', '∯ F·n dS through a closed surface = ∭ ∇·F dV — outward normals and both sides compared.'],
    ['ma-ode2', 5, 'Second-Order ODE', 'Second-Order ODE Solver', '⭐', 'a y″ + b y′ + c y = f(x): auxiliary equation, CF, PI, initial conditions and the solution curve.', true],
    ['ma-ode-higher', 5, 'Higher-Order ODE', 'Higher-Order ODE Solver', '📈', 'Linear constant-coefficient ODEs up to order 6: characteristic equation, roots and the general solution.'],
    ['ma-ode-constant', 5, 'Constant Coefficient ODE', 'Constant Coefficient ODE Simulator', '🎚️', 'All root cases (distinct, repeated, complex) with sliders — see the solution curve change live.'],
    ['ma-ode-variable', 5, 'Variable Coefficient ODE', 'Variable Coefficient ODE Simulator', '🔧', 'Equations reducible to constant coefficients (x = eᶻ, Legendre linear) and a known-solution reduction of order.'],
    ['ma-euler-cauchy', 5, 'Euler-Cauchy Equation', 'Euler-Cauchy Equation Simulator', '📐', 'x²y″ + a x y′ + b y = f(x): substitution x = eᶻ, auxiliary equation, roots and solution curve.'],
    ['ma-legendre', 5, "Legendre's Equation", "Legendre's Equation Simulator", '📜', '(ax+b)²y″ + … : substitution ax + b = eᶻ, reduced equation and solution; Legendre polynomials Pₙ(x).'],
    ['ma-variation-params', 5, 'Variation of Parameters', 'Variation of Parameters Simulator', '🧷', 'y₁, y₂, Wronskian, u₁ = −∫y₂f/W, u₂ = ∫y₁f/W, particular solution and the final curve.'],
  ];
  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const unitSubtype = (u) => (units.find((x) => x.unit === u) || {}).subtype || '';
  const simulations = rows.map(([id, unit, topic, title, icon, description, flagship]) => ({ id, unit, topic, title, icon, description, flagship: Boolean(flagship), unitTitle: unitTitle(unit), subtype: unitSubtype(unit) }));
  const byId = new Map(simulations.map((s) => [s.id, s]));
  window.EduverseMACatalog = { subject, units, simulations, simulationType: 'engineering-mathematics', get: (id) => byId.get(id) || null };
})();
