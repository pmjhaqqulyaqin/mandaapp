import React, { useState, useEffect } from 'react';

export interface HeroSectionProps {
  logoUrl?: string;
  schoolName?: string;
}

export const HeroSection = ({ logoUrl, schoolName }: HeroSectionProps) => {
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

  // --- MOON PHASE & HIJRI CALCULATIONS ---
  const getHijriDay = (date: Date): number => {
    try {
      // The 'en-US' locale with the 'u-ca-islamic' calendar guarantees western-arabic numerals.
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', { day: 'numeric' });
      const dayStr = formatter.format(date);
      return parseInt(dayStr, 10) || 15;
    } catch (e) {
      // Fallback pseudo-lunar cycle if browser doesn't support the islamic calendar standard
      return date.getDate() % 30 || 15;
    }
  };

  const hijriDay = getHijriDay(currentTime);
  let moonShadow = '';
  let moonGlow = '0 0 25px rgba(255,255,255,0.4)';
  
  if (!isDaytime) {
    // Math: Translate Day 1->30 into Shadow Offset 50px -> -50px
    // A positive offset casts shadow from the left (Waxing Phase)
    // A negative offset casts shadow from the right (Waning Phase)
    const moonBaseSize = 40; // Desktop size is 50, mobile 40. We use 50 for shadow math limits.
    const maxShadow = 50; 
    
    // Day 1  = 50px (All black)
    // Day 15 = 0px (Full Moon)
    // Day 30 = -50px (All black from right)
    let rawOffset = maxShadow - ((hijriDay - 1) / 29) * (maxShadow * 2);
    
    // Tweak to ensure 'Full Moon' peaks perfectly flat at 0 around days 14-15
    if (hijriDay === 14 || hijriDay === 15) {
        rawOffset = 0;
    }

    // Creating dual layered inset to mimic natural curved spherical terminator
    // The background acts as the dark night sky intersecting the light.
    const skyIntersectColor = 'rgba(11, 16, 38, 0.98)';
    moonShadow = `inset ${rawOffset}px 0px 4px -2px ${skyIntersectColor}, inset ${rawOffset * 1.2}px 0px 10px ${skyIntersectColor}`;
    
    // Dynamic Glow intensity based on lunar exposure
    // Full moons glow way more intensely than crescents
    const exposure = 1 - Math.abs(rawOffset / maxShadow); // 0.0 (Dark) to 1.0 (Full)
    const glowRadius = 15 + (exposure * 45); // Scales from 15px to 60px
    const glowAlpha = 0.2 + (exposure * 0.4); // Scales from 0.2 opacity to 0.6
    moonGlow = `0 0 ${glowRadius}px rgba(210, 230, 255, ${glowAlpha})`;
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
                 className="relative w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] rounded-full bg-[#E6E8E3] overflow-hidden"
                 style={{ 
                   boxShadow: moonShadow ? `${moonShadow}, ${moonGlow}` : moonGlow,
                   transition: 'box-shadow 2s ease-in-out'
                 }}
              >
                {/* Surface Craters - Using opacity so they fade naturally under the deep shadow */}
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

      {/* --- GLOWING FLOATING SCHOOL IDENTITY OVERLAY --- */}
      <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center pointer-events-none -translate-y-20 sm:-translate-y-28 md:-translate-y-36">
        {logoUrl && (
          <img 
            src={logoUrl} 
            alt="School Logo" 
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-2 sm:mb-3 object-contain animate-fade-in-up" 
            style={{ filter: 'drop-shadow(0px 0px 20px rgba(255, 255, 255, 0.5))' }}
          />
        )}
        <h1 
          className="text-white font-heading font-black text-center text-xl sm:text-xl md:text-2xl lg:text-2xl px-4 animate-fade-in-up md:tracking-tight"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(0, 150, 255, 0.4)',
            animationDelay: '0.2s'
          }}
        >
          {schoolName || "MAN 2 LOMBOK TIMUR"}
        </h1>
      </div>

        {/* Removed CTA buttons at user request */}
    </section>
  );
};
