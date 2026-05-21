export const generateBukuIndukTemplate = (data: any) => {
  const { student, parents, education, physical, grades, absences } = data;

  const getParent = (type: string) => parents?.find((p: any) => p.type === type) || {};

  const ayah = getParent('ayah');
  const ibu = getParent('ibu');
  const wali = getParent('wali');

  const getSafeVal = (val: any) => val || '....................';

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Buku Induk Peserta Didik</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 0;
          padding: 20px;
        }
        h2 {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          margin-bottom: 5px;
        }
        .info-label {
          width: 200px;
        }
        .info-colon {
          width: 20px;
        }
        .info-value {
          flex: 1;
        }
        .section-title {
          font-weight: bold;
          margin-top: 15px;
          margin-bottom: 10px;
        }
        .photo-box {
          width: 3cm;
          height: 4cm;
          border: 1px solid #000;
          float: right;
          margin-left: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10pt;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        table, th, td {
          border: 1px solid #000;
        }
        th, td {
          padding: 5px;
          text-align: center;
        }
        .text-left {
          text-align: left;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>

      <h2>IV. LEMBAR BUKU INDUK PESERTA DIDIK</h2>
      
      <div class="header-section">
        <div>
          <div class="info-row"><div class="info-label">Nomor Induk Siswa</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.nis)}</div></div>
          <div class="info-row"><div class="info-label">NISN / NISM</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.nisn)}</div></div>
        </div>
        <div>
          <div class="info-row"><div class="info-label">NIK</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.nik)}</div></div>
          <div class="info-row"><div class="info-label">No. KK</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.noKk)}</div></div>
        </div>
      </div>

      <div class="photo-box">
        ${student.photoUrl ? `<img src="${student.photoUrl}" style="width:100%; height:100%; object-fit:cover;" />` : 'Pas Foto<br/>3x4'}
      </div>

      <div class="section-title">A. KETERANGAN SISWA</div>
      <div class="info-row"><div class="info-label">1. Nama Lengkap</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.fullName)}</div></div>
      <div class="info-row"><div class="info-label">2. Jenis Kelamin</div><div class="info-colon">:</div><div class="info-value">${student.gender === 'Laki-laki' ? 'Laki-laki / <s>Perempuan</s> *' : student.gender === 'Perempuan' ? '<s>Laki-laki</s> / Perempuan *' : 'Laki-laki / Perempuan *'}</div></div>
      <div class="info-row"><div class="info-label">3. Kelahiran (Tempat, Tgl)</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.birthPlace)}, ${getSafeVal(student.birthDate)}</div></div>
      <div class="info-row"><div class="info-label">4. Alamat</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.address)}</div></div>

      <div class="section-title">B. KETERANGAN ORANG TUA / WALI SISWA</div>
      <div class="info-row"><div class="info-label">1. Nama Ayah</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(ayah.name)}</div></div>
      <div class="info-row"><div class="info-label">2. Pekerjaan Ayah</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(ayah.occupation)}</div></div>
      <div class="info-row"><div class="info-label">3. Nama Ibu</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(ibu.name)}</div></div>
      <div class="info-row"><div class="info-label">4. Pekerjaan Ibu</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(ibu.occupation)}</div></div>

      <div class="section-title">C. PERKEMBANGAN SISWA</div>
      <div class="info-row"><div class="info-label">Pendidikan Sebelumnya</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(education?.previousSchoolName)}</div></div>
      
      <div class="page-break"></div>

      <h2>E. Keterangan Jasmani dan Kesehatan Siswa</h2>
      <table>
        <tr>
          <th rowspan="2">Aspek yang Dinilai</th>
          <th colspan="2">Tahun Pelajaran</th>
        </tr>
        <tr>
          <th>Ganjil</th>
          <th>Genap</th>
        </tr>
        <tr>
          <td class="text-left">Tinggi Badan (Cm)</td>
          <td>${getSafeVal(physical?.heightCm)}</td>
          <td>${getSafeVal(physical?.heightCm)}</td>
        </tr>
        <tr>
          <td class="text-left">Berat Badan (Kg)</td>
          <td>${getSafeVal(physical?.weightKg)}</td>
          <td>${getSafeVal(physical?.weightKg)}</td>
        </tr>
      </table>

      <h2>IV. LAPORAN HASIL CAPAIAN PEMBELAJARAN</h2>
      <div class="info-row">
        <div class="info-label" style="width:100px;">Nama Siswa</div><div class="info-colon">:</div><div class="info-value" style="width:300px;">${getSafeVal(student.fullName)}</div>
        <div class="info-label" style="width:100px;">Kelas</div><div class="info-colon">:</div><div class="info-value">${getSafeVal(student.className)}</div>
      </div>
      
      <br/>
      <table>
        <tr>
          <th>NO</th>
          <th>MATA PELAJARAN</th>
          <th>Nilai Akhir</th>
        </tr>
        ${grades && grades.length > 0 ? grades.map((g: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td class="text-left">${g.subjectName}</td>
            <td>${g.score}</td>
          </tr>
        `).join('') : `
          <tr><td>1</td><td class="text-left">......................................</td><td>......</td></tr>
          <tr><td>2</td><td class="text-left">......................................</td><td>......</td></tr>
        `}
      </table>

    </body>
    </html>
  `;
};
