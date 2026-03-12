import React, { useState } from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

interface ContactSectionProps {
  onSubmit?: (data: { name: string; email: string; subject: string; message: string }) => void;
  schoolName?: string;
  address?: string;
  phone?: string;
  email?: string;
  mapEmbedUrl?: string;
  logoUrl?: string;
}

export const ContactSection = ({
  onSubmit,
  schoolName = 'MAN 2 LOMBOK TIMUR',
  address = 'Jln. Pendidikan No. 1, Selong, Lombok Timur',
  phone = '0376-21xxx',
  email = 'info@man2lotim.sch.id',
  mapEmbedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15774.965706249533!2d116.53603411037699!3d-8.620959400262174!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dcc4ebbd7cd48b1%3A0xc3fec8675123d467!2sMAN%202%20Lombok%20Timur%20(Selong)!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid',
  logoUrl,
}: ContactSectionProps) => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      alert('Harap isi nama, email, dan pesan.');
      return;
    }
    setStatus('sending');
    if (onSubmit) {
      try {
        onSubmit({ ...formData, subject: formData.subject || 'Pesan dari Website' });
        setStatus('sent');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setStatus('idle'), 3000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  return (
    <div
      id="contact"
      className="relative bg-background-light dark:bg-background-dark py-6 sm:py-8 lg:py-10 overflow-hidden"
    >
      {/* Background Doodle Image */}
      <div 
        className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('/school_doodle_bg.png')",
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6">
        
        {/* Card Container */}
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl shadow-sm border border-emerald-200 dark:border-gray-800 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full">
          
          {/* Left Column - Contact Form */}
          <div className="flex flex-col justify-between h-full">
            <h2 className="text-xl font-bold text-text-primary dark:text-text-darkPrimary mb-3 text-center">
              Contact
            </h2>
            
            <form className="flex flex-col flex-1 gap-4 mt-3" onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-text-primary dark:text-text-darkPrimary transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-text-primary dark:text-text-darkPrimary transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 mt-2 flex flex-col">
                <textarea
                  placeholder="Pesan"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full flex-1 min-h-[70px] bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-text-primary dark:text-text-darkPrimary resize-none transition-colors"
                ></textarea>
              </div>

              <div className="mt-2 flex flex-col items-center">
                <p className="text-xs text-text-secondary text-center mb-2">
                  *NB anda tidak perlu login untuk mengisi kritik dan saran
                </p>
                <div className="flex justify-center w-full">
                  {status === 'sent' ? (
                    <div className="px-8 py-2.5 rounded-full border-2 border-emerald-600 text-emerald-600 font-semibold flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Terkirim!
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="px-8 py-2.5 rounded-full border-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500 font-semibold hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      {status === 'sending' ? 'Mengirim...' : 'Kirim'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Map & Info */}
          <div className="flex flex-col items-center text-center h-full justify-between">
            <div className="flex flex-col items-center">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain mb-1" />
              )}
              <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-2">
                {schoolName}
              </h2>
              
              <div className="flex flex-col gap-1 mb-4 text-sm text-text-secondary items-center">
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" /> 
                  {address}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" /> 
                    {phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-600" /> 
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative w-full flex-1 min-h-[200px] mt-2 rounded-xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm bg-gray-100 dark:bg-gray-800">
              <iframe 
                src={mapEmbedUrl} 
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps"
              ></iframe>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
};
