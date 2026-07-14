/**
 * welcome.component.ts — Premium Apple-Style Welcome Page
 *
 * Implements a true 3D holographic glass vault using Three.js:
 *  • Central rotating 3D crystal core (icosahedron) with inner lock shield hologram
 *  • 5 orbiting holographic hexagonal nodes (Lock, Fingerprint, Shield, Microchip, Database)
 *  • Interactive neon line connections matching the nodes to the core
 *  • Volumetric point lights, drifting particles, base rings, and mouse parallax
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
  private crystalCore: any;
  private particles: any;
  private rings: any[] = [];
  private orbitNodes: any[] = [];
  private connectionLines: any;
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
  //  THREE.JS RENDER BLOCK
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.40);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 0.90);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const dirLightLeft = new THREE.DirectionalLight(0x8b5cf6, 0.55);
    dirLightLeft.position.set(-5, 3, -5);
    this.scene.add(dirLightLeft);

    this.innerLight = new THREE.PointLight(0x0ea5e9, 5.0, 10.0);
    this.innerLight.position.set(0, 0, 0);
    this.vaultGroup.add(this.innerLight);

    // ── Build Vault Cube (Thick glowing glass lines) ──
    const cubeSize = 2.4;
    const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.16,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    const vaultMesh = new THREE.Mesh(boxGeo, glassMat);
    this.vaultGroup.add(vaultMesh);

    // Glowing double edge wireframes
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edgesGeo, lineMat);
    this.vaultGroup.add(edgeLines);

    const edgesGeoInner = new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize - 0.04, cubeSize - 0.04, cubeSize - 0.04));
    const lineMatInner = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 1 });
    const edgeLinesInner = new THREE.LineSegments(edgesGeoInner, lineMatInner);
    this.vaultGroup.add(edgeLinesInner);

    // ── Vault Door (Swung open right) ──
    const doorGroup = new THREE.Group();
    doorGroup.position.set(cubeSize / 2, 0, cubeSize / 2);
    doorGroup.rotation.y = 0.55; // 32 degrees swung open
    
    const doorPanelGeo = new THREE.BoxGeometry(cubeSize, cubeSize, 0.04);
    const doorPanel = new THREE.Mesh(doorPanelGeo, glassMat);
    doorPanel.position.set(-cubeSize / 2, 0, 0);
    doorGroup.add(doorPanel);

    const doorEdges = new THREE.LineSegments(new THREE.EdgesGeometry(doorPanelGeo), lineMat);
    doorEdges.position.set(-cubeSize / 2, 0, 0);
    doorGroup.add(doorEdges);

    // Lock wheel/gear
    const wheelGeo = new THREE.TorusGeometry(0.30, 0.04, 8, 32);
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

    // ── Central Crystal Core (Icosahedron Double Mesh) ──
    const crystalGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    this.crystalCore = new THREE.Mesh(crystalGeo, crystalMat);
    this.vaultGroup.add(this.crystalCore);

    const crystalEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(crystalGeo),
      new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 })
    );
    this.crystalCore.add(crystalEdges);

    // Inner lock shield hologram inside crystal core
    const shieldTex = this.createLockShieldTexture();
    const shieldGeo = new THREE.PlaneGeometry(0.48, 0.48);
    const shieldMat = new THREE.MeshBasicMaterial({
      map: shieldTex,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    const shieldHolo = new THREE.Mesh(shieldGeo, shieldMat);
    this.crystalCore.add(shieldHolo);

    // ── Orbiting Hexagonal Badge Nodes ──
    const nodes = [
      { type: 'lock',        color: '#8b5cf6', orbitR: 1.1, phase: 0.0,  yOff: -0.2 },
      { type: 'fingerprint', color: '#06b6d4', orbitR: 0.95, phase: 1.25, yOff:  0.3 },
      { type: 'shield',      color: '#3b82f6', orbitR: 1.05, phase: 2.50, yOff: -0.4 },
      { type: 'chip',        color: '#06b6d4', orbitR: 0.9,  phase: 3.75, yOff:  0.2 },
      { type: 'database',    color: '#3b82f6', orbitR: 1.0,  phase: 5.00, yOff: -0.1 },
    ];

    nodes.forEach(node => {
      const tex = this.createNodeTexture(node.type, node.color);
      const nodeGeo = new THREE.PlaneGeometry(0.36, 0.36);
      const nodeMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.95
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      
      const nodeData = {
        mesh: nodeMesh,
        type: node.type,
        color: node.color,
        orbitR: node.orbitR,
        phase: node.phase,
        yOff: node.yOff
      };
      
      this.orbitNodes.push(nodeData);
      this.vaultGroup.add(nodeMesh);
    });

    // ── Orbiting lines connection setup ──
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(nodes.length * 2 * 3); // 2 points per line (core -> node)
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    
    this.connectionLines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 })
    );
    this.vaultGroup.add(this.connectionLines);

    // ── Concentric Base Rings ──
    const ringGeo = new THREE.TorusGeometry(1.9, 0.015, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.35 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -cubeSize / 2 - 0.25;
    this.vaultGroup.add(ring1);
    this.rings.push(ring1);

    const ringGeo2 = new THREE.TorusGeometry(1.5, 0.01, 8, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -cubeSize / 2 - 0.25;
    this.vaultGroup.add(ring2);
    this.rings.push(ring2);

    // ── Drifting Particles ──
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i]     = (Math.random() - 0.5) * 6; // X
      pos[i + 1] = (Math.random() - 0.5) * 5; // Y
      pos[i + 2] = (Math.random() - 0.5) * 4; // Z
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.02,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(particleGeo, pMat);
    this.scene.add(this.particles);

    // Volumetric cones
    const coneGeo = new THREE.ConeGeometry(0.55, 2.5, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.05,
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

  // Helper to draw hexagonal nodes with custom security vector icons
  private createNodeTexture(type: string, colorHex: string): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cx = 64, cy = 64, r = 50;

    // Draw glowing hexagon border
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Fill with translucent dark base
    ctx.fillStyle = 'rgba(8, 16, 45, 0.88)';
    ctx.fill();

    // Draw vector icons based on type
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'lock') {
      // Lock icon
      ctx.beginPath();
      ctx.rect(42, 54, 44, 32);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 54, 16, Math.PI, 0);
      ctx.stroke();
    } else if (type === 'fingerprint') {
      // Fingerprint lines
      ctx.beginPath();
      ctx.arc(64, 64, 24, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 64, 14, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 64, 4, Math.PI, Math.PI * 2);  ctx.stroke();
    } else if (type === 'shield') {
      // Shield
      ctx.beginPath();
      ctx.moveTo(64, 34);
      ctx.lineTo(84, 42);
      ctx.lineTo(84, 66);
      ctx.quadraticCurveTo(84, 88, 64, 98);
      ctx.quadraticCurveTo(44, 88, 44, 66);
      ctx.lineTo(44, 42);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'chip') {
      // Microchip
      ctx.beginPath();
      ctx.rect(44, 44, 40, 40);
      ctx.stroke();
      // Pins
      const pins = [32, 40, 48, 80, 88, 96];
      pins.forEach(pin => {
        ctx.fillRect(pin - 2, 34, 4, 10);
        ctx.fillRect(pin - 2, 84, 4, 10);
        ctx.fillRect(34, pin - 2, 10, 4);
        ctx.fillRect(84, pin - 2, 10, 4);
      });
    } else if (type === 'database') {
      // Database cylinder stack
      ctx.beginPath();
      this.drawEllipse(ctx, 64, 44, 20, 8); ctx.stroke();
      this.drawEllipse(ctx, 64, 64, 20, 8); ctx.stroke();
      this.drawEllipse(ctx, 64, 84, 20, 8); ctx.stroke();
      // Cylinders outlines
      ctx.beginPath();
      ctx.moveTo(44, 44); ctx.lineTo(44, 84); ctx.stroke();
      ctx.moveTo(84, 44); ctx.lineTo(84, 84); ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Draw ellipse helper
  private drawEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    ctx.scale(rx / ry, 1);
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.restore();
  }

  // Create Lock Shield Hologram texture
  private createLockShieldTexture(): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 5.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Shield
    ctx.beginPath();
    ctx.moveTo(64, 24);
    ctx.lineTo(92, 32);
    ctx.lineTo(92, 70);
    ctx.quadraticCurveTo(92, 98, 64, 110);
    ctx.quadraticCurveTo(36, 98, 36, 70);
    ctx.lineTo(36, 32);
    ctx.closePath();
    ctx.stroke();

    // Fill shield with translucent glow
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.fill();

    // Draw Lock shape inside shield
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 66, 24, 18);
    ctx.beginPath();
    ctx.arc(64, 66, 8, Math.PI, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
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

    // Vault rotations (combines Y rotation + parallax)
    if (this.vaultGroup) {
      this.vaultGroup.rotation.y = t * 0.06 + this.currentMouseX * 0.15;
      this.vaultGroup.rotation.x = -0.10 + this.currentMouseY * 0.08;
      
      // Floating offset
      this.vaultGroup.position.y = Math.sin(t * 1.5) * 0.10;
    }

    // Rotate core crystal
    if (this.crystalCore) {
      this.crystalCore.rotation.y = -t * 0.15;
      this.crystalCore.rotation.z = Math.sin(t * 0.5) * 0.1;
    }

    // Concentric base rings rotation
    this.rings.forEach((ring, idx) => {
      ring.rotation.z = t * (idx === 0 ? 0.20 : -0.15);
    });

    // Update connection lines vertex array
    const linePositions = this.connectionLines.geometry.attributes.position.array;

    // Animate badge nodes (3D orbits inside vault)
    this.orbitNodes.forEach((node, idx) => {
      const angle = t * 0.35 + node.phase;
      node.mesh.position.x = Math.cos(angle) * node.orbitR;
      node.mesh.position.z = Math.sin(angle) * node.orbitR;
      node.mesh.position.y = node.yOff + Math.sin(t * 1.5 + node.phase) * 0.06;
      
      // Face camera
      node.mesh.quaternion.copy(this.camera.quaternion);

      // Line vertices (start: core (0,0,0), end: node)
      const pIdx = idx * 6;
      
      // Start point (crystal core centered on 0,0,0)
      linePositions[pIdx]     = 0;
      linePositions[pIdx + 1] = 0;
      linePositions[pIdx + 2] = 0;
      
      // End point (node position)
      linePositions[pIdx + 3] = node.mesh.position.x;
      linePositions[pIdx + 4] = node.mesh.position.y;
      linePositions[pIdx + 5] = node.mesh.position.z;
    });

    this.connectionLines.geometry.attributes.position.needsUpdate = true;

    // Pulse inner core light
    if (this.innerLight) {
      this.innerLight.intensity = 4.0 + Math.sin(t * 4.0) * 1.0;
    }

    // Drift particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.002;
        if (positions[i] < -2.5) {
          positions[i] = 2.5;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y = t * 0.012;
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
