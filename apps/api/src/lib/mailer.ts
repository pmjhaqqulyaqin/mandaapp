import nodemailer from 'nodemailer';

export const sendServiceEmail = async (
  to: string, 
  ticketId: string, 
  status: string, 
  adminReply: string | undefined, 
  applicantName: string,
  serviceType: string
) => {
  // To use this, the user must set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[MAILER] SMTP_USER or SMTP_PASS not set in .env! Skipping email to ${to} for ticket ${ticketId}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const getStatusText = () => {
    switch (status) {
      case 'completed': return 'Selesai / Disetujui';
      case 'rejected': return 'Ditolak / Divalidasi Ulang';
      case 'processing': return 'Sedang Diproses';
      default: return 'Menunggu Antrean';
    }
  };

  const statusColor = status === 'completed' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#3b82f6';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a73e8; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Mandaapp - Update Layanan Anda</h2>
      <p>Halo <strong>${applicantName}</strong>,</p>
      <p>Berikut adalah pembaruan status untuk permohonan <strong>${serviceType}</strong> Anda:</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid ${statusColor};">
        <p style="margin: 0 0 10px 0;"><strong>Nomor Resi:</strong> ${ticketId}</p>
        <p style="margin: 0 0 10px 0;"><strong>Status Terkini:</strong> <span style="color: ${statusColor}; font-weight: bold;">${getStatusText()}</span></p>
        ${adminReply ? `<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px dashed #cbd5e1;"><strong>Catatan dari Admin:</strong><br/><span style="display:inline-block; margin-top:5px; white-space: pre-wrap;">${adminReply}</span></p>` : ''}
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Anda dapat melacak status terkini secara langsung melalui portal Pelayanan Terpadu di website sekolah kami.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f0f0f0; padding-top: 20px; text-align: center;">
        Ini adalah pesan otomatis dari sistem E-PTSP Mandaapp.<br/>Harap tidak merespons email ini.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Mandaapp Pusat Layanan" <${process.env.SMTP_USER}>`,
      to,
      subject: `Update Permohonan [${ticketId}] - ${getStatusText()}`,
      html: htmlContent
    });
    console.log(`[MAILER] Notification sent for ticket ${ticketId}: ${info.messageId}`);
  } catch (err: any) {
    console.error(`[MAILER] Failed to send email for ticket ${ticketId}:`, err);
  }
};

export const sendSurveyEmail = async (
  to: string, 
  applicantName: string,
) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[MAILER] SMTP_USER or SMTP_PASS not set in .env! Skipping survey email to ${to}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #10b981; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Terima Kasih, ${applicantName}!</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Terima kasih banyak telah meluangkan waktu berharga Anda untuk berpartisipasi memberikan rating pelayanan pada aplikasi SALAM MANDA.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        Kami menyampaikan apresiasi setinggi-tingginya atas setiap penilaian dan masukan yang Anda berikan. Umpan balik dari Anda adalah fondasi utama bagi kami untuk terus mengevaluasi dan meningkatkan standar kualitas layanan Satu Pintu di MAN 2 Lombok Timur.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155; font-weight: bold;">
        Kami berkomitmen untuk selalu menghadirkan pelayanan yang lebih cepat, mudah, dan prima ke depannya.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f0f0f0; padding-top: 20px; text-align: center;">
        Ini adalah pesan otomatis dari sistem E-PTSP Mandaapp.<br/>Harap tidak merespons email ini.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Mandaapp Pusat Layanan" <${process.env.SMTP_USER}>`,
      to,
      subject: `Terima Kasih Atas Partisipasi Anda di SALAM MANDA`,
      html: htmlContent
    });
    console.log(`[MAILER] Survey thank you email sent to: ${to}`);
  } catch (err: any) {
    console.error(`[MAILER] Failed to send survey email to ${to}:`, err);
  }
};
