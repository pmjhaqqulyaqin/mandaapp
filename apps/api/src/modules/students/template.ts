export const generateBukuIndukTemplate = (data: any) => {
  const { student, parents, education, physical, grades, attendance, extracurriculars, p5 } = data;

  const getParent = (type: string) => (parents || []).find((p: any) => p.type === type) || {};
  const ayah = getParent('ayah');
  const ibu = getParent('ibu');
  const wali = getParent('wali');

  const v = (val: any) => val || '....................';
  const dash = (val: any) => val || '-';

  // Build grades matrix: subject -> { semester -> score }
  const gradeRows: Record<string, Record<number, string>> = {};
  if (grades && grades.length > 0) {
    grades.forEach((g: any) => {
      if (!gradeRows[g.subjectName]) gradeRows[g.subjectName] = {};
      gradeRows[g.subjectName][g.semester] = g.score || '';
    });
  }
  const subjectNames = Object.keys(gradeRows);

  // Build attendance map: semester -> { sick, excused, unexcused, promotionStatus }
  const attMap: Record<number, any> = {};
  if (attendance && attendance.length > 0) {
    attendance.forEach((a: any) => { attMap[a.semester] = a; });
  }

  // Semester column definitions
  const semCols = [
    { sem: 1, cl: 'X', label: 'I' },
    { sem: 2, cl: 'X', label: 'II' },
    { sem: 3, cl: 'XI', label: 'I' },
    { sem: 4, cl: 'XI', label: 'II' },
    { sem: 5, cl: 'XII', label: 'I' },
    { sem: 6, cl: 'XII', label: 'II' },
  ];

  const formatDate = (d: any) => {
    if (!d) return '....................';
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return d; }
  };

  return '<!DOCTYPE html>' +
'<html lang="id">' +
'<head>' +
'<meta charset="UTF-8">' +
'<title>Buku Induk Peserta Didik</title>' +
'<style>' +
  'body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.4; margin: 0; padding: 15px; color: #000; }' +
  'h2 { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 10px 0; }' +
  '.header-flex { display: flex; justify-content: space-between; margin-bottom: 10px; }' +
  '.info-row { display: flex; margin-bottom: 2px; }' +
  '.info-label { min-width: 200px; }' +
  '.info-colon { width: 15px; text-align: center; }' +
  '.info-value { flex: 1; }' +
  '.section-title { font-weight: bold; margin-top: 12px; margin-bottom: 5px; font-size: 11pt; }' +
  '.sub-section { margin-left: 20px; }' +
  '.sub-indent { margin-left: 40px; }' +
  '.photo-box { width: 3cm; height: 4cm; border: 1px solid #000; float: right; margin-left: 15px; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #666; text-align: center; }' +
  'table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }' +
  'table, th, td { border: 1px solid #000; }' +
  'th { padding: 3px 4px; text-align: center; font-weight: bold; background: #f5f5f5; font-size: 8pt; }' +
  'td { padding: 2px 4px; text-align: center; }' +
  '.text-left { text-align: left; }' +
  '.page-break { page-break-before: always; }' +
  '.small { font-size: 9pt; }' +
'</style>' +
'</head>' +
'<body>' +

// === PAGE 1: IDENTITAS ===
'<h2>IV. LEMBAR BUKU INDUK PESERTA DIDIK</h2>' +

'<div class="header-flex">' +
  '<div>' +
    '<div class="info-row"><div class="info-label">Nomor Induk Siswa</div><div class="info-colon">:</div><div class="info-value">' + v(student.nis) + '</div></div>' +
    '<div class="info-row"><div class="info-label">NISN / NISM</div><div class="info-colon">:</div><div class="info-value">' + v(student.nisn) + '</div></div>' +
  '</div>' +
  '<div>' +
    '<div class="info-row"><div class="info-label">NIK</div><div class="info-colon">:</div><div class="info-value">' + v(student.nik) + '</div></div>' +
    '<div class="info-row"><div class="info-label">No. KK</div><div class="info-colon">:</div><div class="info-value">' + v(student.noKk) + '</div></div>' +
  '</div>' +
'</div>' +

'<div class="photo-box">' +
  (student.photoUrl ? '<img src="' + student.photoUrl + '" style="width:100%;height:100%;object-fit:cover;" />' : 'Pas Foto<br/>3x4') +
'</div>' +

// A. KETERANGAN SISWA
'<div class="section-title">A. KETERANGAN SISWA</div>' +
'<div class="sub-section">' +
  '<div class="info-row"><div class="info-label">1. Nama Lengkap</div><div class="info-colon">:</div><div class="info-value">' + v(student.fullName) + '</div></div>' +
  '<div class="info-row"><div class="info-label">2. Jenis Kelamin</div><div class="info-colon">:</div><div class="info-value">' +
    (student.gender === 'Laki-laki' ? 'Laki-laki / <s>Perempuan</s> *)' : student.gender === 'Perempuan' ? '<s>Laki-laki</s> / Perempuan *)' : 'Laki-laki / Perempuan *)') +
  '</div></div>' +
  '<div class="info-row"><div class="info-label">3. Kelahiran</div><div class="info-colon"> </div><div class="info-value"> </div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Tanggal</div><div class="info-colon">:</div><div class="info-value">' + formatDate(student.birthDate) + '</div></div>' +
    '<div class="info-row"><div class="info-label">b. Tempat</div><div class="info-colon">:</div><div class="info-value">' + v(student.birthPlace) + '</div></div>' +
  '</div>' +
  '<div class="info-row"><div class="info-label">4. Agama</div><div class="info-colon">:</div><div class="info-value">' + v(student.agama) + '</div></div>' +
  '<div class="info-row"><div class="info-label">5. Kewarganegaraan</div><div class="info-colon">:</div><div class="info-value">' + v(student.kewarganegaraan) + '</div></div>' +
  '<div class="info-row"><div class="info-label">6. Jumlah Saudara</div><div class="info-colon">:</div><div class="info-value">' + v(student.jumlahSaudara) + '</div></div>' +
  '<div class="info-row"><div class="info-label">7. Bahasa Sehari-hari</div><div class="info-colon">:</div><div class="info-value">' + v(student.bahasaSehariHari) + '</div></div>' +
  '<div class="info-row"><div class="info-label">8. Golongan Darah</div><div class="info-colon">:</div><div class="info-value">' + v(student.golonganDarah) + '</div></div>' +
  '<div class="info-row"><div class="info-label">9. Alamat</div><div class="info-colon">:</div><div class="info-value">' + v(student.address) + '</div></div>' +
  '<div class="info-row"><div class="info-label">10. Bertempat tinggal pada</div><div class="info-colon">:</div><div class="info-value">' + v(student.tempatTinggal) + '</div></div>' +
  '<div class="info-row"><div class="info-label">11. Jarak sekolah</div><div class="info-colon">:</div><div class="info-value">' + v(student.jarakSekolahKm) + ' km</div></div>' +
'</div>' +

// B. KETERANGAN ORANG TUA / WALI
'<div class="section-title">B. KETERANGAN ORANG TUA / WALI SISWA</div>' +
'<div class="sub-section">' +
  '<div class="info-row"><div class="info-label">12. Nama Orang Tua Kandung</div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Ayah</div><div class="info-colon">:</div><div class="info-value">' + v(ayah.name) + '</div></div>' +
    '<div class="info-row"><div class="info-label">b. Ibu</div><div class="info-colon">:</div><div class="info-value">' + v(ibu.name) + '</div></div>' +
  '</div>' +
  '<div class="info-row"><div class="info-label">13. Pendidikan Tertinggi</div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Ayah</div><div class="info-colon">:</div><div class="info-value">' + v(ayah.educationLevel) + '</div></div>' +
    '<div class="info-row"><div class="info-label">b. Ibu</div><div class="info-colon">:</div><div class="info-value">' + v(ibu.educationLevel) + '</div></div>' +
  '</div>' +
  '<div class="info-row"><div class="info-label">14. Pekerjaan</div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Ayah</div><div class="info-colon">:</div><div class="info-value">' + v(ayah.occupation) + '</div></div>' +
    '<div class="info-row"><div class="info-label">b. Ibu</div><div class="info-colon">:</div><div class="info-value">' + v(ibu.occupation) + '</div></div>' +
  '</div>' +
  '<div class="info-row"><div class="info-label">15. Wali Murid</div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Nama</div><div class="info-colon">:</div><div class="info-value">' + v(wali.name) + '</div></div>' +
    '<div class="info-row"><div class="info-label">b. Hubungan Keluarga</div><div class="info-colon">:</div><div class="info-value">' + v(wali.relationship) + '</div></div>' +
    '<div class="info-row"><div class="info-label">c. Pendidikan Terakhir</div><div class="info-colon">:</div><div class="info-value">' + v(wali.educationLevel) + '</div></div>' +
    '<div class="info-row"><div class="info-label">d. Pekerjaan</div><div class="info-colon">:</div><div class="info-value">' + v(wali.occupation) + '</div></div>' +
  '</div>' +
'</div>' +

// C. PERKEMBANGAN SISWA
'<div class="section-title">C. PERKEMBANGAN SISWA</div>' +
'<div class="sub-section">' +
  '<div class="info-row"><div class="info-label">16. Pendidikan Sebelumnya</div></div>' +
  '<div class="sub-indent">' +
    '<div class="info-row"><div class="info-label">a. Masuk menjadi siswa</div></div>' +
    '<div class="sub-indent">' +
      '<div class="info-row"><div class="info-label">1. Nama sekolah</div><div class="info-colon">:</div><div class="info-value">' + v(education?.previousSchoolName) + '</div></div>' +
      '<div class="info-row"><div class="info-label">2. Tanggal dan Nomor STTB</div><div class="info-colon">:</div><div class="info-value">' + formatDate(education?.sttbDate) + ' / ' + v(education?.sttbNumber) + '</div></div>' +
    '</div>' +
    '<div class="info-row"><div class="info-label">b. Pindahan dari sekolah lain</div></div>' +
    '<div class="sub-indent">' +
      '<div class="info-row"><div class="info-label">1. Asal sekolah</div><div class="info-colon">:</div><div class="info-value">' + v(education?.transferFromSchool) + '</div></div>' +
      '<div class="info-row"><div class="info-label">2. Dari tingkat</div><div class="info-colon">:</div><div class="info-value">' + v(education?.transferFromClass) + '</div></div>' +
      '<div class="info-row"><div class="info-label">3. Diterima tanggal</div><div class="info-colon">:</div><div class="info-value">' + formatDate(education?.transferAcceptDate) + '</div></div>' +
    '</div>' +
  '</div>' +
'</div>' +

// === PAGE 2: JASMANI & NILAI ===
'<div class="page-break"></div>' +

// E. Keterangan Jasmani
'<div class="section-title">E. Keterangan Jasmani dan Kesehatan Siswa</div>' +
'<div class="sub-section"><b>1. Tinggi dan Berat Badan</b></div>' +
'<table>' +
  '<tr>' +
    '<th rowspan="3">No.</th>' +
    '<th rowspan="3">Aspek</th>' +
    '<th colspan="2">Kls X</th>' +
    '<th colspan="2">Kls XI</th>' +
    '<th colspan="2">Kls XII</th>' +
  '</tr>' +
  '<tr><th>Gnjl</th><th>Gnp</th><th>Gnjl</th><th>Gnp</th><th>Gnjl</th><th>Gnp</th></tr>' +
  '<tr>' +
    '<td>' + dash(physical?.heightCm) + ' cm</td><td>... cm</td>' +
    '<td>... cm</td><td>... cm</td>' +
    '<td>... cm</td><td>... cm</td>' +
  '</tr>' +
  '<tr>' +
    '<td>1</td><td class="text-left">Tinggi Badan</td>' +
    '<td>' + dash(physical?.heightCm) + ' cm</td><td>... cm</td>' +
    '<td>... cm</td><td>... cm</td>' +
    '<td>... cm</td><td>... cm</td>' +
  '</tr>' +
  '<tr>' +
    '<td>2</td><td class="text-left">Berat Badan</td>' +
    '<td>' + dash(physical?.weightKg) + ' kg</td><td>... kg</td>' +
    '<td>... kg</td><td>... kg</td>' +
    '<td>... kg</td><td>... kg</td>' +
  '</tr>' +
'</table>' +

'<div class="sub-section"><b>2. Kondisi Kesehatan</b></div>' +
'<table>' +
  '<tr>' +
    '<th>No.</th><th>Aspek</th>' +
    '<th colspan="2">Kls X</th>' +
    '<th colspan="2">Kls XI</th>' +
    '<th colspan="2">Kls XII</th>' +
  '</tr>' +
  '<tr>' +
    '<td>1</td><td class="text-left">Pendengaran</td>' +
    '<td>' + dash(physical?.hearingCondition) + '</td><td>...</td>' +
    '<td>...</td><td>...</td><td>...</td><td>...</td>' +
  '</tr>' +
  '<tr>' +
    '<td>2</td><td class="text-left">Penglihatan</td>' +
    '<td>' + dash(physical?.visionCondition) + '</td><td>...</td>' +
    '<td>...</td><td>...</td><td>...</td><td>...</td>' +
  '</tr>' +
  '<tr>' +
    '<td>3</td><td class="text-left">Gigi</td>' +
    '<td>' + dash(physical?.dentalCondition) + '</td><td>...</td>' +
    '<td>...</td><td>...</td><td>...</td><td>...</td>' +
  '</tr>' +
'</table>' +

// === PAGE 3: NILAI RAPOR MATRIX ===
'<div class="page-break"></div>' +
'<h2>VI. PENILAIAN HASIL BELAJAR</h2>' +
'<div class="info-row"><div class="info-label">Nama Peserta Didik</div><div class="info-colon">:</div><div class="info-value">' + v(student.fullName) + '</div></div>' +
'<br/>' +
'<table>' +
  '<tr>' +
    '<th rowspan="2" style="width:30px;">No</th>' +
    '<th rowspan="2" style="min-width:140px;" class="text-left">BIDANG STUDI</th>' +
    '<th colspan="2">Kls X</th>' +
    '<th colspan="2">Kls XI</th>' +
    '<th colspan="2">Kls XII</th>' +
  '</tr>' +
  '<tr>' +
    '<th>Sem I</th><th>Sem II</th>' +
    '<th>Sem I</th><th>Sem II</th>' +
    '<th>Sem I</th><th>Sem II</th>' +
  '</tr>' +
  (subjectNames.length > 0
    ? subjectNames.map((sub, i) =>
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td class="text-left">' + sub + '</td>' +
          semCols.map(col => '<td>' + (gradeRows[sub]?.[col.sem] || '') + '</td>').join('') +
        '</tr>'
      ).join('')
    : Array.from({length: 15}, (_, i) =>
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td class="text-left">................................</td>' +
          '<td></td><td></td><td></td><td></td><td></td><td></td>' +
        '</tr>'
      ).join('')
  ) +
'</table>' +

// KETIDAKHADIRAN
'<h2>VII. KETIDAKHADIRAN</h2>' +
'<table>' +
  '<tr>' +
    '<th rowspan="2">Keterangan</th>' +
    '<th colspan="2">Kls X</th>' +
    '<th colspan="2">Kls XI</th>' +
    '<th colspan="2">Kls XII</th>' +
  '</tr>' +
  '<tr>' +
    '<th>Sem I</th><th>Sem II</th>' +
    '<th>Sem I</th><th>Sem II</th>' +
    '<th>Sem I</th><th>Sem II</th>' +
  '</tr>' +
  '<tr><td class="text-left">Sakit (hari)</td>' +
    semCols.map(c => '<td>' + (attMap[c.sem]?.sick || '-') + '</td>').join('') +
  '</tr>' +
  '<tr><td class="text-left">Izin (hari)</td>' +
    semCols.map(c => '<td>' + (attMap[c.sem]?.excused || '-') + '</td>').join('') +
  '</tr>' +
  '<tr><td class="text-left">Tanpa Keterangan (hari)</td>' +
    semCols.map(c => '<td>' + (attMap[c.sem]?.unexcused || '-') + '</td>').join('') +
  '</tr>' +
  '<tr><td class="text-left"><b>Naik / Tidak Naik</b></td>' +
    semCols.map(c => '<td>' + (attMap[c.sem]?.promotionStatus || '-') + '</td>').join('') +
  '</tr>' +
'</table>' +

// EKSTRAKURIKULER
'<h2>VIII. KEGIATAN EKSTRAKURIKULER</h2>' +
'<table>' +
  '<tr>' +
    '<th>No</th><th>Nama Kegiatan</th><th>Kelas</th><th>Semester</th><th>Predikat</th><th>Keterangan</th>' +
  '</tr>' +
  (extracurriculars && extracurriculars.length > 0
    ? extracurriculars.map((e: any, i: number) =>
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td class="text-left">' + (e.activityName || '-') + '</td>' +
          '<td>' + (e.classLevel || '-') + '</td>' +
          '<td>' + (e.semester || '-') + '</td>' +
          '<td>' + (e.predicate || '-') + '</td>' +
          '<td class="text-left">' + (e.description || '-') + '</td>' +
        '</tr>'
      ).join('')
    : '<tr><td>1</td><td class="text-left">.......................</td><td></td><td></td><td></td><td></td></tr>' +
      '<tr><td>2</td><td class="text-left">.......................</td><td></td><td></td><td></td><td></td></tr>'
  ) +
'</table>' +

// P5 / KOKURIKULER
'<h2>IX. PROJEK PENGUATAN PROFIL PELAJAR PANCASILA</h2>' +
'<p class="small"><i>Capaian Akhir Fase</i></p>' +
'<table>' +
  '<tr>' +
    '<th>No</th><th>Fase</th><th>Nama Projek</th><th>Dimensi Pancasila</th><th>Predikat</th>' +
  '</tr>' +
  (p5 && p5.length > 0
    ? p5.map((p: any, i: number) =>
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td>Fase ' + (p.fase || '-') + '</td>' +
          '<td class="text-left">' + (p.projectName || '-') + '</td>' +
          '<td class="text-left">' + (p.dimension || '-') + '</td>' +
          '<td>' + (p.predicate || '-') + '</td>' +
        '</tr>'
      ).join('')
    : '<tr><td>1</td><td></td><td class="text-left">.......................</td><td></td><td></td></tr>' +
      '<tr><td>2</td><td></td><td class="text-left">.......................</td><td></td><td></td></tr>'
  ) +
'</table>' +

'</body></html>';
};
