/**
 * welcome.component.ts — Cinematic AI Welcome Page (v3)
 *
 * Implements a premium, Apple-style procedural morphing liquid crystal nucleus.
 * Eliminates rigid wireframe boxes and cluttered diagnostic overlays.
 * Left panel is minimal, spacious, and breathes.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router }       from '@angular/router';
import { AuthService }  from '../auth/services/auth.service';

declare const window: any;

export type ScanStage = 'ready';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  alpha: number; size: number; life: number; maxLife: number;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('welcomeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── UI State ─────────────────────────────────────────────────
  userName   = 'User';
  scanStage: ScanStage = 'ready';
  isLeaving  = false;
  isLoaded   = false;

  // Staggered fades
  showBrand    = false;
  showTagline  = false;
  showSub      = false;
  showBadges   = false;
  showBtn      = false;

  // ── Render Context ───────────────────────────────────────────
  private cvs!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private elapsed       = 0;
  private lastFrameTime = 0;
  private animId!:        number;
  private pts:            Particle[] = [];
  private resizeObs!:     ResizeObserver;
  private lw = 800;
  private lh = 700;

  // Parallax vectors
  private mx = 0;
  private my = 0;
  private targetMx = 0;
  private targetMy = 0;

  // ── Holographic Orbiting Documents ───────────────────────────
  private readonly DOCS = [
    { name: 'Aadhaar',     rgb: '245,158,11',  orbitR: 0.65, speed:  0.42, phase: 0.00, yOffset: -0.15 },
    { name: 'Passport',    rgb: '255,107,107',  orbitR: 0.55, speed: -0.48, phase: 1.25, yOffset:  0.08 },
    { name: 'PAN Card',    rgb: '34,197,94',    orbitR: 0.68, speed:  0.38, phase: 2.50, yOffset:  0.22 },
    { name: 'Resume',      rgb: '59,130,246',   orbitR: 0.50, speed: -0.52, phase: 3.75, yOffset: -0.28 },
    { name: 'Certificate', rgb: '167,139,250',  orbitR: 0.60, speed:  0.45, phase: 5.00, yOffset:  0.32 },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router:      Router,
    private readonly cdr:         ChangeDetectorRef,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.resolveUserName();
    this.runStaggeredReveal();
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    requestAnimationFrame(() => {
      this.isLoaded = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
  }

  private resolveUserName(): void {
    const user = this.authService.currentUser;
    if (user?.fullName) {
      this.userName = user.fullName.split(' ')[0];
    } else {
      this.authService.getProfile().subscribe({
        next: (res: any) => {
          if (res.data?.fullName) {
            this.userName = res.data.fullName.split(' ')[0];
            this.cdr.markForCheck();
          }
        },
        error: () => {},
      });
    }
  }

  private runStaggeredReveal(): void {
    setTimeout(() => { this.showBrand   = true; this.cdr.markForCheck(); }, 100);
    setTimeout(() => { this.showTagline = true; this.cdr.markForCheck(); }, 250);
    setTimeout(() => { this.showSub     = true; this.cdr.markForCheck(); }, 400);
    setTimeout(() => { this.showBadges  = true; this.cdr.markForCheck(); }, 550);
    setTimeout(() => { this.showBtn     = true; this.cdr.markForCheck(); }, 700);
  }

  enterVault(): void {
    this.isLeaving = true;
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/dashboard']), 1200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.targetMx = ((e.clientX - window.innerWidth  / 2) / window.innerWidth)  * 2;
    this.targetMy = -((e.clientY - window.innerHeight / 2) / window.innerHeight) * 2;
  }

  // ═════════════════════════════════════════════════════════════
  //  CANVAS RENDER SYSTEM
  // ═════════════════════════════════════════════════════════════

  private initCanvas(): void {
    const el = this.canvasRef.nativeElement;
    this.cvs = el;
    this.ctx = el.getContext('2d')!;
    this.sizeCanvas();

    // Setup initial particle system
    this.pts = Array.from({ length: 80 }, () => this.makeParticle(true));
    this.lastFrameTime = performance.now();
    this.tick();

    this.resizeObs = new ResizeObserver(() => this.sizeCanvas());
    this.resizeObs.observe(el.parentElement!);
  }

  private sizeCanvas(): void {
    const p = this.cvs.parentElement!;
    this.lw = p.clientWidth  || 800;
    this.lh = p.clientHeight || 700;
    this.cvs.width  = this.lw;
    this.cvs.height = this.lh;
  }

  private tick(): void {
    this.animId = requestAnimationFrame(() => this.tick());
    const now = performance.now();
    const dt  = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    this.elapsed += dt;

    // Smooth ease on mouse parallax
    this.mx += (this.targetMx - this.mx) * 0.08;
    this.my += (this.targetMy - this.my) * 0.08;

    this.drawFrame(dt);
  }

  private drawFrame(dt: number): void {
    const ctx = this.ctx;
    const W = this.lw, H = this.lh;
    const t = this.elapsed;

    ctx.clearRect(0, 0, W, H);

    const cx = W * 0.50 + this.mx * 25;
    const cy = H * 0.48 - this.my * 20;

    // Organic floating offset
    const floatY = Math.sin(t * (Math.PI * 2 / 8)) * 14;
    const floatX = Math.cos(t * (Math.PI * 2 / 12)) * 6;
    const ncx = cx + floatX;
    const ncy = cy + floatY;

    // Dynamic base sizing
    const S = Math.min(W * 0.88, H * 0.82);
    const nucleusRadius = S * 0.16;

    // ── 1. Volumetric Back Glow ──
    this.drawBackGlow(ctx, ncx, ncy, nucleusRadius * 3, t);

    // ── 2. Background Star Particles ──
    this.drawParticles(ctx, W, H, dt, ncx, ncy, nucleusRadius);

    // ── 3. Light Rays / Caustics ──
    this.drawLightRays(ctx, ncx, ncy, S * 0.6, t);

    // ── 4. Energy rings ──
    this.drawEnergyRings(ctx, ncx, ncy, nucleusRadius, t);

    // ── 5. Orbiting Document Cards ──
    const cardPts = this.drawOrbitingCards(ctx, ncx, ncy, S * 0.55, t);

    // ── 6. Neon Connection Lines ──
    this.drawTrails(ctx, ncx, ncy, cardPts, t);

    // ── 7. Liquid Glass Nucleus (Organic Morphing Blob) ──
    this.drawLiquidCrystalCore(ctx, ncx, ncy, nucleusRadius, t);
  }

  // ── Volumetric Back Glow ──────────────────────────────────────
  private drawBackGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
    const breathe = 1.0 + Math.sin(t * 1.8) * 0.08;
    const gr = r * breathe;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    g.addColorStop(0.0, 'rgba(37,99,235,0.22)');
    g.addColorStop(0.4, 'rgba(139,92,246,0.12)');
    g.addColorStop(0.7, 'rgba(6,182,212,0.06)');
    g.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  // ── Light Rays / Caustics ─────────────────────────────────────
  private drawLightRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, length: number, t: number): void {
    const rays = [
      { baseAngle: -0.6, speed: 0.05, rgb: '96,165,250',  width: 0.8 },
      { baseAngle:  0.8, speed: -0.04, rgb: '167,139,250', width: 0.6 },
      { baseAngle: -2.2, speed: 0.03, rgb: '34,211,238',  width: 0.7 },
      { baseAngle:  2.6, speed: -0.06, rgb: '129,140,248', width: 0.5 },
    ];

    rays.forEach(ray => {
      const angle = ray.baseAngle + Math.sin(t * ray.speed) * 0.15;
      const alpha = 0.07 + 0.03 * Math.sin(t * 1.2 + ray.baseAngle);

      const ex = cx + Math.cos(angle) * length;
      const ey = cy + Math.sin(angle) * length;

      const g = ctx.createLinearGradient(cx, cy, ex, ey);
      g.addColorStop(0, `rgba(${ray.rgb},${alpha})`);
      g.addColorStop(0.6, `rgba(${ray.rgb},${alpha * 0.3})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // Construct a wide soft triangle/cone
      const perpAngle = angle + Math.PI / 2;
      const w = length * 0.18 * ray.width;
      ctx.lineTo(ex + Math.cos(perpAngle) * w, ey + Math.sin(perpAngle) * w);
      ctx.lineTo(ex - Math.cos(perpAngle) * w, ey - Math.sin(perpAngle) * w);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    });
  }

  // ── Energy Rings (Slow rotating orbital rings) ────────────────
  private drawEnergyRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseR: number, t: number): void {
    const rings = [
      { r: baseR * 1.5, rotSpeed: 0.12,  tilt: 0.28, color: 'rgba(96,165,250,0.22)' },
      { r: baseR * 1.9, rotSpeed: -0.08, tilt: -0.35, color: 'rgba(167,139,250,0.18)' },
      { r: baseR * 2.3, rotSpeed: 0.06,  tilt: 0.15, color: 'rgba(34,211,238,0.15)' },
    ];

    rings.forEach(ring => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring.tilt);
      ctx.scale(1, 0.28); // Flatten to create 3D orbit illusion
      ctx.rotate(t * ring.rotSpeed);

      // Main ring outline
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Accent orbiting dot on the ring
      ctx.beginPath();
      ctx.arc(ring.r, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.restore();
    });
  }

  // ── Orbiting Document Cards ───────────────────────────────────
  private drawOrbitingCards(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    orbitWidth: number,
    t: number,
  ): { x: number; y: number; z: number; rgb: string }[] {
    return this.DOCS.map(doc => {
      const angle = t * doc.speed + doc.phase;
      // Orbit path
      const ox = Math.cos(angle) * orbitWidth * doc.orbitR;
      const oz = Math.sin(angle) * orbitWidth * doc.orbitR * 0.45; // 3D projection flattening
      const oy = doc.yOffset * orbitWidth * 0.8 + Math.sin(t * 0.45 + doc.phase) * 15;

      // Project onto 2D viewport
      const fov = 800;
      const scale = fov / (fov + oz);
      const px = cx + ox * scale;
      const py = cy + oy * scale;

      const CW = 50 * scale;
      const CH = 34 * scale;
      const CR = 5 * scale;

      // Card face rendering
      ctx.save();
      ctx.translate(px, py);

      // Glass base
      ctx.beginPath();
      this.rr(ctx, -CW / 2, -CH / 2, CW, CH, CR);
      ctx.fillStyle = 'rgba(10,22,60,0.86)';
      ctx.strokeStyle = `rgba(${doc.rgb},0.6)`;
      ctx.lineWidth = 1;
      ctx.shadowColor = `rgba(${doc.rgb},0.6)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.stroke();

      // Top color indicator strip
      ctx.beginPath();
      this.rr(ctx, -CW / 2, -CH / 2, CW, 8 * scale, [CR, CR, 0, 0] as any);
      ctx.fillStyle = `rgba(${doc.rgb},0.8)`;
      ctx.fill();

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(6, Math.round(7.5 * scale))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(doc.name, 0, 7 * scale);

      // Abstract internal lines
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(-CW / 2 + 5, 17 * scale, CW - 10, 3 * scale);
      ctx.fillRect(-CW / 2 + 5, 23 * scale, (CW - 10) * 0.65, 3 * scale);

      ctx.restore();

      return { x: px, y: py, z: oz, rgb: doc.rgb };
    });
  }

  // ── Trails / Connection Lines ─────────────────────────────────
  private drawTrails(
    ctx: CanvasRenderingContext2D,
    ncx: number,
    ncy: number,
    cards: { x: number; y: number; z: number; rgb: string }[],
    t: number,
  ): void {
    cards.forEach((c, idx) => {
      // Behind-core rendering check to dim lines behind nucleus
      const isBehind = c.z > 0;
      const alpha = isBehind ? 0.08 : 0.24 + Math.sin(t * 1.5 + idx) * 0.06;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ncx, ncy);
      ctx.lineTo(c.x, c.y);

      const grad = ctx.createLinearGradient(ncx, ncy, c.x, c.y);
      grad.addColorStop(0, `rgba(96,165,250,${alpha})`);
      grad.addColorStop(1, `rgba(${c.rgb},${alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Orbit anchor point
      ctx.beginPath();
      ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.rgb},0.8)`;
      ctx.fill();

      ctx.restore();
    });
  }

  // ── Procedural Liquid Glass Nucleus (Organic Morphing Blob) ──
  private drawLiquidCrystalCore(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    baseR: number,
    t: number,
  ): void {
    const nodes = 10;
    const scale = 1.0 + Math.sin(t * 0.8) * 0.03; // Breathing scale

    const getBlobPoints = (timeOffset: number, amplitude: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < nodes; i++) {
        const angle = (i / nodes) * Math.PI * 2;
        // Composite sine-wave noise functions to simulate fluid blob morphology
        const noise =
          Math.sin(angle * 3 + t * 1.2 + timeOffset) * 0.12 +
          Math.cos(angle * 2 - t * 0.8 + timeOffset * 2.0) * 0.08 +
          Math.sin(angle * 5 + t * 2.2) * 0.04;

        const radius = baseR * scale * (1.0 + noise * amplitude);
        pts.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
      return pts;
    };

    // Draw cardinal splines connecting nodes smoothly
    const drawBlobPath = (pts: { x: number; y: number }[]) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length; i++) {
        const nextIdx = (i + 1) % pts.length;
        const xc = (pts[i].x + pts[nextIdx].x) / 2;
        const yc = (pts[i].y + pts[nextIdx].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.closePath();
    };

    ctx.save();

    // 1. Layer 1: Ambient Fresnel backing glow shadow
    const pts1 = getBlobPoints(0, 1.0);
    drawBlobPath(pts1);
    const grad1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6);
    grad1.addColorStop(0, 'rgba(59,130,246,0.3)');
    grad1.addColorStop(0.5, 'rgba(139,92,246,0.18)');
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fill();

    // 2. Layer 2: Main refractive glass body (deep blue/purple liquid)
    const pts2 = getBlobPoints(Math.PI * 0.25, 0.85);
    drawBlobPath(pts2);
    const grad2 = ctx.createLinearGradient(cx - baseR, cy - baseR, cx + baseR, cy + baseR);
    grad2.addColorStop(0, 'rgba(15,23,42,0.92)');
    grad2.addColorStop(0.5, 'rgba(30,58,138,0.75)');
    grad2.addColorStop(1, 'rgba(88,28,135,0.85)');
    ctx.fillStyle = grad2;
    ctx.fill();

    // Glowing rim border
    ctx.strokeStyle = 'rgba(147,197,253,0.38)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Layer 3: Vibrant neon inner core fluid
    const pts3 = getBlobPoints(Math.PI * 0.75, 0.6);
    drawBlobPath(pts3);
    const grad3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.95);
    grad3.addColorStop(0, 'rgba(6,182,212,0.45)');
    grad3.addColorStop(0.4, 'rgba(59,130,246,0.25)');
    grad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad3;
    ctx.fill();

    // 4. Layer 4: Glass Fresnel top highlight reflections
    const pts4 = getBlobPoints(-Math.PI * 0.4, 0.9);
    drawBlobPath(pts4);
    const grad4 = ctx.createLinearGradient(cx - baseR * 0.6, cy - baseR * 0.8, cx + baseR * 0.3, cy + baseR * 0.3);
    grad4.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad4.addColorStop(0.3, 'rgba(255,255,255,0.06)');
    grad4.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad4;
    ctx.fill();

    // Sharp specular rim reflections (WWDC style)
    ctx.beginPath();
    // Sub-segment of highlight
    for (let a = -2; a < 0.5; a += 0.1) {
      const rad = baseR * scale * (1 + (Math.sin(a * 3 + t * 1.2) * 0.12) * 0.9);
      const rx = cx + Math.cos(a) * (rad - 3.5);
      const ry = cy + Math.sin(a) * (rad - 3.5);
      if (a === -2) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }

  // ── Particle System ───────────────────────────────────────────
  private makeParticle(randomLife = false): Particle {
    const W = this.lw || 800, H = this.lh || 700;
    return {
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.22,
      vy:      -(Math.random() * 0.35 + 0.08),
      alpha:   Math.random() * 0.42 + 0.08,
      size:    Math.random() * 2.2 + 0.3,
      life:    randomLife ? Math.random() * 5 : 0,
      maxLife: 6 + Math.random() * 8,
    };
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    dt: number,
    ncx: number,
    ncy: number,
    coreR: number,
  ): void {
    this.pts.forEach((p, idx) => {
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;

      // Reset when particle exits boundaries
      if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > W + 10) {
        this.pts[idx] = this.makeParticle(false);
        return;
      }

      // Fade transitions
      const ratio = p.life / p.maxLife;
      const alphaFactor = ratio < 0.15 ? ratio / 0.15 : ratio > 0.85 ? (1 - ratio) / 0.15 : 1;
      const a = p.alpha * alphaFactor;

      // Orbit/gravitational pull toward core
      const dx = ncx - p.x;
      const dy = ncy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > coreR && dist < coreR * 4) {
        p.vx += (dx / dist) * 0.015 * dt;
        p.vy += (dy / dist) * 0.015 * dt;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(147,197,253,${a})`;
      ctx.fill();
    });
  }

  // ── Rounded Rect Helper ───────────────────────────────────────
  private rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
    const rt = Array.isArray(r) ? r : [r, r, r, r];
    const [tl, tr, br, bl] = rt;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.arcTo(x + w, y,     x + w, y + h, tr);
    ctx.arcTo(x + w, y + h, x,     y + h, br);
    ctx.arcTo(x,     y + h, x,     y,     bl);
    ctx.arcTo(x,     y,     x + w, y,     tl);
    ctx.closePath();
  }
}
