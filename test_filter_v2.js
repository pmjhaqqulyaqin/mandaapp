const axios = require('axios');
async function test() {
  const empRes = await axios.get('https://mandualotim.sch.id/api/employees');
  let employees = empRes.data;

  // Simulate exact process from PengawasTab.tsx
  let allEmployees = employees || [];
  
  // Data from PengaturanPengawasModal.tsx
  const panitiaRes = await axios.get('https://mandualotim.sch.id/api/exams/f8a6abb5-56f1-4d9a-9b5a-89cc1b2ca766/panitia');
  const panitiaData = panitiaRes.data;
  const pList = Array.isArray(panitiaData) ? panitiaData : [];
  const ids = pList.map(p => p.pegawaiId).filter(Boolean);
  ids.push('3b5da0b4-5208-49b6-8cf9-c07b7fb1b55b'); // ketuaPanitiaId
  const committeeIds = [...new Set(ids)];
  
  const headmasterNip = '197112312000121003';
  const group1 = [];
  const group2 = [];
  const search = '';

  const filteredEmployees = (allEmployees || []).filter(e => {
    if ((e.type || '').toLowerCase().trim() !== 'guru') return false;
    const isCommittee = committeeIds.includes(e.id);
    const isHeadmaster = (headmasterNip && e.nip === headmasterNip) ||
      (e.task?.toLowerCase() || '').includes('kepala madrasah') ||
      (e.task?.toLowerCase() || '').includes('kepala sekolah');
    const isAlreadyInGroup = group1.includes(e.id) || group2.includes(e.id);
    const matchesSearch = (e.name || '').toLowerCase().includes(search.toLowerCase());

    return matchesSearch && !isCommittee && !isHeadmaster && !isAlreadyInGroup;
  });

  console.log('--- FILTER RESULT ---');
  console.log('Total employees:', allEmployees.length);
  console.log('Filtered length:', filteredEmployees.length);
  if (filteredEmployees.length === 0) {
      console.log('The array is STILL EMPTY in the exact test!');
  } else {
      console.log('The array has length ' + filteredEmployees.length + ' in Node!');
  }
}
test();
