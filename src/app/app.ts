import {
  Component, signal, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, PLATFORM_ID, Inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface Petal {
  x: number; y: number; vx: number; vy: number;
  rotation: number; rotationSpeed: number;
  size: number; opacity: number; wobble: number; wobbleSpeed: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; life: number; maxLife: number;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('petalCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  days    = signal(0);
  hours   = signal(0);
  minutes = signal(0);
  seconds = signal(0);

  readonly weddingDate = new Date('2026-09-20T16:00:00');
  readonly groomName   = 'Alexander';
  readonly brideName   = 'Isabelle';
  readonly venue       = 'Château de Fontainebleau';
  readonly venueCity   = 'Paris, France';
  readonly weddingDateStr = 'Juillet 23, 2026';

  activeNav = signal('home');
  rsvpSubmitted = signal(false);
  rsvpAttending = signal('');
  rsvpName = signal('');
  rsvpEmail = signal('');
  rsvpGuests = signal(1);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private animFrameId: number | null = null;
  private petals: Petal[] = [];
  private particles: Particle[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit() { this.startCountdown(); }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initCanvas();
      this.initParallax();
      this.initScrollReveal();
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private startCountdown() {
    const tick = () => {
      const diff = this.weddingDate.getTime() - Date.now();
      if (diff <= 0) { this.days.set(0); this.hours.set(0); this.minutes.set(0); this.seconds.set(0); return; }
      this.days.set(Math.floor(diff / 86400000));
      this.hours.set(Math.floor((diff % 86400000) / 3600000));
      this.minutes.set(Math.floor((diff % 3600000) / 60000));
      this.seconds.set(Math.floor((diff % 60000) / 1000));
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
  }

  private initCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // seed petals
    for (let i = 0; i < 28; i++) {
      this.petals.push(this.spawnPetal(canvas.width, canvas.height, true));
    }
    for (let i = 0; i < 40; i++) {
      this.particles.push(this.spawnParticle(canvas.width, canvas.height, true));
    }

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.updatePetals(ctx, canvas.width, canvas.height);
      this.updateParticles(ctx, canvas.width, canvas.height);
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private spawnPetal(w: number, h: number, random = false): Petal {
    return {
      x: random ? Math.random() * w : Math.random() * w,
      y: random ? Math.random() * h : -20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.4 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      size: 8 + Math.random() * 14,
      opacity: 0.15 + Math.random() * 0.35,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02
    };
  }

  private spawnParticle(w: number, h: number, random = false): Particle {
    const life = 180 + Math.random() * 120;
    return {
      x: random ? Math.random() * w : Math.random() * w,
      y: random ? Math.random() * h : h + 5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.2 + Math.random() * 0.4),
      size: 1 + Math.random() * 2.5,
      opacity: 0,
      life: random ? Math.random() * life : 0,
      maxLife: life
    };
  }

  private updatePetals(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.petals.forEach((p, i) => {
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.4;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      if (p.y > h + 30) this.petals[i] = this.spawnPetal(w, h);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;

      // petal shape
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.5, p.size * 0.6, p.size * 0.5, 0, p.size * 0.3);
      ctx.bezierCurveTo(-p.size * 0.6, p.size * 0.5, -p.size * 0.6, -p.size * 0.5, 0, -p.size);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, -p.size * 0.3, 0, 0, 0, p.size);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.5, 'rgba(250,245,240,0.7)');
      grad.addColorStop(1, 'rgba(230,215,200,0.3)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
  }

  private updateParticles(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.particles.forEach((p, i) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      const ratio = p.life / p.maxLife;
      p.opacity = ratio < 0.2 ? ratio / 0.2 : ratio > 0.8 ? (1 - ratio) / 0.2 : 1;
      if (p.life >= p.maxLife) this.particles[i] = this.spawnParticle(w, h);

      ctx.save();
      ctx.globalAlpha = p.opacity * 0.5;
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.5, 'rgba(240,235,225,0.6)');
      gr.addColorStop(1, 'rgba(220,210,195,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private initParallax() {
    document.addEventListener('mousemove', (e) => {
      const mx = (e.clientX / window.innerWidth  - 0.5) * 20;
      const my = (e.clientY / window.innerHeight - 0.5) * 20;
      document.querySelectorAll<HTMLElement>('.parallax-deep').forEach(el => {
        el.style.transform = `translate(${mx * 1.5}px, ${my * 1.5}px)`;
      });
      document.querySelectorAll<HTMLElement>('.parallax-mid').forEach(el => {
        el.style.transform = `translate(${mx * 0.8}px, ${my * 0.8}px)`;
      });
      document.querySelectorAll<HTMLElement>('.parallax-shallow').forEach(el => {
        el.style.transform = `translate(${mx * 0.3}px, ${my * 0.3}px)`;
      });
    });
  }

  private initScrollReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  submitRsvp() {
    if (this.rsvpName() && this.rsvpEmail() && this.rsvpAttending()) {
      this.rsvpSubmitted.set(true);
    }
  }

  setNav(section: string) { this.activeNav.set(section); }
  setAttending(val: string) { this.rsvpAttending.set(val); }
  setName(e: Event) { this.rsvpName.set((e.target as HTMLInputElement).value); }
  setEmail(e: Event) { this.rsvpEmail.set((e.target as HTMLInputElement).value); }
  setGuests(e: Event) { this.rsvpGuests.set(+(e.target as HTMLInputElement).value); }

  get pad() { return (n: number) => String(n).padStart(2, '0'); }
}
