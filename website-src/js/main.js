/**
 * AetherNode POF — Tanıtım Sitesi JavaScript
 * Vanilla JS · Performans odaklı · Progressive enhancement
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initFAQ();
  initMobileMenu();
  initMagneticButtons();
  initCounters();
  initNavbarScroll();
  initActiveNav();
  initParallax();
  initParticles();
  initScrollProgress();
  initKeyboardNav();
  initCursorGlow();
  initSmoothScroll();
  initInteractiveMockup();
});

/* ==========================================================================
   1. Scroll-Triggered Reveal (IntersectionObserver)
   ========================================================================== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ==========================================================================
   2. FAQ Accordion
   ========================================================================== */
function initFAQ() {
  document.querySelectorAll('.faq__q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq__item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      // Diğerlerini kapat
      item.closest('.faq')?.querySelectorAll('.faq__item.open').forEach(i => {
        if (i !== item) i.classList.remove('open');
      });
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen);
    });
  });
}

/* ==========================================================================
   3. Mobil Hamburger Menü
   ========================================================================== */
function initMobileMenu() {
  const ham = document.getElementById('hamburger');
  const nav = document.getElementById('nav-links');
  if (!ham || !nav) return;

  ham.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    ham.classList.toggle('active', isOpen);
    ham.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Menü linkleri tıklanınca kapat
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      ham.classList.remove('active');
      ham.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ==========================================================================
   4. Magnetic Button Hover Efekti
   ========================================================================== */
function initMagneticButtons() {
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

/* ==========================================================================
   5. Animasyonlu Sayaç (İstatistikler)
   ========================================================================== */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => io.observe(el));
}

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '+';
  const duration = 1800;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.round(target * ease);
    el.textContent = current.toLocaleString('tr-TR') + (target > 0 ? suffix : '');
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ==========================================================================
   6. Navbar Scroll Opaklık Değişimi
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const opacity = Math.min(scrollY / 200, 1);
        navbar.style.background = `rgba(11,11,15,${0.6 + opacity * 0.35})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ==========================================================================
   7. Aktif Navigasyon Vurgulama
   ========================================================================== */
function initActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav__links a:not(.nav__cta)').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (path.endsWith(href) || (href === 'index.html' && (path.endsWith('/') || path.endsWith('/browser/'))))) {
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ==========================================================================
   8. Aurora Parallax (Fare Takibi)
   ========================================================================== */
function initParallax() {
  const blobs = document.querySelectorAll('.aurora__blob');
  if (!blobs.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let mx = 0, my = 0;
  document.addEventListener('mousemove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function frame() {
    blobs.forEach((blob, i) => {
      const factor = (i + 1) * 8;
      blob.style.transform += ''; // CSS animation'lar çakışmasın diye yalnızca translate ekliyoruz
    });
    requestAnimationFrame(frame);
  }
  // Parallax basit tutuldu — performans için ayrıntılı transform uygulanmadı
}

/* ==========================================================================
   9. Parçacık Canvas Animasyonu
   ========================================================================== */
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const PARTICLE_COUNT = 50;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', debounce(resize, 200));

  // Parçacık oluştur
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124, 58, 237, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ==========================================================================
   10. Scroll Progress İndikatörü
   ========================================================================== */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = progress + '%';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ==========================================================================
   11. Klavye Navigasyonu
   ========================================================================== */
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    // Escape: mobil menüyü kapat
    if (e.key === 'Escape') {
      const nav = document.getElementById('nav-links');
      const ham = document.getElementById('hamburger');
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        ham?.classList.remove('active');
        ham?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    }
  });
}

/* ==========================================================================
   12. Özel İmleç Parıltısı (Hero)
   ========================================================================== */
function initCursorGlow() {
  const glow = document.getElementById('hero-glow');
  const hero = document.getElementById('hero');
  if (!glow || !hero) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left - 300) + 'px';
    glow.style.top = (e.clientY - rect.top - 300) + 'px';
  }, { passive: true });
}

/* ==========================================================================
   13. Smooth Scroll (Anchor Bağlantıları)
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ==========================================================================
   Toast Bildirim Sistemi (Global)
   ========================================================================== */
window.showToast = function(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-content">${message}</div><button class="toast-close">&times;</button>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const close = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  setTimeout(close, 4000);
};

/* ==========================================================================
   Honeypot Form Koruması
   ========================================================================== */
document.querySelectorAll('form[data-honeypot]').forEach(form => {
  form.addEventListener('submit', (e) => {
    const hp = form.querySelector('[data-hp]');
    if (hp && (hp.value || '').trim() !== '') {
      e.preventDefault();
      return false;
    }
  });
});

/* ==========================================================================
   Yardımcı: Debounce
   ========================================================================== */
function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ==========================================================================
   14. Etkile_imli Taray1c1 Demosu (Interactive Mockup)
   ========================================================================== */
function initInteractiveMockup() {
  const tabs = document.querySelectorAll("#mockup-sidebar .mockup__sidebar-item");
  const urlEl = document.getElementById("mockup-url");
  const blockedEl = document.getElementById("mockup-blocked");
  const shieldBtn = document.getElementById("mockup-address");
  const shieldIcon = document.getElementById("mockup-shield");

  if (!tabs.length || !urlEl || !shieldBtn) return;

  let isShieldActive = true;

  // Sekme t1klamalar1
  tabs.forEach(tab => {
    tab.style.cursor = "pointer";
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const url = tab.getAttribute("data-url");
      const blocked = tab.getAttribute("data-blocked");
      
      // Yaz1 efekti
      urlEl.textContent = "";
      let i = 0;
      function typeWriter() {
        if (i < url.length) {
          urlEl.textContent += url.charAt(i);
          i++;
          setTimeout(typeWriter, 20);
        }
      }
      typeWriter();

      if(blockedEl && blocked) {
        blockedEl.textContent = isShieldActive ? blocked : "0";
      }
    });
  });

  // Kalkan tıklaması
  shieldBtn.addEventListener("click", () => {
    isShieldActive = !isShieldActive;
    if(isShieldActive) {
      shieldIcon.setAttribute("stroke", "#10B981"); // Yeşil
      window.showToast("Koruma kalkanı aktif edildi.", "success");
    } else {
      shieldIcon.setAttribute("stroke", "#EF4444"); // Kırmızı
      window.showToast("Uyarı: Koruma kalkanı devre dışı bırakıldı!", "warning");
    }
    
    // Geçerli sekmenin engellenen sayısını güncelle
    const activeTab = document.querySelector("#mockup-sidebar .mockup__sidebar-item.active");
    if(activeTab && blockedEl) {
        blockedEl.textContent = isShieldActive ? activeTab.getAttribute("data-blocked") : "0";
    }
  });
}

