const axios = require('axios');

async function test() {
  const empRes = await axios.get('https://mandualotim.sch.id/api/employees');
  const employees = empRes.data;
  
  const panitiaRes = await axios.get('https://mandualotim.sch.id/api/exams/f8a6abb5-56f1-4d9a-9b5a-89cc1b2ca766/panitia');
  const panitiaData = panitiaRes.data;
  
  const pList = Array.isArray(panitiaData) ? panitiaData : [];
  const ids = pList.map(p => p.pegawaiId).filter(Boolean);
  
  const ketuaPanitiaId = '3b5da0b4-5208-49b6-8cf9-c07b7fb1b55b';
  if (ketuaPanitiaId) ids.push(ketuaPanitiaId);
  const committeeIds = [...new Set(ids)];
  
  const headmasterNip = '197112312000121003';
  
  const group1 = [];
  const group2 = [];
  const search = '';
  
  const filteredEmployees = employees.filter(e => {
    if (e.type !== 'Guru') return false;
    const isCommittee = committeeIds.includes(e.id);
    const isHeadmaster = (headmasterNip && e.nip === headmasterNip) ||
      (e.task?.toLowerCase() || '').includes('kepala madrasah') ||
      (e.task?.toLowerCase() || '').includes('kepala sekolah');
    const isAlreadyInGroup = group1.includes(e.id) || group2.includes(e.id);
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch && !isCommittee && !isHeadmaster && !isAlreadyInGroup;
  });
  
  console.log('Total employees:', employees.length);
  console.log('Total Guru:', employees.filter(e => e.type === 'Guru').length);
  console.log('Total committeeIds:', committeeIds.length);
  console.log('Total filtered:', filteredEmployees.length);
}
test();
