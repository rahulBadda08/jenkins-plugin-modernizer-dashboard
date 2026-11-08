import React, { useEffect, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const follower = followerRef.current;
    if (!dot || !follower) return;

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) {
      dot.style.display = 'none';
      follower.style.display = 'none';
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let followerX = mouseX;
    let followerY = mouseY;
    let animId: number;
    let isVisible = false;

    // Initially hide until first mouse interaction
    dot.style.opacity = '0';
    follower.style.opacity = '0';

    const updateCursor = (x: number, y: number) => {
      mouseX = x;
      mouseY = y;
      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = '1';
        follower.style.opacity = '1';
      }
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      document.documentElement.style.setProperty('--mouse-x', `${mouseX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${mouseY}px`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateCursor(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => {
      dot.style.opacity = '0';
      follower.style.opacity = '0';
      isVisible = false;
    };

    const handleMouseEnter = () => {
      dot.style.opacity = '1';
      follower.style.opacity = '1';
      isVisible = true;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        'button, a, [role="button"], [role="tab"], .clickable, .kinetic-card, .terminal-card, .tab-btn, .industrial-btn, input, select'
      );

      if (target) {
        follower.style.width = '60px';
        follower.style.height = '60px';
        follower.style.background = 'rgba(212, 237, 44, 0.4)';
        follower.style.boxShadow = '0 0 15px rgba(212, 237, 44, 0.3)';
        follower.style.borderWidth = '0px';
        dot.style.opacity = '0';
      } else {
        follower.style.width = '34px';
        follower.style.height = '34px';
        follower.style.background = 'transparent';
        follower.style.boxShadow = 'none';
        follower.style.borderWidth = '1.5px';
        if (isVisible) {
          dot.style.opacity = '1';
        }
      }
    };

    function animate() {
      followerX += (mouseX - followerX) * 0.35;
      followerY += (mouseY - followerY) * 0.35;
      follower!.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
      animId = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseover', handleMouseOver);
    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '6px',
          height: '6px',
          background: '#D4ED2C',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 100000,
          willChange: 'transform',
          transform: 'translate(-50%, -50%)',
          transition: 'opacity 0.2s ease',
        }}
      />
      <div
        ref={followerRef}
        className="cursor-follower"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '34px',
          height: '34px',
          border: '1.5px solid #D4ED2C',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform, width, height, background, border-width, box-shadow',
          transform: 'translate(-50%, -50%)',
          transition:
            'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease, border-width 0.4s ease, box-shadow 0.4s ease, opacity 0.2s ease',
        }}
      />
    </>
  );
};

export default CustomCursor;
