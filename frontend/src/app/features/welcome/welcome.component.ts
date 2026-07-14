/**
 * welcome.component.ts — Premium Apple-Style Welcome Page
 *
 * Implements a true 3D holographic glass vault using Three.js:
 *  • Loads Three.js dynamically via CDN
 *  • Renders a translucent physical glass cube vault with neon edge glows
 *  • Incorporates a slightly open door pivoted on the right with gear wheel handle
 *  • Houses 5 high-fidelity floating document texture panels (Aadhaar, Passport, etc.)
 *  • Adds thin energy rings, a central laser light cylinder, particles, and soft light beams
 *  • Integrates responsive resizing and target-easing mouse parallax
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
  isLeaving  = false;
  isLoaded   = false;

  // Staggered fades
  showBrand    = false;
  showTagline  = false;
  showSub      = false;
  showBadges   = false;
  showBtn      = false;

  // ── Three.js Context ─────────────────────────────────────────
  private renderer: any;
  private scene: any;
  private camera: any;
  private animationFrameId!: number;
  private resizeObs!: ResizeObserver;

  // Render objects
  private vaultGroup: any;
  private coreLaser: any;
  private particles: any;
  private rings: any[] = [];
  private docCards: any[] = [];
  private innerLight: any;

  // Interactivity
  private targetMouseX = 0;
  private targetMouseY = 0;
  private currentMouseX = 0;
  private currentMouseY = 0;

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
    this.loadThreeJs().then(() => {
      this.initThree();
      this.animate();
      this.isLoaded = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObs?.disconnect();
    this.cleanupThree();
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
    setTimeout(() => { this.showTagline = true; this.cdr.markForCheck(); }, 200);
    setTimeout(() => { this.showSub     = true; this.cdr.markForCheck(); }, 300);
    setTimeout(() => { this.showBadges  = true; this.cdr.markForCheck(); }, 400);
    setTimeout(() => { this.showBtn     = true; this.cdr.markForCheck(); }, 500);
  }

  enterVault(): void {
    this.isLeaving = true;
    this.cdr.markForCheck();
    setTimeout(() => this.router.navigate(['/dashboard']), 1200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  // ═════════════════════════════════════════════════════════════
  //  THREE.JS HOLOGRAPHIC SCENE
  // ═════════════════════════════════════════════════════════════

  private loadThreeJs(): Promise<void> {
    return new Promise((resolve) => {
      if (window.THREE) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  private initThree(): void {
    const THREE = window.THREE;
    const canvas = this.canvasRef.nativeElement;
    const pEl = canvas.parentElement!;
    const w = pEl.clientWidth || 800;
    const h = pEl.clientHeight || 700;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 8.5);

    // Group to host all vault elements
    this.vaultGroup = new THREE.Group();
    this.scene.add(this.vaultGroup);

    // ── Lights ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 0.85);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const dirLightLeft = new THREE.DirectionalLight(0x8b5cf6, 0.5);
    dirLightLeft.position.set(-5, 3, -5);
    this.scene.add(dirLightLeft);

    this.innerLight = new THREE.PointLight(0x06b6d4, 4.0, 8.0);
    this.innerLight.position.set(0, 0, 0);
    this.vaultGroup.add(this.innerLight);

    // ── Build Vault Cube (Double Glow Outlines) ──
    const cubeSize = 2.2;
    const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    const vaultMesh = new THREE.Mesh(boxGeo, glassMat);
    this.vaultGroup.add(vaultMesh);

    // Glowing edge lines
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edgesGeo, lineMat);
    this.vaultGroup.add(edgeLines);

    // Inner double outline frame
    const edgesGeoInner = new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize - 0.05, cubeSize - 0.05, cubeSize - 0.05));
    const lineMatInner = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 1 });
    const edgeLinesInner = new THREE.LineSegments(edgesGeoInner, lineMatInner);
    this.vaultGroup.add(edgeLinesInner);

    // ── Vault Door (Swung open right) ──
    const doorGroup = new THREE.Group();
    // Pivot on the right-front edge of the vault
    doorGroup.position.set(cubeSize / 2, 0, cubeSize / 2);
    doorGroup.rotation.y = 0.55; // 32 degrees swung open
    
    // Door panel centered on local offset
    const doorPanelGeo = new THREE.BoxGeometry(cubeSize, cubeSize, 0.04);
    const doorPanel = new THREE.Mesh(doorPanelGeo, glassMat);
    doorPanel.position.set(-cubeSize / 2, 0, 0);
    doorGroup.add(doorPanel);

    const doorEdges = new THREE.LineSegments(new THREE.EdgesGeometry(doorPanelGeo), lineMat);
    doorEdges.position.set(-cubeSize / 2, 0, 0);
    doorGroup.add(doorEdges);

    // Lock wheel/gear
    const wheelGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 32);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.8, roughness: 0.2 });
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(-cubeSize / 2, 0, 0.04);
    doorGroup.add(wheel);

    const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
    const axle = new THREE.Mesh(axleGeo, wheelMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(-cubeSize / 2, 0, 0.04);
    doorGroup.add(axle);

    this.vaultGroup.add(doorGroup);

    // ── Core Laser Cylinder ──
    const cylinderGeo = new THREE.CylinderGeometry(0.04, 0.04, cubeSize * 0.95, 16);
    const cylinderMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.coreLaser = new THREE.Mesh(cylinderGeo, cylinderMat);
    this.vaultGroup.add(this.coreLaser);

    // ── Orbiting Document Cards ──
    const docs = [
      { name: 'Aadhaar',     color: '#22c55e', bx: -0.55, by: -0.45, bz: -0.25, phase: 0.0 },
      { name: 'Passport',    color: '#3b82f6', bx:  0.45, by: -0.25, bz:  0.30, phase: 1.2 },
      { name: 'PAN Card',    color: '#eab308', bx: -0.10, by:  0.35, bz: -0.40, phase: 2.5 },
      { name: 'Resume',      color: '#a855f7', bx: -0.50, by:  0.20, bz:  0.25, phase: 3.7 },
      { name: 'Certificate', color: '#06b6d4', bx:  0.40, by:  0.30, bz: -0.20, phase: 5.0 },
    ];

    docs.forEach(doc => {
      const tex = this.createCardTexture(doc.name, doc.color);
      const cardGeo = new THREE.PlaneGeometry(0.68, 0.46);
      const cardMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.90
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.position.set(doc.bx, doc.by, doc.bz);
      
      const cardData = {
        mesh: cardMesh,
        bx: doc.bx,
        by: doc.by,
        bz: doc.bz,
        phase: doc.phase
      };
      
      this.docCards.push(cardData);
      this.vaultGroup.add(cardMesh);
    });

    // ── Base Rings ──
    const ringGeo = new THREE.TorusGeometry(2.0, 0.015, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.35 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -cubeSize / 2 - 0.2;
    this.vaultGroup.add(ring1);
    this.rings.push(ring1);

    const ringGeo2 = new THREE.TorusGeometry(1.6, 0.01, 8, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -cubeSize / 2 - 0.2;
    this.vaultGroup.add(ring2);
    this.rings.push(ring2);

    // ── Drifting Particles ──
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i]     = (Math.random() - 0.5) * 6; // X
      positions[i + 1] = (Math.random() - 0.5) * 5; // Y
      positions[i + 2] = (Math.random() - 0.5) * 4; // Z
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.022,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(particleGeo, pMat);
    this.scene.add(this.particles);

    // ── Volumetric Light Shafts (Top/Bottom additive cones) ──
    const coneGeo = new THREE.ConeGeometry(0.6, 2.5, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const topBeam = new THREE.Mesh(coneGeo, coneMat);
    topBeam.position.y = cubeSize / 2 + 1.25;
    topBeam.rotation.x = Math.PI;
    this.vaultGroup.add(topBeam);

    // Handle Resize
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(pEl);
  }

  private createCardTexture(title: string, colorHex: string): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 110;
    const ctx = canvas.getContext('2d')!;

    // Translucent backing gradient
    const grad = ctx.createLinearGradient(0, 0, 160, 110);
    grad.addColorStop(0, 'rgba(8, 16, 45, 0.95)');
    grad.addColorStop(1, 'rgba(5, 10, 30, 0.95)');
    ctx.fillStyle = grad;
    
    // Rounded rect
    ctx.beginPath();
    this.drawRoundedRect(ctx, 0, 0, 160, 110, 8);
    ctx.fill();

    // Outline
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Title banner strip
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    this.drawRoundedRect(ctx, 0, 0, 160, 24, [8, 8, 0, 0] as any);
    ctx.fill();

    // Document Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 80, 12);

    // Mock lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(15, 45, 130, 8);
    ctx.fillRect(15, 63, 130, 8);
    ctx.fillRect(15, 81, 80, 8);

    return new THREE.CanvasTexture(canvas);
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
    const rt = Array.isArray(r) ? r : [r, r, r, r];
    const [tl, tr, br, bl] = rt;
    ctx.moveTo(x + tl, y);
    ctx.arcTo(x + w, y,     x + w, y + h, tr);
    ctx.arcTo(x + w, y + h, x,     y + h, br);
    ctx.arcTo(x,     y + h, x,     y,     bl);
    ctx.arcTo(x,     y,     x + w, y,     tl);
    ctx.closePath();
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const pEl = canvas.parentElement!;
    const w = pEl.clientWidth;
    const h = pEl.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const t = performance.now() * 0.001;

    // Mouse parallax easing
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.06;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.06;

    // Vault rotations (combines linear + parallax offsets)
    if (this.vaultGroup) {
      this.vaultGroup.rotation.y = t * 0.08 + this.currentMouseX * 0.15;
      this.vaultGroup.rotation.x = -0.12 + this.currentMouseY * 0.10;
      
      // Floating offset
      this.vaultGroup.position.y = Math.sin(t * 1.5) * 0.12;
    }

    // Concentric base rings rotation
    this.rings.forEach((ring, idx) => {
      ring.rotation.z = t * (idx === 0 ? 0.25 : -0.18);
    });

    // Animate doc cards (individual floating bobbing inside vault)
    this.docCards.forEach(card => {
      card.mesh.position.y = card.by + Math.sin(t * 1.6 + card.phase) * 0.08;
      card.mesh.position.x = card.bx + Math.cos(t * 1.1 + card.phase) * 0.05;
      card.mesh.rotation.y = Math.sin(t * 0.5 + card.phase) * 0.08;
      // Auto-face camera
      card.mesh.quaternion.copy(this.camera.quaternion);
    });

    // Core laser cylinder pulse
    if (this.coreLaser) {
      const laserScale = 0.85 + Math.sin(t * 4.0) * 0.15;
      this.coreLaser.scale.x = laserScale;
      this.coreLaser.scale.z = laserScale;
    }

    // Inner core point light pulsing
    if (this.innerLight) {
      this.innerLight.intensity = 3.5 + Math.sin(t * 3.0) * 0.8;
    }

    // Slow drift starfield particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.002; // Float down slightly
        if (positions[i] < -2.5) {
          positions[i] = 2.5; // Loop back
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y = t * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private cleanupThree(): void {
    const THREE = window.THREE;
    if (!THREE || !this.scene) return;

    this.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.renderer?.dispose();
  }
}

