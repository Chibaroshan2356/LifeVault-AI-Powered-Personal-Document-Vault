/**
 * welcome.component.ts — Cinematic Welcome Page v6 (Option C Exact Mockup Visual)
 *
 * Renders the exact user-uploaded vault centerpiece asset with dynamic layers:
 *  • Base concentric rings rotating below
 *  • Drifting particles (depth-layered)
 *  • Specalized specular neon laser sweep moving vertically across the vault
 *  • Easing mouse parallax on the centerpiece layout
 *  • 60 FPS performance
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

  // Pre-rendered exact vault asset
  private vaultImg = new Image();
  private imgLoaded = false;

  // Parallax vectors
  private mx = 0;
  private my = 0;
  private targetMx = 0;
  private targetMy = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly router:      Router,
    private readonly cdr:         ChangeDetectorRef,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.resolveUserName();
    this.runStaggeredReveal();
    // Load the exact vault centerpiece asset
    this.vaultImg.src = 'assets/holographic_vault_core.png';
    this.vaultImg.onload = () => {
      this.imgLoaded = true;
    };
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
  //  CANVAS RENDER ENGINE
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

    this.mx += (this.targetMx - this.mx) * 0.05;
    this.my += (this.targetMy - this.my) * 0.05;

    this.drawFrame(dt);
  }

  private drawFrame(dt: number): void {
    const ctx = this.ctx;
    const W = this.lw, H = this.lh;
    const t = this.elapsed;

    ctx.clearRect(0, 0, W, H);

    // Parallax centering + float
    const cx = W * 0.50 + this.mx * 30;
    const cy = H * 0.50 - this.my * 25;
    const floatY = Math.sin(t * (Math.PI * 2 / 8)) * 10;
    const ncy = cy + floatY;

    const S = Math.min(W * 0.95, H * 0.95);

    // ── 1. Concentric base rings ──
    this.drawBaseRings(ctx, cx, ncy + S * 0.32, S * 0.45, t);

    // ── 2. Background particles ──
    this.drawParticles(ctx, W, H, dt, false);

    // ── 3. Draw pre-rendered premium 3D Glass Vault asset ──
    if (this.imgLoaded) {
      ctx.save();
      const pulseScale = 1.0 + Math.sin(t * 1.5) * 0.01;
      const imgW = S * 0.92 * pulseScale;
      const imgH = S * 0.72 * pulseScale; // Maintain exact crop aspect ratio
      
      ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
      ctx.shadowBlur = 50;
      ctx.drawImage(this.vaultImg, cx - imgW / 2, ncy - imgH / 2, imgW, imgH);
      ctx.restore();
    }

    // ── 4. Laser scan sweeps ──
    this.drawLaserScanner(ctx, cx, ncy, S * 0.92, S * 0.72, t);

    // ── 5. Foreground particles ──
    this.drawParticles(ctx, W, H, dt, true);
  }

  // ── Concentric Base Rings ──────────────────────────────────────
  private drawBaseRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxR: number, t: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.22);

    const colors = ['rgba(6,182,212,0.30)', 'rgba(37,99,235,0.18)', 'rgba(139,92,246,0.08)'];
    colors.forEach((col, idx) => {
      const r = maxR * (1.0 - idx * 0.28) * (1.0 + Math.sin(t * 1.5 + idx) * 0.01);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.0 - idx * 0.5;
      ctx.stroke();
    });

    ctx.restore();
  }

  // ── Specular Laser Scanner Sweep ───────────────────────────────
  private drawLaserScanner(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, t: number): void {
    const minY = cy - h / 2;
    const maxY = cy + h / 2;

    const cycle = (t % 5.0) / 5.0; // 5 seconds sweep cycle
    if (cycle < 0.75) {
      const sy = minY + (cycle / 0.75) * (maxY - minY);
      const intensity = Math.sin((cycle / 0.75) * Math.PI) * 0.45;

      const g = ctx.createLinearGradient(cx - w / 2, sy, cx + w / 2, sy);
      g.addColorStop(0, 'rgba(96,165,250,0)');
      g.addColorStop(0.2, `rgba(96,165,250,${intensity})`);
      g.addColorStop(0.5, `rgba(190,220,255,${intensity * 1.5})`);
      g.addColorStop(0.8, `rgba(96,165,250,${intensity})`);
      g.addColorStop(1, 'rgba(96,165,250,0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, sy);
      ctx.lineTo(cx + w / 2, sy);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Soft light beam shadow underneath scanner line
      const beamG = ctx.createLinearGradient(0, sy, 0, sy + 30);
      beamG.addColorStop(0, `rgba(6,182,212,${intensity * 0.25})`);
      beamG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beamG;
      ctx.fillRect(cx - w / 2, sy, w, 30);

      ctx.restore();
    }
  }

  // ── Particles ──────────────────────────────────────────────────
  private makeParticle(randomLife = false): Particle {
    const W = this.lw || 800, H = this.lh || 700;
    return {
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.12,
      vy:      -(Math.random() * 0.35 + 0.05),
      alpha:   Math.random() * 0.45 + 0.08,
      size:    Math.random() * 1.5 + 0.4,
      life:    randomLife ? Math.random() * 6 : 0,
      maxLife: 6 + Math.random() * 6,
    };
  }

  private drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number, fg: boolean): void {
    this.pts.forEach((p, idx) => {
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
}
