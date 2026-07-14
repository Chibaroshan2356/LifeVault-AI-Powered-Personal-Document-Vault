/**
 * welcome.component.ts — Cinematic AI Welcome/Entry Page
 *
 * Rendered at /welcome immediately after login.
 * Presents a premium AI scanning sequence before entering the dashboard.
 *
 * Stages:
 *  'initializing' → 'scanning' → 'verified' → 'ready'
 *
 * The dashboard is only accessible after clicking "Enter Vault".
 * Three.js is loaded via CDN (window.THREE) — same pattern as app.component.ts.
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
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

declare const window: any;

export type ScanStage = 'initializing' | 'scanning' | 'verified' | 'ready';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  host: {
    '[class.is-leaving]': 'isLeaving',
    '[class.is-loaded]':  'isLoaded',
  },
})
export class WelcomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('welcomeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── State ──────────────────────────────────────
  userName   = 'User';
  scanStage: ScanStage = 'initializing';
  isLeaving  = false;
  isLoaded   = false;

  showTag1    = false;
  showTag2    = false;
  showTag3    = false;
  showSub     = false;
  showBadges  = false;
  showScanner = false;
  showBtn     = false;

  // ── Three.js (window.THREE via CDN) ────────────
  private renderer:    any;
  private scene:       any;
  private camera:      any;
  private clock:       any;
  private orbGroup:    any;
  private ringPivots:  any[] = [];
  private docCards:    any[] = [];
  private particles:   any;
  private animationId!: number;
  private currentMouseX = 0;
  private currentMouseY = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly router:      Router,
    private readonly cdr:         ChangeDetectorRef,
  ) {}

  // ── Lifecycle ───────────────────────────────────
  ngOnInit(): void {
    this.resolveUserName();
    this.runScanSequence();
    this.runTextReveal();
  }

  ngAfterViewInit(): void {
    this.loadThreeJs().then(() => {
      const T   = window.THREE;
      this.clock = new T.Clock();
      this.initThreeScene();
    });
    // Trigger entry fade-in
    requestAnimationFrame(() => {
      this.isLoaded = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer)    this.renderer.dispose();
  }

  // ── User name ───────────────────────────────────
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
        error: () => { /* Keep default 'User' */ },
      });
    }
  }

  // ── AI Scan sequence ────────────────────────────
  private runScanSequence(): void {
    this.scanStage = 'initializing';

    setTimeout(() => {
      this.scanStage = 'scanning';
      this.cdr.markForCheck();
    }, 1800);

    setTimeout(() => {
      this.scanStage = 'verified';
      this.cdr.markForCheck();
    }, 3800);

    setTimeout(() => {
      this.scanStage = 'ready';
      this.cdr.markForCheck();
    }, 5800);
  }

  // ── Text reveal stagger ─────────────────────────
  private runTextReveal(): void {
    setTimeout(() => { this.showTag1    = true; this.cdr.markForCheck(); },  400);
    setTimeout(() => { this.showTag2    = true; this.cdr.markForCheck(); },  900);
    setTimeout(() => { this.showTag3    = true; this.cdr.markForCheck(); }, 1400);
    setTimeout(() => { this.showSub    = true; this.cdr.markForCheck(); }, 1900);
    setTimeout(() => { this.showBadges = true; this.cdr.markForCheck(); }, 2400);
    setTimeout(() => { this.showScanner= true; this.cdr.markForCheck(); }, 2900);
    setTimeout(() => { this.showBtn    = true; this.cdr.markForCheck(); }, 3400);
  }

  // ── Actions ─────────────────────────────────────
  enterVault(): void {
    if (this.scanStage !== 'ready') return;
    this.isLeaving = true;
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/dashboard']), 1400);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.currentMouseX = ((e.clientX - window.innerWidth  / 2) / window.innerWidth)  * 2;
    this.currentMouseY = -((e.clientY - window.innerHeight / 2) / window.innerHeight) * 2;
  }

  // ── Three.js CDN loader ─────────────────────────
  private loadThreeJs(): Promise<void> {
    return new Promise((resolve) => {
      if (window.THREE) { resolve(); return; }
      const s   = document.createElement('script');
      s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload  = () => resolve();
      document.body.appendChild(s);
    });
  }

  // ── Scene init ──────────────────────────────────
  private initThreeScene(): void {
    const T      = window.THREE;
    const canvas = this.canvasRef.nativeElement;
    const w      = canvas.clientWidth  || 800;
    const h      = canvas.clientHeight || 700;

    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene  = new T.Scene();
    this.camera = new T.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 14);

    this.orbGroup = new T.Group();
    this.scene.add(this.orbGroup);

    this.buildSphere();
    this.buildDocumentCards();
    this.buildParticles();
    this.animate();
  }

  // ── Sphere ──────────────────────────────────────
  private buildSphere(): void {
    const T = window.THREE;

    this.orbGroup.add(new T.Mesh(
      new T.SphereGeometry(2.2, 64, 64),
      new T.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.60 })
    ));

    this.orbGroup.add(new T.Mesh(
      new T.SphereGeometry(2.8, 32, 32),
      new T.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.08, side: T.BackSide })
    ));

    this.orbGroup.add(new T.Mesh(
      new T.IcosahedronGeometry(3.0, 2),
      new T.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.30 })
    ));

    const ringDefs = [
      { r: 3.6, color: 0x3b82f6, rx: 0.4, rz: 0   },
      { r: 4.0, color: 0x06b6d4, rx: 1.1, rz: 0.6 },
      { r: 4.4, color: 0x8b5cf6, rx: 0.9, rz: 1.4 },
    ];
    ringDefs.forEach(({ r, color, rx, rz }) => {
      const mat   = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: T.DoubleSide });
      const ring  = new T.Mesh(new T.TorusGeometry(r, 0.028, 16, 120), mat);
      const pivot = new T.Group();
      pivot.rotation.set(rx, 0, rz);
      pivot.add(ring);
      this.orbGroup.add(pivot);
      this.ringPivots.push(pivot);
    });
  }

  // ── Document Cards ──────────────────────────────
  private buildDocumentCards(): void {
    const T    = window.THREE;
    const docs = [
      { name: 'Passport',    color: '#ff6b6b', hex: 0xff6b6b },
      { name: 'Resume',      color: '#3b82f6', hex: 0x3b82f6 },
      { name: 'Aadhaar',     color: '#2ecc71', hex: 0x2ecc71 },
      { name: 'PAN',         color: '#f39c12', hex: 0xf39c12 },
      { name: 'Certificate', color: '#8b5cf6', hex: 0x8b5cf6 },
      { name: 'Invoice',     color: '#06b6d4', hex: 0x06b6d4 },
    ];
    const geo = new T.PlaneGeometry(1.1, 1.45);

    docs.forEach((doc, i) => {
      const tex    = this.buildCardTexture(T, doc.name, doc.color);
      const mat    = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: T.DoubleSide });
      const mesh   = new T.Mesh(geo, mat);
      const radius = 5.8 + (i % 2) * 0.7;
      const angle  = (i * Math.PI * 2) / docs.length;
      const baseY  = (i % 3 - 1) * 1.4;

      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      this.orbGroup.add(mesh);

      // Connection line from centre to card
      const lineMat = new T.LineBasicMaterial({ color: doc.hex, transparent: true, opacity: 0.28 });
      const linePts = [new T.Vector3(0, 0, 0), mesh.position.clone()];
      this.orbGroup.add(new T.Line(new T.BufferGeometry().setFromPoints(linePts), lineMat));

      this.docCards.push({ mesh, radius, speed: 0.22 + i * 0.035, angle, baseY });
    });
  }

  private buildCardTexture(T: any, name: string, accentColor: string): any {
    const c   = document.createElement('canvas');
    c.width   = 280;
    c.height  = 370;
    const ctx = c.getContext('2d')!;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, 370);
    grad.addColorStop(0, 'rgba(15,23,47,0.97)');
    grad.addColorStop(1, 'rgba(20,30,60,0.97)');
    ctx.fillStyle = grad;
    ctx.roundRect(6, 6, 268, 358, 18);
    ctx.fill();

    // Top accent bar
    ctx.fillStyle   = accentColor;
    ctx.globalAlpha = 0.85;
    ctx.roundRect(6, 6, 268, 44, [18, 18, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.roundRect(6, 6, 268, 358, 18);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Name text
    ctx.fillStyle  = '#ffffff';
    ctx.font       = 'bold 30px Inter, sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(name, 140, 94);

    // Placeholder lines
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    [120, 155, 190, 225, 260].forEach((y, li) => {
      const lw = li % 2 === 0 ? 220 : 160;
      ctx.roundRect((280 - lw) / 2, y, lw, 10, 5);
      ctx.fill();
    });

    // Circle icon
    ctx.beginPath();
    ctx.arc(140, 315, 14, 0, Math.PI * 2);
    ctx.fillStyle   = accentColor;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;

    return new T.CanvasTexture(c);
  }

  // ── Particles ───────────────────────────────────
  private buildParticles(): void {
    const T     = window.THREE;
    const count = 350;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 35;

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));

    this.particles = new T.Points(geo, new T.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.055,
      transparent: true,
      opacity: 0.55,
    }));
    this.scene.add(this.particles);
  }

  // ── Render loop ─────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    if (this.orbGroup) {
      this.orbGroup.rotation.y = t * 0.10 + this.currentMouseX * 0.18;
      this.orbGroup.rotation.x = Math.sin(t * 0.07) * 0.07 + this.currentMouseY * 0.10;
      const breathe = 1 + Math.sin(t * 1.5) * 0.025;
      this.orbGroup.scale.setScalar(breathe);
    }

    this.ringPivots.forEach((piv, i) => {
      piv.rotation.y += 0.004 * (i % 2 === 0 ? 1 : -1);
    });

    const boost = this.isLeaving ? 5 : 1;
    this.docCards.forEach((c) => {
      c.angle        += c.speed * 0.003 * boost;
      c.mesh.position.x = Math.cos(c.angle) * c.radius;
      c.mesh.position.z = Math.sin(c.angle) * c.radius;
      c.mesh.position.y = c.baseY + Math.sin(t * 0.55 + c.angle) * 0.3;
      c.mesh.lookAt(this.camera.position);
    });

    if (this.particles) {
      this.particles.rotation.y = t * 0.03;
      this.particles.rotation.x = t * 0.015;
    }

    // Zoom on exit
    if (this.isLeaving && this.camera.position.z > 3) {
      this.camera.position.z -= 0.18;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
