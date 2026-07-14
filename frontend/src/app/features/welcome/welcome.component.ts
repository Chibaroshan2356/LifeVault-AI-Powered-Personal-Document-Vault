/**
 * welcome.component.ts — Cinematic Welcome Page v4 (Holographic Vault)
 *
 * Implements a high-fidelity 3D Holographic Vault (glass cube) in Canvas 2D.
 * Splits layout into three distinct columns matching Option C exactly.
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

interface Pt2 { x: number; y: number; depth: number; }
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

  // ── Holographic Document Cards ───────────────────────────────
  private readonly DOCS = [
    { name: 'Aadhaar',     rgb: '34, 197, 94',  ox: -65, oy: -55, oz: -30, phrase: 0.0 },
    { name: 'Passport',    rgb: '59, 130, 246', ox:  55, oy: -35, oz:  40, phrase: 1.2 },
    { name: 'PAN Card',    rgb: '245, 158, 11', ox: -10, oy:  45, oz: -50, phrase: 2.5 },
    { name: 'Resume',      rgb: '168, 85, 247', ox: -60, oy:  25, oz:  35, phrase: 3.7 },
    { name: 'Certificate', rgb: '6, 182, 212',  ox:  50, oy:  40, oz: -25, phrase: 5.0 },
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
  //  3D HOLOGRAPHIC VAULT RENDERER
  // ═════════════════════════════════════════════════════════════

  private initCanvas(): void {
    const el = this.canvasRef.nativeElement;
    this.cvs = el;
    this.ctx = el.getContext('2d')!;
    this.sizeCanvas();

    this.pts = Array.from({ length: 50 }, () => this.makeParticle(true));
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

    this.mx += (this.targetMx - this.mx) * 0.06;
    this.my += (this.targetMy - this.my) * 0.06;

    this.drawFrame(dt);
  }

  // Perspective Projection
  private proj(x: number, y: number, z: number, rY: number, rX: number, CX: number, CY: number): Pt2 {
    const cY = Math.cos(rY), sY = Math.sin(rY);
    const cX = Math.cos(rX), sX = Math.sin(rX);

    // Rotate Y
    const x1 = x * cY - z * sY;
    const z1 = x * sY + z * cY;
    // Rotate X
    const y2 = y * cX - z1 * sX;
    const z2 = y * sX + z1 * cX;

    const fov = 850;
    const pz  = z2 + fov;
    return { x: CX + x1 * fov / pz, y: CY + y2 * fov / pz, depth: z2 };
  }

  private drawFrame(dt: number): void {
    const ctx = this.ctx;
    const W = this.lw, H = this.lh;
    const t = this.elapsed;

    ctx.clearRect(0, 0, W, H);

    const CX = W * 0.50;
    const CY = H * 0.50;

    // Float + rotation variables
    const floatY = Math.sin(t * (Math.PI * 2 / 8)) * 12;
    const CYf    = CY + floatY;
    const rotY   = t * (Math.PI * 2 / 38) + this.mx * 0.12;
    const rotX   = -0.15 + this.my * 0.06;

    const P = (x: number, y: number, z: number) => this.proj(x, y, z, rotY, rotX, CX, CYf);

    // Size dimensions
    const cubeS = Math.min(W * 0.55, H * 0.55);
    const hw = cubeS * 0.5;
    const hh = cubeS * 0.5;
    const hd = cubeS * 0.5;

    // Base coordinates
    const bTL = P(-hw, -hh, -hd); const bTR = P( hw, -hh, -hd);
    const bBR = P( hw,  hh, -hd); const bBL = P(-hw,  hh, -hd);
    const fTL = P(-hw, -hh,  hd); const fTR = P( hw, -hh,  hd);
    const fBR = P( hw,  hh,  hd); const fBL = P(-hw,  hh,  hd);
    const ctr = P(0, 0, 0);

    // ── 1. Energy Ring ──
    this.drawConcentricRings(ctx, CX, CYf + hh + 20, hw * 1.5, t);

    // ── 2. Background particles ──
    this.drawParticles(ctx, W, H, dt, false);

    // ── 3. Back & Side Glass Faces ──
    this.drawFace(ctx, [bTL, bTR, bBR, bBL], 'rgba(10,35,90,0.18)', 'rgba(96,165,250,0.30)', 1.5);
    this.drawFace(ctx, [bTL, fTL, fBL, bBL], 'rgba(8,25,75,0.12)', 'rgba(96,165,250,0.22)', 1.2);
    this.drawFace(ctx, [bTR, fTR, fBR, bBR], 'rgba(8,25,75,0.12)', 'rgba(96,165,250,0.22)', 1.2);

    // ── 4. Inner core energy column ──
    this.drawEnergyColumn(ctx, ctr.x, ctr.y, hh * 1.6, t);

    // ── 5. Orbiting/Floating document panels ──
    const docPoints = this.drawDocumentPanels(ctx, P, t);

    // ── 6. Top & Bottom face ──
    this.drawFace(ctx, [bTL, bTR, fTR, fTL], 'rgba(20,50,130,0.18)', 'rgba(147,197,253,0.38)', 1.5);
    this.drawFace(ctx, [bBL, bBR, fBR, fBL], 'rgba(5,20,60,0.10)', 'rgba(34,211,238,0.22)', 1.0);

    // ── 7. Front face glass ──
    this.drawFace(ctx, [fTL, fTR, fBR, fBL], 'rgba(59,130,246,0.02)', 'rgba(96,165,250,0.18)', 0.8);

    // ── 8. Vault Door (Hinged right, swung open 35 deg) ──
    this.drawVaultDoor(ctx, P, hw, hh, hd, fTR, fBR, fTL, fBL, t);

    // ── 9. Cube outlines / Double glows ──
    this.drawDoubleOutlines(ctx, { bTL, bTR, bBR, bBL, fTL, fTR, fBR, fBL });

    // ── 10. Foreground particles ──
    this.drawParticles(ctx, W, H, dt, true);
  }

  // ── Face ──────────────────────────────────────────────────────
  private drawFace(ctx: CanvasRenderingContext2D, pts: Pt2[], fill: string, stroke: string, lw: number): void {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  // ── Concentric Base Rings ──────────────────────────────────────
  private drawConcentricRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxR: number, t: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.22); // Perspective angle

    const colors = ['rgba(6,182,212,0.35)', 'rgba(37,99,235,0.22)', 'rgba(139,92,246,0.12)'];
    colors.forEach((col, idx) => {
      const r = maxR * (1.0 - idx * 0.25) * (1.0 + Math.sin(t * 1.5 + idx) * 0.02);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5 - idx * 0.5;
      ctx.stroke();
    });

    ctx.restore();
  }

  // ── Energy Column ──────────────────────────────────────────────
  private drawEnergyColumn(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number, t: number): void {
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
    const w = 24 * pulse;

    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, 'rgba(6,182,212,0)');
    g.addColorStop(0.3, 'rgba(6,182,212,0.18)');
    g.addColorStop(0.5, 'rgba(190,240,255,0.35)');
    g.addColorStop(0.7, 'rgba(6,182,212,0.18)');
    g.addColorStop(1, 'rgba(6,182,212,0)');

    ctx.fillStyle = g;
    ctx.fillRect(cx - w, cy - h / 2, w * 2, h);

    // Inner core laser beam
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx, cy + h / 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── Orbiting Document Panels ──────────────────────────────────
  private drawDocumentPanels(
    ctx: CanvasRenderingContext2D,
    P: (x: number, y: number, z: number) => Pt2,
    t: number,
  ): { x: number; y: number }[] {
    return this.DOCS.map(doc => {
      // Bobbing inside vault coordinates
      const bx = doc.ox + Math.sin(t * 1.1 + doc.phrase) * 10;
      const by = doc.oy + Math.cos(t * 0.95 + doc.phrase) * 12;
      const bz = doc.oz + Math.sin(t * 1.35 + doc.phrase) * 10;

      const p = P(bx, by, bz);
      const scale = 850 / (850 + bz);

      const CW = 62 * scale;
      const CH = 46 * scale;
      const CR = 5 * scale;

      ctx.save();
      ctx.translate(p.x, p.y);

      // Glass panel backing
      ctx.beginPath();
      this.rr(ctx, -CW / 2, -CH / 2, CW, CH, CR);
      ctx.fillStyle = `rgba(8,16,45,0.85)`;
      ctx.strokeStyle = `rgba(${doc.rgb}, 0.7)`;
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      // Top colored accent
      ctx.beginPath();
      this.rr(ctx, -CW / 2, -CH / 2, CW, 12 * scale, [CR, CR, 0, 0] as any);
      ctx.fillStyle = `rgba(${doc.rgb}, 0.8)`;
      ctx.fill();

      // Name label
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(7, Math.round(9 * scale))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(doc.name, 0, 6 * scale);

      // Mock text details
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(-CW / 2 + 6, 23 * scale, CW - 12, 3.5 * scale);
      ctx.fillRect(-CW / 2 + 6, 31 * scale, (CW - 12) * 0.6, 3.5 * scale);

      ctx.restore();

      return { x: p.x, y: p.y };
    });
  }

  // ── Vault Door (Open Door right) ──────────────────────────────
  private drawVaultDoor(
    ctx: CanvasRenderingContext2D,
    P: (x: number, y: number, z: number) => Pt2,
    hw: number, hh: number, hd: number,
    fTR: Pt2, fBR: Pt2, fTL: Pt2, fBL: Pt2,
    t: number,
  ): void {
    const angle = 0.55; // 32 degrees open
    const dw = hw * 2;
    const dxEnd = -hw + dw * Math.cos(angle);
    const dzEnd = hd - dw * Math.sin(angle);

    // Projected door nodes
    const dTL = P(dxEnd, -hh, dzEnd);
    const dBL = P(dxEnd, hh, dzEnd);

    // Door glass face
    this.drawFace(ctx, [dTL, fTR, fBR, dBL], 'rgba(37,99,235,0.14)', 'rgba(96,165,250,0.45)', 1.5);

    // Lock circular wheel plate on door
    const hx = (dTL.x + fTR.x * 2.2) / 3.2;
    const hy = (dTL.y + fTR.y + dBL.y + fBR.y) / 4;
    
    // Outer gear wheel
    ctx.beginPath();
    ctx.arc(hx, hy, 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96,165,250,0.85)';
    ctx.fill();
  }

  // ── Double outlines (Futuristic glass panels thick edges) ─────
  private drawDoubleOutlines(ctx: CanvasRenderingContext2D, V: Record<string, Pt2>): void {
    const edges = [
      [V['bTL'], V['bTR']], [V['bTR'], V['bBR']], [V['bBR'], V['bBL']], [V['bBL'], V['bTL']],
      [V['fTL'], V['fTR']], [V['fTR'], V['fBR']], [V['fBR'], V['fBL']], [V['fBL'], V['fTL']],
      [V['bTL'], V['fTL']], [V['bTR'], V['fTR']], [V['bBR'], V['fBR']], [V['bBL'], V['fBL']],
    ];

    ctx.strokeStyle = 'rgba(96,165,250,0.4)';
    ctx.lineWidth = 1.0;
    edges.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    // Draw secondary offset outlines to make borders double-layered (glowing look)
    ctx.strokeStyle = 'rgba(6,182,212,0.15)';
    ctx.lineWidth = 2.5;
    edges.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
  }

  // ── Particles ──────────────────────────────────────────────────
  private makeParticle(randomLife = false): Particle {
    const W = this.lw || 800, H = this.lh || 700;
    return {
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.15,
      vy:      -(Math.random() * 0.3 + 0.05),
      alpha:   Math.random() * 0.4 + 0.1,
      size:    Math.random() * 1.5 + 0.4,
      life:    randomLife ? Math.random() * 6 : 0,
      maxLife: 6 + Math.random() * 6,
    };
  }

  private drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number, fg: boolean): void {
    this.pts.forEach((p, idx) => {
      // Split front vs back
      const isFg = p.size > 1.0;
      if (isFg !== fg) return;

      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;

      if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > W + 10) {
        this.pts[idx] = this.makeParticle(false);
        return;
      }

      const ratio = p.life / p.maxLife;
      const alphaFactor = ratio < 0.1 ? ratio / 0.1 : ratio > 0.9 ? (1 - ratio) / 0.1 : 1;
      const a = p.alpha * alphaFactor;

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
