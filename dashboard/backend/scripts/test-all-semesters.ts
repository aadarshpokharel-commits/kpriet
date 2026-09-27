async function testAllSemesterAccounts() {
  const API_BASE = 'http://localhost:5000/api/v1';
  console.log('🧪 Starting Full Test Matrix for All 8 IT Semester Demo Accounts...\n');

  const results: any[] = [];

  for (let sem = 1; sem <= 8; sem++) {
    const username = `it.sem${sem}.teacher`;
    const password = 'Demo@IT12345';
    console.log(`\n────────────────────────────────────────────────────────────────`);
    console.log(`Testing Semester ${sem}: ${username}`);
    console.log(`────────────────────────────────────────────────────────────────`);

    try {
      // 1. Test Login with username
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeEmail: username, password }),
      });

      if (!loginRes.ok) {
        const errJson = await loginRes.json().catch(() => ({}));
        throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(errJson)}`);
      }

      const loginData = await loginRes.json();
      const user = loginData.data?.user;
      const token = loginData.data?.accessToken;
      console.log(`  ✔ [Auth] Login Successful: ${user?.name} (${user?.collegeEmail})`);
      console.log(`  ✔ [Role] ${user?.role} | Department: ${user?.department?.name || user?.department}`);

      // 2. Fetch Teacher Subjects
      const subjectsRes = await fetch(`${API_BASE}/academic/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!subjectsRes.ok) {
        throw new Error(`Subjects fetch failed: ${subjectsRes.status}`);
      }

      const subjectsData = await subjectsRes.json();
      const subjects: any[] = subjectsData.data || [];
      console.log(`  ✔ [Subjects] Fetched ${subjects.length} assigned subjects.`);

      // Verify all subjects belong to Semester sem
      const foreignSemSubjects = subjects.filter((s) => s.semesterNumber !== sem);
      const isIsolated = foreignSemSubjects.length === 0;

      if (!isIsolated) {
        console.error(
          `  ❌ [Isolation FAIL] Found subjects from other semesters:`,
          foreignSemSubjects.map((s) => `[Sem ${s.semesterNumber}] ${s.subjectCode}`)
        );
      } else {
        console.log(`  ✔ [Isolation PASS] 100% of visible subjects belong strictly to Semester ${sem}.`);
      }

      // 3. Inspect Simulations for each subject in this semester
      let totalSimsInWorkspace = 0;
      const subjectsWithSims: string[] = [];

      for (const subj of subjects) {
        // Fetch Subject Simulations
        const simRes = await fetch(`${API_BASE}/academic/subjects/${subj._id}/simulations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (simRes.ok) {
          const simData = await simRes.json();
          const sims = simData.data?.simulations || [];
          if (sims.length > 0) {
            totalSimsInWorkspace += sims.length;
            subjectsWithSims.push(`${subj.subjectCode} (${sims.length} sims)`);
          }
        }
      }

      console.log(
        `  ✔ [Simulations] ${totalSimsInWorkspace} simulations found across subjects: ${subjectsWithSims.join(', ') || 'None'}`
      );

      results.push({
        semester: sem,
        username,
        loginPass: true,
        subjectCount: subjects.length,
        isolated: isIsolated,
        simulationsCount: totalSimsInWorkspace,
        subjectsWithSims,
      });
    } catch (err: any) {
      console.error(`  ❌ [Error] Semester ${sem} failed:`, err.message);
      results.push({
        semester: sem,
        username,
        loginPass: false,
        error: err.message,
      });
    }
  }

  console.log('\n================================================================');
  console.log('📊 FINAL VALIDATION REPORT — ALL 8 IT SEMESTERS');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Semester: `Sem ${r.semester}`,
      Username: r.username,
      Login: r.loginPass ? 'PASS' : 'FAIL',
      Subjects: r.subjectCount,
      Isolation: r.isolated ? 'PASS (100% Strict)' : 'FAIL',
      Simulations: r.simulationsCount,
    }))
  );
}

testAllSemesterAccounts().catch((err) => {
  console.error(err);
  process.exit(1);
});
