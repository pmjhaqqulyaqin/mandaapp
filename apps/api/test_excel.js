const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');

async function run() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DataPegawai');

  worksheet.columns = [
    { header: 'JenisPegawai', key: 'type', width: 22 },
    { header: 'Nama', key: 'name', width: 25 },
    { header: 'NIP', key: 'nip', width: 25 },
    { header: 'Pangkat', key: 'rank', width: 20 },
    { header: 'Golongan', key: 'grade', width: 15 },
    { header: 'Jabatan', key: 'position', width: 25 },
    { header: 'Jenis Kelamin', key: 'gender', width: 15 },
    { header: 'Tempat Lahir', key: 'birthPlace', width: 20 },
    { header: 'Tanggal Lahir', key: 'birthDate', width: 15 },
    { header: 'Tugas Kepegawaian', key: 'task', width: 30 },
  ];

  worksheet.addRow({
    type: 'Guru',
    name: 'Ahmad Basuki, M.Pd',
    nip: '198001012005011001',
    rank: 'Penata Muda Tk.I',
    grade: 'III/b',
    position: 'Guru Mapel',
    gender: 'Laki-laki',
    birthPlace: 'Semarang',
    birthDate: '1980-01-01',
    task: 'Guru Matematika X RPL'
  });

  await workbook.xlsx.writeFile('test_excel.xlsx');
  
  // Now read with xlsx
  const wb = xlsx.readFile('test_excel.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  console.log("Parsed row data:");
  console.log(data[0]);

  try {
    const mapped = data.map((row) => ({
        type: row.JenisPegawai || row.Type || 'Guru',
        name: row.Nama || row.Name,
        nip: String(row.NIP || row.NUPTK || ''),
        rank: row.Pangkat || row.Rank || '',
        grade: String(row.Golongan || row.Grade || ''),
        position: row.Jabatan || row.Position || '',
        gender: row['Jenis Kelamin'] || row.JenisKelamin || row.Gender,
        birthPlace: row['Tempat Lahir'] || row.TempatLahir,
        birthDate: row['Tanggal Lahir'] || row.TanggalLahir ? new Date(row['Tanggal Lahir'] || row.TanggalLahir).toISOString() : null,
        task: row['Tugas Kepegawaian'] || row.TugasKepegawaian || row.Task || '',
      })).filter((r) => r.nip && r.name);
      
      console.log("Mapped Data:");
      console.log(mapped);
  } catch(e) {
      console.error("Mapping Error:", e.message);
  }
}

run();
