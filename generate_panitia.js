const fs = require('fs');
const path = require('path');

const servicePath = path.join(process.cwd(), 'apps/api/src/modules/exams/service.ts');
let code = fs.readFileSync(servicePath, 'utf8');

const newFunc = `

  static async exportDaftarHadirPanitiaExcel(ujianId: string) {
    const ujianData = await db.query.ujian.findFirst({
      where: eq(ujian.id, ujianId),
    });
    if (!ujianData) throw new Error("Ujian tidak ditemukan");

    const namaUjian = ujianData.namaUjian;
    const tahunAjaran = ujianData.tahunAjaran;
    const config = (ujianData.pengaturan as any) || {};

    const panitiaDataRaw = await db.select({
      id: panitiaUjian.id,
      jabatan: panitiaUjian.jabatan,
      urutan: panitiaUjian.urutan,
      name: employees.name,
      nip: employees.nip,
      gelarDepan: employees.gelarDepan,
      gelarBelakang: employees.gelarBelakang
    }).from(panitiaUjian)
      .innerJoin(employees, eq(panitiaUjian.pegawaiId, employees.id))
      .where(eq(panitiaUjian.ujianId, ujianId));
      
    // Sort
    const panitiaData = panitiaDataRaw.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    const jadwalList = await db.query.jadwalUjian.findMany({
      where: eq(jadwalUjian.ujianId, ujianId),
    });

    const datesSet = new Set<string>();
    for (const j of jadwalList) {
       if (j.tanggal) datesSet.add(j.tanggal);
    }
    const sortedDateObj = Array.from(datesSet).sort();

    if (sortedDateObj.length === 0) {
      sortedDateObj.push(new Date().toISOString().split('T')[0]);
    }

    const sessionColsCount = sortedDateObj.length;
    const totalCols = 3 + sessionColsCount + 1; // NO, NAMA/NIP, JABATAN, ...dates..., KET

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Hadir Panitia', {
       pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } }
    });

    // KOP
    const cardSettingsList = await db.select().from(cardSettings).limit(1);
    const cardSetting = cardSettingsList[0] || {} as any;
    const configKop = config.kop || {};
    
    sheet.mergeCells(1, 1, 1, totalCols);
    sheet.getCell(1, 1).value = configKop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    sheet.getCell(1, 1).font = { bold: true, size: 12 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(2, 1, 2, totalCols);
    sheet.getCell(2, 1).value = configKop.instansi || 'MADRASAH ALIYAH';
    sheet.getCell(2, 1).font = { bold: true, size: 14 };
    sheet.getCell(2, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell(3, 1).value = configKop.panitia || \`PANITIA \${namaUjian} TAHUN AJARAN \${tahunAjaran}\`;
    sheet.getCell(3, 1).font = { bold: true, size: 11 };
    sheet.getCell(3, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(4, 1, 4, totalCols);
    sheet.getCell(4, 1).value = configKop.alamat || 'Alamat';
    sheet.getCell(4, 1).font = { size: 10 };
    sheet.getCell(4, 1).alignment = { horizontal: 'center' };
    
    for (let c = 1; c <= totalCols; c++) {
       const cell = sheet.getCell(4, c);
       cell.border = { bottom: { style: 'double' } };
    }

    const getColLetter = (colIndex: number) => {
      let letter = '';
      while (colIndex > 0) {
        let mod = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        colIndex = Math.floor((colIndex - mod) / 26);
      }
      return letter;
    };

    try {
      if (cardSetting.kemenagLogoUrl) { 
        const logoKiriPath = path.join(process.cwd(), 'uploads', path.basename(cardSetting.kemenagLogoUrl));
        if (require('fs').existsSync(logoKiriPath)) {
          let ext = path.extname(logoKiriPath).substring(1).toLowerCase();
          if (ext === 'jpg') ext = 'jpeg';
          const logoId = workbook.addImage({ filename: logoKiriPath, extension: ext as any });
          sheet.addImage(logoId, 'A1:A4');
        }
      }
      if (cardSetting.schoolLogoUrl) { 
        const logoKananPath = path.join(process.cwd(), 'uploads', path.basename(cardSetting.schoolLogoUrl));
        if (require('fs').existsSync(logoKananPath)) {
          let ext = path.extname(logoKananPath).substring(1).toLowerCase();
          if (ext === 'jpg') ext = 'jpeg';
          const logoId = workbook.addImage({ filename: logoKananPath, extension: ext as any });
          const colLetter = getColLetter(totalCols);
          sheet.addImage(logoId, \`\${colLetter}1:\${colLetter}4\`);
        }
      }
    } catch (e) {}

    sheet.addRow([]);

    // Title DAFTAR HADIR PANITIA
    sheet.mergeCells(6, 1, 6, totalCols);
    sheet.getCell(6, 1).value = 'DAFTAR HADIR PANITIA';
    sheet.getCell(6, 1).font = { bold: true, size: 14 };
    sheet.getCell(6, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(7, 1, 7, totalCols);
    sheet.getCell(7, 1).value = namaUjian;
    sheet.getCell(7, 1).font = { bold: true, size: 12 };
    sheet.getCell(7, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(8, 1, 8, totalCols);
    sheet.getCell(8, 1).value = \`TAHUN AJARAN \${tahunAjaran}\`;
    sheet.getCell(8, 1).font = { bold: true, size: 12 };
    sheet.getCell(8, 1).alignment = { horizontal: 'center' };

    sheet.addRow([]); 
    
    // Table Header Structure (Rows 10 and 11)
    sheet.mergeCells(10, 1, 11, 1);
    sheet.getCell(10, 1).value = 'NO';
    
    sheet.mergeCells(10, 2, 11, 2);
    sheet.getCell(10, 2).value = 'NAMA/NIP';

    sheet.mergeCells(10, 3, 11, 3);
    sheet.getCell(10, 3).value = 'JABATAN KEPANITIAAN';
    
    sheet.mergeCells(10, totalCols, 11, totalCols);
    sheet.getCell(10, totalCols).value = 'KET.';
    
    if (sessionColsCount > 1) {
       sheet.mergeCells(10, 4, 10, 3 + sessionColsCount);
    }
    sheet.getCell(10, 4).value = 'TANDA TANGAN KEHADIRAN SESUAI HARI DAN JAM PENUGASAN';
    
    let currentCol = 4;
    const dateNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for (const d of sortedDateObj) {
       const ts = new Date(d);
       const dayName = dateNames[ts.getDay()];
       const displayDate = \`\${dayName}, \${ts.toLocaleDateString('id-ID')}\`;
       
       sheet.getCell(11, currentCol).value = displayDate;
       currentCol += 1;
    }
    
    const thinBorder = {
       top: { style: 'thin' }, left: { style: 'thin' },
       bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    for (let r = 10; r <= 11; r++) {
       for (let c = 1; c <= totalCols; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;
       }
       sheet.getRow(r).height = 20;
    }
    
    // Data Rows
    let startDataRow = 12;
    const loopData = panitiaData.length > 0 ? panitiaData : Array.from({length: 5}).map(() => ({}));
    
    loopData.forEach((emp, index) => {
       const rIdx = startDataRow + index;
       const row = sheet.getRow(rIdx);
       
       // NO
       const cellNo = sheet.getCell(rIdx, 1);
       cellNo.value = index + 1;
       cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
       cellNo.border = thinBorder;
       
       // NAMA/NIP
       let fName = emp.name ? \`\${emp.gelarDepan ? emp.gelarDepan + ' ' : ''}\${emp.name}\${emp.gelarBelakang ? ', ' + emp.gelarBelakang : ''}\` : '';
       let fnip = emp.nip ? \`NIP. \${emp.nip}\` : '';
       const cellName = sheet.getCell(rIdx, 2);
       if (fName) {
           cellName.value = { richText: [{ text: fName + '\\n' }, { text: fnip, font: { size: 9 } }] };
       } else {
           cellName.value = '';
       }
       cellName.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
       cellName.border = thinBorder;

       // JABATAN
       const cellJab = sheet.getCell(rIdx, 3);
       cellJab.value = emp.jabatan || '';
       cellJab.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
       cellJab.border = thinBorder;
       cellJab.font = { bold: true, size: 10 };
       
       // TTD and KET
       for(let c = 4; c <= totalCols; c++) {
          const cttd = sheet.getCell(rIdx, c);
          cttd.border = thinBorder;
          if (c < totalCols) { // If it's a date/signature column
              const isOdd = (index + 1) % 2 !== 0;
              cttd.value = \`\${index + 1}.\`;
              cttd.alignment = isOdd ? { horizontal: 'left', vertical: 'top' } : { horizontal: 'center', vertical: 'middle' };
              cttd.font = { size: 9 };
          }
       }
       
       row.height = 35;
    });
    
    // Widths
    sheet.getColumn(1).width = 5; 
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 15; 
    for (let c = 4; c < totalCols; c++) {
       sheet.getColumn(c).width = 15; 
    }
    sheet.getColumn(totalCols).width = 8; 
    
    // Signature block
    const distribTtd = config.ttd || {}; 
    const ttdRow = startDataRow + loopData.length + 2;
    const ttdColStart = Math.max(4, totalCols - 3);
    
    let tglStr = distribTtd.tanggal;
    try {
      if (tglStr) {
         const tDate = new Date(tglStr);
         const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
         tglStr = \`\${tDate.getDate()} \${months[tDate.getMonth()]} \${tDate.getFullYear()}\`;
      }
    } catch(e) {}
    
    sheet.mergeCells(ttdRow, ttdColStart, ttdRow, totalCols);
    sheet.getCell(ttdRow, ttdColStart).value = \`\${distribTtd.tempat || '..............'}, \${tglStr || '......................'}\`;
    sheet.getCell(ttdRow, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 1, ttdColStart, ttdRow + 1, totalCols);
    sheet.getCell(ttdRow + 1, ttdColStart).value = distribTtd.jabatan || 'Kepala Madrasah';
    sheet.getCell(ttdRow + 1, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 5, ttdColStart, ttdRow + 5, totalCols);
    sheet.getCell(ttdRow + 5, ttdColStart).value = distribTtd.nama || '(...........................)';
    sheet.getCell(ttdRow + 5, ttdColStart).font = { bold: true };
    sheet.getCell(ttdRow + 5, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 6, ttdColStart, ttdRow + 6, totalCols);
    sheet.getCell(ttdRow + 6, ttdColStart).value = distribTtd.nip ? \`NIP. \${distribTtd.nip}\` : '';
    sheet.getCell(ttdRow + 6, ttdColStart).alignment = { horizontal: 'center' };

    return await workbook.xlsx.writeBuffer();
  }
`;

const lastBraceIdx = code.lastIndexOf('}');
if (lastBraceIdx !== -1) {
   code = code.substring(0, lastBraceIdx) + newFunc + '\n}\n';
   fs.writeFileSync(servicePath, code);
   console.log('Successfully injected exportDaftarHadirPanitiaExcel');
} else {
   console.log('Failed to find closing brace');
}
