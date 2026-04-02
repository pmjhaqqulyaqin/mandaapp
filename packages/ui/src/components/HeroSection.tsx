import React, { useState, useEffect } from 'react';

export interface HeroSectionProps {
  logoUrl?: string;
  schoolName?: string;
  mode?: 'animation' | 'slider';
  sliderImages?: string[];
  sliderDuration?: number; // in seconds
}

export const HeroSection = ({ 
  logoUrl, 
  schoolName,
  mode = 'animation',
  sliderImages = [],
  sliderDuration = 8
}: HeroSectionProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Update time every minute
    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timeTimer);
  }, []);

  useEffect(() => {
    if (mode === 'slider' && sliderImages.length > 1) {
      const slideTimer = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % sliderImages.length);
      }, sliderDuration * 1000);
      return () => clearInterval(slideTimer);
    }
  }, [mode, sliderImages.length, sliderDuration]);
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
  let dropShadowFilter = 'drop-shadow(0 0 25px rgba(255,255,255,0.4))';
  
  if (!isDaytime) {
    // Math: Translate Day 1->30 into Bright Inset Offset
    // Waxing (Day 1-15) -> Light grows on the RIGHT (- offset)
    // Waning (Day 16-30) -> Light shrinks on the LEFT (+ offset)
    const moonBaseSize = 50; // Shadow offset basis
    let rawOffset = 0;
    
    if (hijriDay <= 15) {
      // Day 1 to 15 (0 to -50)
      const progress = (hijriDay - 1) / 14; 
      // Apply an exponential curve to keep crescents thin naturally early on
      rawOffset = -(Math.pow(progress, 1.5) * moonBaseSize);
    } else {
      // Day 16 to 30 (50 to 0)
      const progress = (30 - hijriDay) / 15;
      rawOffset = (Math.pow(progress, 1.5) * moonBaseSize);
    }

    // Tweak to ensure 'Full Moon' peaks perfectly flat at 50px
    if (hijriDay === 14 || hijriDay === 15) {
        rawOffset = hijriDay === 14 ? -moonBaseSize : moonBaseSize;
    }

    // Creating realistic transparent crescent using bright inset shadow
    // The base div will be transparent, so ONLY this bright sliver is visible!
    // Reduced blur to make the sliver sharper and more delicate
    moonShadow = `inset ${rawOffset}px 0px 2px 0px #E6E8E3, inset ${rawOffset * 1.05}px 0px 6px -2px #FFF`;
    
    // Dynamic Glow intensity based on lunar exposure
    const exposure = Math.abs(rawOffset / moonBaseSize); // 0.0 (New) to 1.0 (Full)
    const glowRadius = 8 + (exposure * 25); // 8px to 33px
    const glowAlpha = 0.2 + (exposure * 0.4); // 0.2 to 0.6
    dropShadowFilter = `drop-shadow(0 0 ${glowRadius}px rgba(210, 230, 255, ${glowAlpha}))`;
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

  const isAnimation = mode === 'animation' || sliderImages.length === 0;

  return (
    <section className="relative overflow-hidden w-full h-auto min-h-[60vh] sm:min-h-[70vh] md:min-h-[85vh] lg:min-h-[90vh] pt-16 pb-3 flex flex-col justify-end transition-colors duration-1000 bg-black">
      
      {/* --- LAYER 0: SLIDER IMAGES (If Slider Mode) --- */}
      {!isAnimation && sliderImages.length > 0 && (
        <div className="absolute inset-0 z-[1] bg-[#0B1026]">
          {sliderImages.map((img, idx) => (
            <img 
              key={`${img}-${idx}`}
              src={img}
              alt={`Slider ${idx}`}
              /** TRICK 3: Preload LCP Instantly */
              fetchPriority={idx === 0 ? "high" : "auto"}
              loading={idx === 0 ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              /** TRICK 2: Hardware acceleration via opacity */
              style={{ opacity: currentSlideIndex === idx ? 1 : 0 }}
            />
          ))}
          {/* Subtle gradient overlay to ensure text legibility over any photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-[2] pointer-events-none"></div>
        </div>
      )}

      {/* --- CELESTIAL & SKY LAYERS (If Animation Mode) --- */}
      {isAnimation && (
        <>
          {/* --- DYNAMIC SKY BACKGROUND (Extends down to 55% to fill black gaps) --- */}
          <div className={`absolute top-0 left-0 w-full h-[55%] z-[1] bg-gradient-to-b ${getSkyGradient()} transition-colors duration-3000`}></div>

          {/* --- CELESTIAL BODIES CLIPPING WINDOW (45% HEIGHT) --- */}
          <div className="absolute top-0 left-0 w-full h-[45%] z-[2] overflow-hidden pointer-events-none">
            {/* Layer 1.5: Stars */}
        {!isDaytime && (
          <div className="absolute inset-0 z-[1] opacity-60">
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
          className="absolute z-[2] pointer-events-none transition-all duration-[2000ms] ease-out flex items-center justify-center -translate-x-1/2"
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
                 className="relative w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] rounded-full bg-transparent overflow-hidden"
                 style={{ 
                   boxShadow: moonShadow,
                   filter: dropShadowFilter,
                   transition: 'box-shadow 2s ease-in-out, filter 2s ease-in-out'
                 }}
              >
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Layer 3: Sky Backdrop Image (Contains Trees & Mountains) positioned over sun/moon */}
      <div className="absolute top-0 left-0 w-full h-[55%] z-[3] pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 bg-no-repeat opacity-60 mix-blend-overlay bg-[length:auto_100%] md:bg-cover bg-bottom animate-pan-slow md:animate-none"
          style={{ backgroundImage: "url('/Gambar Langit manda.png')" }}
        ></div>
      </div>

      {/* Layer 3: Foreground Building (Covers the bottom of the sky window) */}
      <div 
        className={`absolute inset-0 bg-no-repeat z-[10] transition-opacity duration-1000 ${isDaytime ? 'opacity-100' : 'opacity-50 brightness-75'} bg-[length:auto_100%] md:bg-cover bg-bottom animate-pan-slow md:animate-none`}
        style={{ backgroundImage: "url('/hero-building.png')" }}
      >
        <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none`}></div>
      </div>
      </>
    )}

      {/* --- GLOWING FLOATING SCHOOL IDENTITY OVERLAY --- */}
      <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center pointer-events-none -translate-y-14 sm:-translate-y-20 md:-translate-y-24">
        {logoUrl && (
          <img 
            src={logoUrl} 
            alt="School Logo" 
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mb-1.5 sm:mb-2 object-contain animate-fade-in-up" 
            style={{ filter: 'drop-shadow(0px 0px 20px rgba(255, 255, 255, 0.5))' }}
          />
        )}
        <h1 
          className="text-white font-heading font-black text-center text-lg sm:text-lg md:text-xl lg:text-xl px-4 animate-fade-in-up md:tracking-tight"
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
