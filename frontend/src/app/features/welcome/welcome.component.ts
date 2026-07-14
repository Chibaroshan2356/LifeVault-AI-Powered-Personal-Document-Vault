/**
 * welcome.component.ts — Premium Cinematic Welcome Page v3
 *
 * Right panel: Pure Canvas 2D holographic AI vault.
 * No Three.js. Uses requestAnimationFrame + Canvas 2D API.
 *
 * Vault features:
 *  • 6-face glass box with perspective projection
 *  • Painter's-algorithm face ordering
 *  • Slightly-open vault door with light spill
 *  • 5 orbiting holographic document cards
 *  • Neon connection lines to vault centre
 *  • Scan-line sweep every 5 s
 *  • 60 drifting particles (bg + fg layers)
 *  • Energy ring below vault (25 s rotation)
 *  • Cyan/violet light rays
 *  • Interior radial glow with 6 s pulse
 *  • Full 40 s Y-rotation + 8 s float
 *  • Mouse parallax on vault orientation
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

export type ScanStage = 'initializing' | 'scanning' | 'verified' | 'ready';
interface BootLine    { text: string; type: 'init' | 'online' | 'ready'; }
interface Pt2         { x: number; y: number; depth: number; }
interface Particle    {
  x: number; y: number; vx: number; vy: number;
  alpha: number; size: number; life: number; maxLife: number; fg: boolean;
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

  // ── UI state ─────────────────────────────────────────────────
  userName   = 'User';
  scanStage: ScanStage = 'initializing';
  isLeaving  = false;
  isLoaded   = false;

  readonly allBootLines: BootLine[] = [
    { text: 'Initializing LifeVault AI...', type: 'init'   },
    { text: 'Neural Engine Online',         type: 'online' },
    { text: 'OCR Engine Online',            type: 'online' },
    { text: 'Vision Engine Online',         type: 'online' },
    { text: 'Vault Ready',                  type: 'ready'  },
  ];
  visibleBootCount = 0;
  bootProgress     = 0;
  bootComplete     = false;

  showBrand    = false; showTagline = false; showSub    = false;
  showBadges   = false; showBoot    = false; showIdentity = false;
  showBtn      = false;

  // ── Canvas / render state ─────────────────────────────────────
  private cvs!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private elapsed       = 0;
  private lastFrameTime = 0;
  private animId!:        number;
  private pts:            Particle[] = [];
  private resizeObs!:     ResizeObserver;
  private lw = 800;   // logical width
  private lh = 700;   // logical height

  // Mouse parallax
  private mx = 0;
  private my = 0;

  // ── Document card definitions ─────────────────────────────────
  private readonly DOCS = [
    { name: 'Aadhaar',     rgb: '245,158,11',  r: 0.40, spd:  0.50, ph: 0.00, yf: -0.16 },
    { name: 'Passport',    rgb: '255,107,107',  r: 0.32, spd: -0.60, ph: 1.26, yf:  0.05 },
    { name: 'PAN Card',    rgb: '34,197,94',    r: 0.42, spd:  0.44, ph: 2.51, yf:  0.22 },
    { name: 'Resume',      rgb: '59,130,246',   r: 0.28, spd: -0.68, ph: 3.77, yf: -0.28 },
    { name: 'Certificate', rgb: '167,139,250',  r: 0.36, spd:  0.56, ph: 5.03, yf:  0.34 },
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
    this.runBootSequence();
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    requestAnimationFrame(() => { this.isLoaded = true; this.cdr.markForCheck(); });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
  }

  // ── User name ─────────────────────────────────────────────────
  private resolveUserName(): void {
    const u = this.authService.currentUser;
    if (u?.fullName) {
      this.userName = u.fullName.split(' ')[0];
    } else {
      this.authService.getProfile().subscribe({
        next: (r: any) => {
          if (r.data?.fullName) { this.userName = r.data.fullName.split(' ')[0]; this.cdr.markForCheck(); }
        },
        error: () => {},
      });
    }
  }

  // ── Boot sequence ─────────────────────────────────────────────
  private runBootSequence(): void {
    const delays = [0, 250, 480, 700, 950];
    const progs  = [5, 30, 55, 80, 100];
    delays.forEach((d, i) => {
      setTimeout(() => {
        this.visibleBootCount = i + 1;
        this.bootProgress     = progs[i];
        if (i === delays.length - 1) { this.bootComplete = true; setTimeout(() => this.runIdentityScan(), 150); }
        this.cdr.markForCheck();
      }, d);
    });
  }

  private runIdentityScan(): void {
    this.scanStage = 'scanning'; this.cdr.markForCheck();
    setTimeout(() => { this.scanStage = 'verified'; this.cdr.markForCheck(); }, 450);
    setTimeout(() => { this.scanStage = 'ready';    this.cdr.markForCheck(); }, 850);
  }

  private runStaggeredReveal(): void {
    const map: [number, () => void][] = [
      [100,  () => this.showBrand    = true],
      [250,  () => this.showTagline  = true],
      [400,  () => this.showSub      = true],
      [550,  () => this.showBadges   = true],
      [700,  () => this.showBoot     = true],
      [900,  () => this.showIdentity = true],
      [1100, () => this.showBtn      = true],
    ];
    map.forEach(([d, fn]) => setTimeout(() => { fn(); this.cdr.markForCheck(); }, d));
  }

  // ── Actions ───────────────────────────────────────────────────
  enterVault(): void {
    if (this.scanStage !== 'ready') return;
    this.isLeaving = true;
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/dashboard']), 1200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mx = ((e.clientX - window.innerWidth  / 2) / window.innerWidth)  * 2;
    this.my = -((e.clientY - window.innerHeight / 2) / window.innerHeight) * 2;
  }

  // ── Boot line helper ──────────────────────────────────────────
  get visibleBootLines(): BootLine[] { return this.allBootLines.slice(0, this.visibleBootCount); }

  // ═════════════════════════════════════════════════════════════
  //  CANVAS VAULT RENDERER
  // ═════════════════════════════════════════════════════════════

  private initCanvas(): void {
    const el = this.canvasRef.nativeElement;
    this.cvs = el;
    this.ctx = el.getContext('2d')!;
    this.sizeCanvas();
    this.pts = Array.from({ length: 60 }, () => this.makeParticle());
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
    this.pts = this.pts.map(() => this.makeParticle());
  }

  private tick(): void {
    this.animId = requestAnimationFrame(() => this.tick());
    const now = performance.now();
    const dt  = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    this.elapsed += dt;
    this.drawFrame(dt);
  }

  // ── Perspective projection ────────────────────────────────────
  private proj(x: number, y: number, z: number, rY: number, rX: number, CX: number, CY: number): Pt2 {
    const cY = Math.cos(rY), sY = Math.sin(rY);
    const cX = Math.cos(rX), sX = Math.sin(rX);
    const x1  = x * cY - z * sY;
    const z1  = x * sY + z * cY;
    const y2  = y * cX - z1 * sX;
    const z2  = y * sX + z1 * cX;
    const fov = 950;
    const pz  = z2 + fov;
    return { x: CX + x1 * fov / pz, y: CY + y2 * fov / pz, depth: z2 };
  }

  // ── Main draw frame ───────────────────────────────────────────
  private drawFrame(dt: number): void {
    const ctx = this.ctx;
    const W = this.lw, H = this.lh;
    const t = this.elapsed;

    ctx.clearRect(0, 0, W, H);

    const CX  = W * 0.50;
    const CY  = H * 0.46;
    const S   = Math.min(W * 0.88, H * 0.82);

    const VW  = S * 0.36;
    const VH  = S * 0.44;
    const VD  = S * 0.25;
    const hw  = VW / 2, hh = VH / 2, hd = VD / 2;

    // Rotation & float
    const rotY   = t * (Math.PI * 2 / 40) + this.mx * 0.10;
    const rotX   = -0.12 + this.my * 0.04;
    const floatY = Math.sin(t * (Math.PI * 2 / 8)) * 13;
    const CYf    = CY + floatY;

    const P = (x: number, y: number, z: number) => this.proj(x, y, z, rotY, rotX, CX, CYf);

    // Vault vertices
    const bTL = P(-hw, -hh, -hd); const bTR = P( hw, -hh, -hd);
    const bBR = P( hw,  hh, -hd); const bBL = P(-hw,  hh, -hd);
    const fTL = P(-hw, -hh,  hd); const fTR = P( hw, -hh,  hd);
    const fBR = P( hw,  hh,  hd); const fBL = P(-hw,  hh,  hd);
    const ctr = P(0, 0, 0);

    // ── 1. Background particles ──
    this.drawParticleLayer(ctx, W, H, dt, false);

    // ── 2. Energy ring ──
    this.drawEnergyRing(ctx, CX, CYf + hh + 12, VW, t);

    // ── 3. Light rays ──
    this.drawLightRays(ctx, CX, CYf, VH, t);

    // ── 4. Back face ──
    this.drawFace(ctx, [bTL, bTR, bBR, bBL], 'rgba(20,50,140,0.28)', 'rgba(96,165,250,0.45)', 1.5, 10);

    // ── 5. Side faces ──
    this.drawFace(ctx, [bTL, fTL, fBL, bBL], 'rgba(10,40,120,0.18)', 'rgba(96,165,250,0.30)', 1.2, 7);
    this.drawFace(ctx, [bTR, fTR, fBR, bBR], 'rgba(10,40,120,0.18)', 'rgba(96,165,250,0.30)', 1.2, 7);

    // ── 6. Top face ──
    this.drawFace(ctx, [bTL, bTR, fTR, fTL], 'rgba(30,60,160,0.22)', 'rgba(147,197,253,0.42)', 1.5, 9);

    // ── 7. Bottom face ──
    this.drawFace(ctx, [bBL, bBR, fBR, fBL], 'rgba(0,120,180,0.14)', 'rgba(34,211,238,0.30)', 1.0, 5);

    // ── 8. Interior glow ──
    this.drawInteriorGlow(ctx, ctr.x, ctr.y, VW * 0.44, t);

    // ── 9. Orbiting document cards + connection lines ──
    const cardPts = this.drawDocumentCards(ctx, P, VW, VH, t);
    this.drawConnectionLines(ctx, ctr, cardPts, t);

    // ── 10. Scan lines ──
    this.drawScanLines(ctx, fTL, fTR, fBL, fBR, bTL, bTR, t);

    // ── 11. Front face (glass, semi-transparent) ──
    this.drawFace(ctx, [fTL, fTR, fBR, fBL], 'rgba(59,130,246,0.04)', 'rgba(96,165,250,0.18)', 0.8, 3);

    // ── 12. Vault door (ajar, hinged on right edge) ──
    this.drawVaultDoor(ctx, P, hw, hh, hd, fTR, fBR, fTL, fBL, t);

    // ── 13. Wireframe glow edges ──
    this.drawVaultEdges(ctx, { bTL, bTR, bBR, bBL, fTL, fTR, fBR, fBL }, t);

    // ── 14. Foreground particles ──
    this.drawParticleLayer(ctx, W, H, dt, true);
  }

  // ── Face drawing ──────────────────────────────────────────────
  private drawFace(
    ctx: CanvasRenderingContext2D,
    pts: Pt2[], fill: string, stroke: string,
    lw: number, blur: number,
  ): void {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur  = blur;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  }

  // ── Energy ring ───────────────────────────────────────────────
  private drawEnergyRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.26);

    const angle = t * (Math.PI * 2 / 25);
    ctx.rotate(angle);

    const pulse = 0.30 + 0.12 * Math.sin(t * 2.0);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(6,182,212,${pulse + 0.05})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur  = 22;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(96,165,250,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur  = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(139,92,246,${pulse * 0.6})`;
    ctx.lineWidth = 1.0;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur  = 8;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Light rays ────────────────────────────────────────────────
  private drawLightRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, t: number): void {
    const rays = [
      { a: -0.75, rgb: '6,182,212',   aw: 70, p: 0   },
      { a:  0.40, rgb: '139,92,246',  aw: 50, p: 1.2 },
      { a: -2.00, rgb: '59,130,246',  aw: 55, p: 2.4 },
      { a:  2.20, rgb: '167,139,250', aw: 40, p: 3.6 },
    ];
    rays.forEach(ray => {
      const alpha = 0.08 + 0.05 * Math.sin(t * 0.7 + ray.p);
      const ex = cx + Math.cos(ray.a) * len * 1.6;
      const ey = cy + Math.sin(ray.a) * len * 1.6;
      const g  = ctx.createLinearGradient(cx, cy, ex, ey);
      g.addColorStop(0, `rgba(${ray.rgb},${alpha * 2})`);
      g.addColorStop(1, `rgba(${ray.rgb},0)`);
      const pa = ray.a + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex + Math.cos(pa) * ray.aw, ey + Math.sin(pa) * ray.aw);
      ctx.lineTo(ex - Math.cos(pa) * ray.aw, ey - Math.sin(pa) * ray.aw);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    });
  }

  // ── Interior glow ─────────────────────────────────────────────
  private drawInteriorGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
    const pulse = 0.90 + 0.10 * Math.sin(t * (Math.PI * 2 / 6));
    const rp = r * pulse;
    const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, rp);
    g.addColorStop(0.00, 'rgba(190,220,255,0.28)');
    g.addColorStop(0.30, 'rgba(96,165,250,0.18)');
    g.addColorStop(0.65, 'rgba(6,182,212,0.08)');
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, rp, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── Orbiting document cards ───────────────────────────────────
  private drawDocumentCards(
    ctx: CanvasRenderingContext2D,
    P: (x: number, y: number, z: number) => Pt2,
    VW: number, VH: number, t: number,
  ): { x: number; y: number; rgb: string }[] {
    return this.DOCS.map(doc => {
      const angle = t * doc.spd + doc.ph;
      const ox = Math.cos(angle) * doc.r * VW;
      const oy = doc.yf * VH + Math.sin(t * 0.38 + doc.ph) * VH * 0.035;
      const oz = Math.sin(angle) * doc.r * VW * 0.55;
      const p  = P(ox, oy, oz);

      const CW = 54, CH = 36, CR = 6;
      const alpha = 0.75 + 0.18 * Math.sin(t * 0.9 + doc.ph);

      ctx.save();
      ctx.translate(p.x, p.y);

      // Card body
      ctx.globalAlpha = alpha;
      this.rr(ctx, -CW / 2, -CH / 2, CW, CH, CR);
      ctx.fillStyle   = `rgba(5,12,38,0.88)`;
      ctx.strokeStyle = `rgba(${doc.rgb},0.70)`;
      ctx.lineWidth   = 1.2;
      ctx.shadowColor = `rgba(${doc.rgb},0.9)`;
      ctx.shadowBlur  = 10;
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur  = 0;

      // Top accent bar
      this.rr(ctx, -CW / 2, -CH / 2, CW, 11, [CR, CR, 0, 0] as any);
      ctx.fillStyle   = `rgba(${doc.rgb},0.80)`;
      ctx.fill();

      // Label
      ctx.fillStyle     = '#ffffff';
      ctx.font          = 'bold 8px Inter, sans-serif';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText(doc.name, 0, 8);

      // Placeholder lines
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-CW / 2 + 6, 20, CW - 12, 3.5);
      ctx.fillRect(-CW / 2 + 6, 26, (CW - 12) * 0.60, 3.5);

      ctx.globalAlpha = 1;
      ctx.restore();

      return { x: p.x, y: p.y, rgb: doc.rgb };
    });
  }

  // ── Connection lines ──────────────────────────────────────────
  private drawConnectionLines(
    ctx: CanvasRenderingContext2D,
    ctr: Pt2,
    cards: { x: number; y: number; rgb: string }[],
    t: number,
  ): void {
    cards.forEach((c, i) => {
      const pulse = 0.22 + 0.12 * Math.sin(t * 1.4 + i * 1.2);
      const g = ctx.createLinearGradient(ctr.x, ctr.y, c.x, c.y);
      g.addColorStop(0, `rgba(96,165,250,${pulse * 1.6})`);
      g.addColorStop(1, `rgba(${c.rgb},${pulse})`);

      ctx.beginPath();
      ctx.moveTo(ctr.x, ctr.y);
      ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = g;
      ctx.lineWidth   = 1;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur  = 4;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Terminal dot at card
      ctx.beginPath();
      ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(${c.rgb},0.85)`;
      ctx.shadowColor = `rgba(${c.rgb},1)`;
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });
  }

  // ── Holographic scan lines ────────────────────────────────────
  private drawScanLines(
    ctx: CanvasRenderingContext2D,
    fTL: Pt2, fTR: Pt2, fBL: Pt2, fBR: Pt2,
    bTL: Pt2, bTR: Pt2,
    t: number,
  ): void {
    const minX = Math.min(fTL.x, fTR.x, bTL.x, bTR.x);
    const maxX = Math.max(fTL.x, fTR.x, bTL.x, bTR.x);
    const minY = Math.min(fTL.y, bTL.y);
    const maxY = Math.max(fBL.y, fBR.y);

    // Primary scan sweep (5 s cycle)
    const ph1  = (t % 5.0) / 5.0;
    if (ph1 < 0.80) {
      const sy = minY + ph1 * (maxY - minY) / 0.80;
      const a  = 0.40 * Math.sin(ph1 * Math.PI);

      const g = ctx.createLinearGradient(minX, sy, maxX, sy);
      g.addColorStop(0,   `rgba(96,165,250,0)`);
      g.addColorStop(0.2, `rgba(96,165,250,${a})`);
      g.addColorStop(0.5, `rgba(190,220,255,${a * 1.6})`);
      g.addColorStop(0.8, `rgba(96,165,250,${a})`);
      g.addColorStop(1,   `rgba(96,165,250,0)`);

      ctx.beginPath(); ctx.moveTo(minX, sy); ctx.lineTo(maxX, sy);
      ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.stroke();

      // Sub-glow
      const gg = ctx.createLinearGradient(0, sy, 0, sy + 28);
      gg.addColorStop(0, `rgba(96,165,250,${a * 0.28})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(minX, sy, maxX - minX, 28);
    }

    // Secondary subtle horizontal lines (holographic grid)
    ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 0.5);
    ctx.strokeStyle = 'rgba(96,165,250,1)';
    ctx.lineWidth   = 0.5;
    const rows = 10;
    for (let r = 0; r <= rows; r++) {
      const ry = minY + (r / rows) * (maxY - minY);
      ctx.beginPath(); ctx.moveTo(minX, ry); ctx.lineTo(maxX, ry); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Vault door (slightly ajar) ────────────────────────────────
  private drawVaultDoor(
    ctx: CanvasRenderingContext2D,
    P: (x: number, y: number, z: number) => Pt2,
    hw: number, hh: number, hd: number,
    fTR: Pt2, fBR: Pt2, fTL: Pt2, fBL: Pt2,
    t: number,
  ): void {
    // Door hinged on the right vertical edge of the front face.
    // Open angle ~22° outward in local XZ space.
    const openA = 0.38;
    const dw    = hw * 2;
    const dxEnd = -hw + dw * Math.cos(openA);
    const dzEnd =  hd - dw * Math.sin(openA);

    const dTL = P(dxEnd, -hh, dzEnd);
    const dBL = P(dxEnd,  hh, dzEnd);

    // Door glass panel
    this.drawFace(ctx, [dTL, fTR, fBR, dBL], 'rgba(59,130,246,0.16)', 'rgba(147,197,253,0.55)', 1.5, 14);

    // Hinge edge glow (right edge)
    ctx.beginPath();
    ctx.moveTo(fTR.x, fTR.y); ctx.lineTo(fBR.x, fBR.y);
    ctx.strokeStyle = 'rgba(190,220,255,0.75)';
    ctx.lineWidth   = 2.2;
    ctx.shadowColor = '#93c5fd';
    ctx.shadowBlur  = 16;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Light spill through the opening gap (left edge of door vs front face left)
    const gapG = ctx.createLinearGradient(fTL.x, fTL.y, dTL.x, dTL.y);
    gapG.addColorStop(0, `rgba(147,197,253,${0.35 + 0.12 * Math.sin(t * (Math.PI * 2 / 6))})`);
    gapG.addColorStop(1, 'rgba(59,130,246,0.00)');
    ctx.beginPath();
    ctx.moveTo(fTL.x, fTL.y);
    ctx.lineTo(dTL.x, dTL.y);
    ctx.lineTo(dBL.x, dBL.y);
    ctx.lineTo(fBL.x, fBL.y);
    ctx.closePath();
    ctx.fillStyle = gapG;
    ctx.fill();

    // Door wheel handle (small circle)
    const hx = (dTL.x + fTR.x * 2.5) / 3.5;
    const hy = (dTL.y + fTR.y + dBL.y + fBR.y) / 4;
    ctx.beginPath();
    ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(190,220,255,0.82)';
    ctx.shadowColor = '#93c5fd';
    ctx.shadowBlur  = 16;
    ctx.fill();
    // Crosshair on handle
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 0;
    ctx.beginPath(); ctx.moveTo(hx - 3.5, hy); ctx.lineTo(hx + 3.5, hy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx, hy - 3.5); ctx.lineTo(hx, hy + 3.5); ctx.stroke();
  }

  // ── Wireframe edge glow ───────────────────────────────────────
  private drawVaultEdges(ctx: CanvasRenderingContext2D, V: Record<string, Pt2>, t: number): void {
    const pulse = 0.50 + 0.18 * Math.sin(t * (Math.PI * 2 / 6));

    ctx.strokeStyle = `rgba(96,165,250,${pulse})`;
    ctx.lineWidth   = 1.4;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur  = 10;

    const edges: [Pt2, Pt2][] = [
      [V['bTL'], V['bTR']], [V['bTR'], V['bBR']], [V['bBR'], V['bBL']], [V['bBL'], V['bTL']],
      [V['fTL'], V['fTR']], [V['fTR'], V['fBR']], [V['fBR'], V['fBL']], [V['fBL'], V['fTL']],
      [V['bTL'], V['fTL']], [V['bTR'], V['fTR']], [V['bBR'], V['fBR']], [V['bBL'], V['fBL']],
    ];

    edges.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    // Corner accent dots
    [V['bTL'], V['bTR'], V['bBR'], V['bBL'], V['fTL'], V['fTR'], V['fBR'], V['fBL']].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(147,197,253,${pulse * 0.9})`;
      ctx.shadowColor = '#93c5fd';
      ctx.shadowBlur  = 8;
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  // ── Particle system ───────────────────────────────────────────
  private makeParticle(): Particle {
    const W = this.lw || 800, H = this.lh || 700;
    return {
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.28,
      vy:      -(Math.random() * 0.4 + 0.1),
      alpha:   Math.random() * 0.55 + 0.10,
      size:    Math.random() * 2.0 + 0.4,
      life:    Math.random() * 4,
      maxLife: 5 + Math.random() * 7,
      fg:      Math.random() > 0.60,
    };
  }

  private drawParticleLayer(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    dt: number, fg: boolean,
  ): void {
    this.pts.forEach((p, i) => {
      if (p.fg !== fg) return;
      p.life += dt; p.x += p.vx; p.y += p.vy;

      if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > W + 10) {
        this.pts[i] = { ...this.makeParticle(), fg };
        return;
      }

      const lr = p.life / p.maxLife;
      const fa = lr < 0.20 ? lr / 0.20 : lr > 0.80 ? (1 - lr) / 0.20 : 1;
      const a  = p.alpha * fa;
      if (a < 0.02) return;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle   = fg ? `rgba(96,165,250,${a})` : `rgba(147,197,253,${a * 0.75})`;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur  = 5;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });
  }

  // ── Rounded rect helper ───────────────────────────────────────
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
