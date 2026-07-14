/**
 * welcome.component.ts — Premium Cinematic AI Welcome Page (v2)
 *
 * Boot sequence: 0→2.2s total (Initializing → Scanning → Verified → Ready)
 * Features: Document ingestion animation, premium Three.js sphere,
 *           personalized identity panel, holographic orbit ecosystem.
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

interface BootLine { text: string; type: 'init' | 'online' | 'ready'; }

interface DocCard {
  mesh: any;
  radius: number;
  speed: number;
  angle: number;
  baseY: number;
  ingesting: boolean;
  ingestT: number;
  orbitX: number;
  orbitZ: number;
  name: string;
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
  userName        = 'User';
  scanStage: ScanStage = 'initializing';
  isLeaving       = false;
  isLoaded        = false;

  // Boot sequence
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

  // Left panel staggered reveal
  showBrand   = false;
  showTagline = false;
  showSub     = false;
  showBadges  = false;
  showBoot    = false;
  showIdentity= false;
  showBtn     = false;

  // ── Three.js ─────────────────────────────────────────────────
  private renderer:      any;
  private scene:         any;
  private camera:        any;
  private clock:         any;
  private orbGroup:      any;
  private coreSphereMat: any;      // Reference to animate brightness
  private ringPivots:    any[] = [];
  private docCards:      DocCard[] = [];
  private particles:     any;
  private animationId!:  number;
  private ingestionActive = false;
  private ingestionTimer: any;
  private currentMouseX   = 0;
  private currentMouseY   = 0;

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
    this.loadThreeJs().then(() => {
      this.clock = new window.THREE.Clock();
      this.initThreeScene();
      this.startIngestionLoop();
    });
    requestAnimationFrame(() => {
      this.isLoaded = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.animationId)   cancelAnimationFrame(this.animationId);
    if (this.ingestionTimer) clearInterval(this.ingestionTimer);
    if (this.renderer)      this.renderer.dispose();
  }

  // ── User name ─────────────────────────────────────────────────
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
        error: () => { /* keep default 'User' */ },
      });
    }
  }

  // ── Boot sequence (0 → 1.4s) ─────────────────────────────────
  private runBootSequence(): void {
    const delays    = [0, 250, 480, 700, 950];
    const progresses= [5, 30, 55, 80, 100];

    delays.forEach((delay, i) => {
      setTimeout(() => {
        this.visibleBootCount = i + 1;
        this.bootProgress     = progresses[i];
        if (i === delays.length - 1) {
          this.bootComplete = true;
          setTimeout(() => this.runIdentityScan(), 150);
        }
        this.cdr.markForCheck();
      }, delay);
    });
  }

  // ── Identity scan (1.4 → 2.2s) ───────────────────────────────
  private runIdentityScan(): void {
    this.scanStage = 'scanning';
    this.cdr.markForCheck();

    setTimeout(() => {
      this.scanStage = 'verified';
      this.cdr.markForCheck();
    }, 450);

    setTimeout(() => {
      this.scanStage = 'ready';
      this.cdr.markForCheck();
    }, 850);
  }

  // ── UI staggered reveal ───────────────────────────────────────
  private runStaggeredReveal(): void {
    setTimeout(() => { this.showBrand   = true; this.cdr.markForCheck(); }, 100);
    setTimeout(() => { this.showTagline = true; this.cdr.markForCheck(); }, 250);
    setTimeout(() => { this.showSub     = true; this.cdr.markForCheck(); }, 400);
    setTimeout(() => { this.showBadges  = true; this.cdr.markForCheck(); }, 550);
    setTimeout(() => { this.showBoot    = true; this.cdr.markForCheck(); }, 700);
    setTimeout(() => { this.showIdentity= true; this.cdr.markForCheck(); }, 900);
    setTimeout(() => { this.showBtn     = true; this.cdr.markForCheck(); }, 1100);
  }

  // ── Enter vault ───────────────────────────────────────────────
  enterVault(): void {
    if (this.scanStage !== 'ready') return;
    this.isLeaving = true;
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/dashboard']), 1200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.currentMouseX = ((e.clientX - window.innerWidth  / 2) / window.innerWidth)  * 2;
    this.currentMouseY = -((e.clientY - window.innerHeight / 2) / window.innerHeight) * 2;
  }

  // ── Boot line helpers for template ───────────────────────────
  get visibleBootLines(): BootLine[] {
    return this.allBootLines.slice(0, this.visibleBootCount);
  }

  // ── Three.js CDN loader ───────────────────────────────────────
  private loadThreeJs(): Promise<void> {
    return new Promise((resolve) => {
      if (window.THREE) { resolve(); return; }
      const s  = document.createElement('script');
      s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => resolve();
      document.body.appendChild(s);
    });
  }

  // ── Scene init ────────────────────────────────────────────────
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
    this.camera = new T.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 13);

    this.orbGroup = new T.Group();
    this.scene.add(this.orbGroup);

    this.buildPremiumSphere();
    this.buildDocumentCards();
    this.buildParticles();
    this.animate();
  }

  // ── Premium Sphere ────────────────────────────────────────────
  private buildPremiumSphere(): void {
    const T = window.THREE;

    // Deepest core — solid fill
    this.coreSphereMat = new T.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.80 });
    this.orbGroup.add(new T.Mesh(new T.SphereGeometry(1.8, 64, 64), this.coreSphereMat));

    // Inner glow shell 1
    this.orbGroup.add(new T.Mesh(
      new T.SphereGeometry(2.1, 32, 32),
      new T.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.30, side: T.BackSide })
    ));

    // Inner glow shell 2 (larger)
    this.orbGroup.add(new T.Mesh(
      new T.SphereGeometry(2.5, 32, 32),
      new T.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.10, side: T.BackSide })
    ));

    // Wireframe icosahedron
    this.orbGroup.add(new T.Mesh(
      new T.IcosahedronGeometry(2.8, 3),
      new T.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.28 })
    ));

    // Outer atmosphere shell
    this.orbGroup.add(new T.Mesh(
      new T.SphereGeometry(3.2, 32, 32),
      new T.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.04, side: T.BackSide })
    ));

    // 4 torus rings
    const rings = [
      { r: 3.5, t: 0.022, color: 0x3b82f6, rx: 0.4,  rz: 0.0  },
      { r: 3.9, t: 0.018, color: 0x06b6d4, rx: 1.15, rz: 0.55 },
      { r: 4.3, t: 0.016, color: 0x8b5cf6, rx: 0.8,  rz: 1.4  },
      { r: 4.7, t: 0.012, color: 0x22d3ee, rx: 1.55, rz: 0.9  },
    ];
    rings.forEach(({ r, t, color, rx, rz }) => {
      const mat   = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.40, side: T.DoubleSide });
      const ring  = new T.Mesh(new T.TorusGeometry(r, t, 16, 140), mat);
      const pivot = new T.Group();
      pivot.rotation.set(rx, 0, rz);
      pivot.add(ring);
      this.orbGroup.add(pivot);
      this.ringPivots.push(pivot);
    });
  }

  // ── Document Cards (holographic orbit ecosystem) ──────────────
  private buildDocumentCards(): void {
    const T = window.THREE;
    const docs = [
      { name: 'Passport',    color: '#ff6b6b', hex: 0xff6b6b },
      { name: 'Resume',      color: '#3b82f6', hex: 0x3b82f6 },
      { name: 'Aadhaar',     color: '#2ecc71', hex: 0x2ecc71 },
      { name: 'PAN',         color: '#f59e0b', hex: 0xf59e0b },
      { name: 'Certificate', color: '#a78bfa', hex: 0xa78bfa },
      { name: 'Invoice',     color: '#22d3ee', hex: 0x22d3ee },
    ];

    const geo = new T.PlaneGeometry(1.05, 1.40);

    docs.forEach((doc, i) => {
      const tex    = this.buildCardTexture(T, doc.name, doc.color);
      const mat    = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, side: T.DoubleSide });
      const mesh   = new T.Mesh(geo, mat);
      const radius = 5.8 + (i % 2) * 0.8;
      const angle  = (i * Math.PI * 2) / docs.length;
      const baseY  = (i % 3 - 1) * 1.5;

      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      this.orbGroup.add(mesh);

      // Glowing connection line
      const lineMat = new T.LineBasicMaterial({ color: doc.hex, transparent: true, opacity: 0.22 });
      const linePts = [new T.Vector3(0, 0, 0), mesh.position.clone()];
      this.orbGroup.add(new T.Line(new T.BufferGeometry().setFromPoints(linePts), lineMat));

      this.docCards.push({
        mesh, radius, speed: 0.20 + i * 0.03, angle, baseY,
        ingesting: false, ingestT: 0,
        orbitX: mesh.position.x, orbitZ: mesh.position.z,
        name: doc.name,
      });
    });
  }

  private buildCardTexture(T: any, name: string, accent: string): any {
    const c   = document.createElement('canvas');
    c.width   = 280; c.height = 370;
    const ctx = c.getContext('2d')!;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, 370);
    bg.addColorStop(0, 'rgba(10,20,55,0.98)');
    bg.addColorStop(1, 'rgba(5,10,35,0.98)');
    ctx.fillStyle = bg;
    ctx.roundRect(5, 5, 270, 360, 18); ctx.fill();

    // Top accent band
    ctx.fillStyle = accent; ctx.globalAlpha = 0.90;
    ctx.roundRect(5, 5, 270, 46, [18, 18, 0, 0]); ctx.fill();
    ctx.globalAlpha = 1;

    // Accent border
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55;
    ctx.roundRect(5, 5, 270, 360, 18); ctx.stroke();
    ctx.globalAlpha = 1;

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 140, 96);

    // AI VERIFIED label
    ctx.fillStyle = accent; ctx.globalAlpha = 0.60;
    ctx.roundRect(70, 108, 140, 18, 9); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('AI VERIFIED', 140, 121);

    // Placeholder lines
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    [148, 178, 208, 238, 268].forEach((y, li) => {
      const lw = li % 2 === 0 ? 220 : 150;
      ctx.roundRect((280 - lw) / 2, y, lw, 9, 4);
      ctx.fill();
    });

    // Bottom icon
    ctx.beginPath(); ctx.arc(140, 330, 16, 0, Math.PI * 2);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1;

    return new T.CanvasTexture(c);
  }

  // ── Particles ─────────────────────────────────────────────────
  private buildParticles(): void {
    const T     = window.THREE;
    const count = 450;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 40;

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));

    this.particles = new T.Points(geo, new T.PointsMaterial({
      color: 0x7dd3fc, size: 0.05, transparent: true, opacity: 0.50,
    }));
    this.scene.add(this.particles);
  }

  // ── Document ingestion loop ───────────────────────────────────
  private startIngestionLoop(): void {
    // Trigger ingestion every 3.5s
    this.ingestionTimer = setInterval(() => {
      if (!this.ingestionActive) {
        this.triggerIngestion();
      }
    }, 3500);
  }

  private triggerIngestion(): void {
    if (this.ingestionActive || this.docCards.length === 0 || this.isLeaving) return;
    this.ingestionActive = true;

    const idx  = Math.floor(Math.random() * this.docCards.length);
    const card = this.docCards[idx];
    card.ingesting = true;
    card.ingestT   = 0;
  }

  // ── Render loop ───────────────────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Orb group rotation + parallax
    if (this.orbGroup) {
      this.orbGroup.rotation.y = t * 0.08 + this.currentMouseX * 0.16;
      this.orbGroup.rotation.x = Math.sin(t * 0.06) * 0.06 + this.currentMouseY * 0.08;
      const breathe = 1 + Math.sin(t * 1.4) * 0.022;
      this.orbGroup.scale.setScalar(breathe);
    }

    // Rings counter-rotate
    this.ringPivots.forEach((piv, i) => {
      piv.rotation.y += 0.003 * (i % 2 === 0 ? 1 : -1.3);
    });

    const boost = this.isLeaving ? 6 : 1;

    this.docCards.forEach((c) => {
      if (c.ingesting) {
        // Ease in-out toward center
        c.ingestT = Math.min(1, c.ingestT + 0.016);
        const ease = c.ingestT < 0.5
          ? 2 * c.ingestT * c.ingestT
          : 1 - Math.pow(-2 * c.ingestT + 2, 2) / 2;

        c.mesh.position.x = c.orbitX * (1 - ease);
        c.mesh.position.y = c.baseY  * (1 - ease);
        c.mesh.position.z = c.orbitZ * (1 - ease);
        c.mesh.scale.setScalar(Math.max(0, 1 - ease * 1.1));

        if (c.ingestT >= 1) {
          // Flash core briefly
          if (this.coreSphereMat) this.coreSphereMat.opacity = 1.0;
          setTimeout(() => {
            if (this.coreSphereMat) this.coreSphereMat.opacity = 0.80;
            c.ingesting  = false;
            c.ingestT    = 0;
            c.mesh.scale.setScalar(1);
            // Reposition at new angle
            c.angle      += Math.PI * 0.4;
            c.orbitX     = Math.cos(c.angle) * c.radius;
            c.orbitZ     = Math.sin(c.angle) * c.radius;
            c.mesh.position.set(c.orbitX, c.baseY, c.orbitZ);
            this.ingestionActive = false;
          }, 500);
        }
      } else {
        // Normal orbit
        c.angle     += c.speed * 0.003 * boost;
        const ox     = Math.cos(c.angle) * c.radius;
        const oz     = Math.sin(c.angle) * c.radius;
        const oy     = c.baseY + Math.sin(t * 0.5 + c.angle) * 0.3;
        c.mesh.position.set(ox, oy, oz);
        c.orbitX     = ox;
        c.orbitZ     = oz;
        c.mesh.lookAt(this.camera.position);
      }
    });

    if (this.particles) {
      this.particles.rotation.y = t * 0.025;
      this.particles.rotation.x = t * 0.012;
    }

    // Camera zoom on exit
    if (this.isLeaving && this.camera.position.z > 1) {
      this.camera.position.z -= 0.22;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
