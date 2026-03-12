import React, { useState, useEffect } from 'react';

export const HeroSection = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // --- CELESTIAL POSITION CALCULATIONS ---

  // Constants for sun movement (06:00 to 18:00)
  const sunriseMinutes = 6 * 60; // 06:00
  const sunsetMinutes = 18 * 60; // 18:00
  const totalDaylightMinutes = sunsetMinutes - sunriseMinutes;
  const isDaytime = timeInMinutes >= sunriseMinutes && timeInMinutes < sunsetMinutes;

  // Calculate Sun Position
  let sunLeft = '50%';
  let sunTop = '100%'; // Start at bottom of sky window
  
  if (isDaytime) {
    const dayProgress = (timeInMinutes - sunriseMinutes) / totalDaylightMinutes;
    sunLeft = `${5 + dayProgress * 90}%`;
    const normalizedX = (dayProgress - 0.5) * 2;
    // Parabola from 100% (horizon) -> 15% (peak) -> 100% (horizon)
    sunTop = `${(normalizedX * normalizedX * 85) + 15}%`; 
  }

  // Calculate Moon Position
  let moonLeft = '50%';
  let moonTop = '100%';
  if (!isDaytime) {
    let nightTimeMinutes = timeInMinutes;
    if (hours >= 18) {
      nightTimeMinutes = timeInMinutes - sunsetMinutes;
    } else {
      nightTimeMinutes = timeInMinutes + (24 * 60 - sunsetMinutes);
    }
    const nightProgress = nightTimeMinutes / (1440 - totalDaylightMinutes);
    moonLeft = `${5 + nightProgress * 90}%`;
    const normalizedNX = (nightProgress - 0.5) * 2;
    moonTop = `${(normalizedNX * normalizedNX * 85) + 15}%`;
  }

  // Moon Phase & Shadow
  const dayOfMonth = currentTime.getDate();
  const phaseProgress = (dayOfMonth % 30) / 30; 
  let moonShadow = '';
  if (!isDaytime) {
    if (phaseProgress < 0.2 || phaseProgress > 0.8) {
      const offset = phaseProgress < 0.2 ? -12 : 12;
      moonShadow = `inset ${offset}px 0px 8px rgba(0,0,0,0.8)`;
    } else if (phaseProgress < 0.4 || phaseProgress > 0.6) {
      const offset = phaseProgress < 0.4 ? -6 : 6;
      moonShadow = `inset ${offset}px 0px 6px rgba(0,0,0,0.5)`;
    }
  }

  // --- STYLE CALCULATIONS ---
  
  const getSkyGradient = () => {
    if (isDaytime) {
      if (hours < 9) return 'from-orange-200 via-sky-300 to-sky-400';
      if (hours > 15) return 'from-sky-400 via-orange-300 to-orange-400';
      return 'from-sky-300 via-sky-400 to-blue-400';
    }
    return 'from-[#0B1026] via-[#161B33] to-[#1D2440]';
  };

  return (
    <section className="relative overflow-hidden w-full h-auto min-h-[75vh] md:min-h-[85vh] pt-24 pb-4 flex flex-col justify-end transition-colors duration-1000 bg-black">
      
      {/* --- DYNAMIC SKY WINDOW (55% HEIGHT) --- */}
      <div className="absolute top-0 left-0 w-full h-[55%] z-[1] overflow-hidden">
        {/* Layer 1: Sky Backdrop */}
        <div className={`absolute inset-0 z-[1] bg-gradient-to-b ${getSkyGradient()} transition-colors duration-3000`}>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-overlay"
            style={{ backgroundImage: "url('/Gambar Langit manda.png')" }}
          ></div>
        </div>

        {/* Layer 1.5: Stars */}
        {!isDaytime && (
          <div className="absolute inset-0 z-[2] opacity-60">
             {[...Array(60)].map((_, i) => (
               <div 
                 key={i}
                 className="absolute bg-white rounded-full animate-pulse blur-[0.5px]"
                 style={{
                   width: Math.random() * 2 + 1 + 'px',
                   height: Math.random() * 2 + 1 + 'px',
                   top: Math.random() * 100 + '%',
                   left: Math.random() * 100 + '%',
                   animationDelay: Math.random() * 5 + 's',
                   animationDuration: Math.random() * 4 + 2 + 's'
                 }}
               />
             ))}
          </div>
        )}

        {/* Layer 2: Celestial Bodies (Moves behind building but within sky window) */}
        <div 
          className="absolute z-[5] pointer-events-none transition-all duration-[2000ms] ease-out flex items-center justify-center -translate-x-1/2"
          style={{ 
            top: isDaytime ? sunTop : moonTop, 
            left: isDaytime ? sunLeft : moonLeft,
            opacity: (isDaytime ? (sunTop.includes('100%') ? 0 : 1) : (moonTop.includes('100%') ? 0 : 1))
          }}
        >
          {isDaytime ? (
            // --- SUN ---
            <>
              <div className="absolute w-[140px] h-[140px] rounded-full bg-yellow-400/10 blur-[20px] animate-pulse-slow"></div>
              <div className="absolute w-[80px] h-[80px] rounded-full bg-orange-300/20 blur-[10px]"></div>
              <div className="relative w-[35px] h-[35px] sm:w-[45px] sm:h-[45px] rounded-full bg-[#FFD966] shadow-[0_0_30px_rgba(255,217,102,0.8)]"></div>
            </>
          ) : (
            // --- MOON ---
            <div className="relative scale-90 sm:scale-110">
              <div className="absolute -inset-10 bg-blue-400/5 blur-2xl rounded-full"></div>
              <div className="absolute -inset-6 bg-white/10 blur-xl rounded-full animate-pulse-slow"></div>
              <div 
                 className="relative w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] rounded-full bg-[#E6E8E3] shadow-[0_0_25px_rgba(255,255,255,0.4)] overflow-hidden"
                 style={{ boxShadow: moonShadow ? `${moonShadow}, 0 0 25px rgba(255,255,255,0.4)` : '0 0 25px rgba(255,255,255,0.4)' }}
              >
                <div className="absolute top-[20%] left-[25%] w-[8px] h-[8px] rounded-full bg-black/5"></div>
                <div className="absolute top-[50%] left-[60%] w-[12px] h-[12px] rounded-full bg-black/5"></div>
                <div className="absolute top-[70%] left-[30%] w-[6px] h-[6px] rounded-full bg-black/5"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Layer 3: Foreground Building (Covers the bottom of the sky window) */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat z-[10] transition-opacity duration-1000 ${isDaytime ? 'opacity-100' : 'opacity-50 brightness-75'}`}
        style={{ backgroundImage: "url('/hero-building.png')" }}
      >
        <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none`}></div>
      </div>

        {/* Kept buttons positioned at the center-bottom */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center pb-8 md:pb-12 w-full max-w-sm md:max-w-none mx-auto">
          <a 
            href="/login" 
            className="px-8 py-4 sm:py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-lg shadow-primary/30 w-full sm:w-auto text-base sm:text-sm flex items-center justify-center gap-2 min-h-[52px] sm:min-h-[44px]"
          >
            Get Started Today
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <a 
            href="#features" 
            className="px-8 py-4 sm:py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 w-full sm:w-auto text-base sm:text-sm backdrop-blur-md flex items-center justify-center min-h-[52px] sm:min-h-[44px]"
          >
            View Features
          </a>
        </div>
    </section>
  );
};
