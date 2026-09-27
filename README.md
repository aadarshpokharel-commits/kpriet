# KPRIET Eduverse Academic Platform & Smart Board Lab

A unified academic learning management and interactive smart board simulation platform built for **KPRIET** (Information Technology Department, Regulation R2021 CBCS).

---

## 🌟 Key Features

1. **Role-Based Academic Architecture**:
   - **Super Admin & HOD**: Department governance, faculty subject assignments, course approvals.
   - **Faculty / Teacher**: Subject workspace, curriculum syllabus management, knowledge uploads for RAG, student attendance, quizzes, and simulation launches.
   - **Student Portal**: Course overview, topic materials, interactive assignments, and simulation labs.

2. **Interactive Simulation Engines (Smart Board Native)**:
   - **Problem Solving and C Programming (`U21CS101` / `U21CSG01`)**:
     - Flagship C Program Execution + Visual Memory Stack & Address Visualizer.
     - 16 interactive simulations: Variable & Memory, Number Systems, Flowchart Builder, If-Else, Loops, 1D/2D Arrays, Pointers & Dereferencing, Pass-by-Value vs Reference, Strings, Linear & Binary Search, Bubble/Selection/Insertion Sort, Call Stack, Recursion, Structure vs Union, and File Processing.
   - **Operating Systems (`U21CS403`)**:
     - Process States, PCB, CPU Scheduling (FCFS, SJF, Priority, Round Robin), Deadlock Banker's Algorithm, Memory Paging, Page Replacement (FIFO, LRU, Optimal), and Disk Scheduling (FCFS, SSTF, SCAN, C-SCAN).
   - **Data Structures & Algorithms (`U21CS301`)** & **Computer Networks (`U21CS401`)**.

3. **PiyushDhara Eduverse Smart Board**:
   - 100vh compact, touch/stylus-friendly design with zero outer page scrollbars.
   - Live AI Assistant modal with real-time subject RAG and simulation state awareness.

---

## 📂 Project Structure

```text
KPRIET/
├── dashboard/
│   ├── backend/             # Express.js + TypeScript + Mongoose API
│   │   ├── src/             # Controllers, routes, models, middleware, RAG
│   │   └── scripts/         # Database seeding & Atlas migration scripts
│   └── frontend/            # React 19 + TypeScript + Vite + TailwindCSS
│       └── src/             # Dashboards, academic workspace, simulation runner
├── smart-board-my-version/  # Interactive Smart Board canvas & simulation engines
│   ├── src/
│   │   ├── c-simulation.html       # Flagship C Execution & Memory Visualizer
│   │   ├── os-simulation.html      # Operating Systems Simulations
│   │   ├── dsa-simulation.html     # Data Structures Visualizer
│   │   ├── cn-simulation.html      # Computer Networks Protocol Lab
│   │   ├── tools/                  # Simulation execution engines
│   │   └── modules/rbac/           # RBAC bridge connecting Dashboard to Smart Board
├── DEPLOYMENT.md            # Production deployment instructions
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend

```bash
cd dashboard/backend
npm install
npm run dev
```

### 2. Frontend

```bash
cd dashboard/frontend
npm install
npm run dev
```

Access the frontend at `http://localhost:5173`.

---

## ☁️ Deployment

For MongoDB Atlas migration and cloud deployment guides (Render, Vercel, Railway, PM2), see [DEPLOYMENT.md](DEPLOYMENT.md).
