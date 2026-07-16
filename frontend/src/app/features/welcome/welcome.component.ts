/**
 * welcome.component.ts — Premium Apple-Style Welcome Page
 *
 * Implements a true 3D holographic glass vault using Three.js:
 *  • Central rotating 3D crystal core (icosahedron) with inner lock shield hologram
 *  • 6 orbiting holographic hexagonal security nodes (Shield, Fingerprint, Neural, Chip, Database, Lock)
 *  • Interactive neon line connections matching the nodes to the core
 *  • Volumetric point lights, drifting particles, base rings, and mouse parallax
 *  • Completely programmatic - NO flat image backdrop drawing
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
  private innerEnergy: any;
  private midFaceted: any;
  private outerFaceted: any;
  private particles: any;
  private rings: any[] = [];
  private orbitNodes: any[] = [];
  private connectionLines: any;
  private pointLight: any;

  // Interactivity
  private targetMouseX = 0;
  private targetMouseY = 0;
  private currentMouseX = 0;
  private currentMouseY = 0;

  private isTabActive = true;
  private visibilityListener = (): void => {
    this.isTabActive = document.visibilityState === 'visible';
  };

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
      document.addEventListener('visibilitychange', this.visibilityListener);
      this.animate();
      this.isLoaded = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObs?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityListener);
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
  //  THREE.JS CINEMATIC AI CORE RENDERER
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

    // Main vault/core group
    this.vaultGroup = new THREE.Group();
    this.scene.add(this.vaultGroup);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.40);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x06b6d4, 1.25); // Cyan Key Light
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8b5cf6, 0.70); // Purple Fill Light
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    this.pointLight = new THREE.PointLight(0x3b82f6, 6.0, 10.0);
    this.pointLight.position.set(0, 0, 0);
    this.vaultGroup.add(this.pointLight);

    // ── Luxury Display Case (Thick glass walls) ──
    const caseS = 2.40;
    const outerBox = new THREE.BoxGeometry(caseS, caseS, caseS);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.16,
      roughness: 0.10,
      metalness: 0.9,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    const outerMesh = new THREE.Mesh(outerBox, caseMat);
    this.vaultGroup.add(outerMesh);

    // Glowing double edges wireframes
    const edgesOuter = new THREE.EdgesGeometry(outerBox);
    const linesOuter = new THREE.LineSegments(
      edgesOuter,
      new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 })
    );
    this.vaultGroup.add(linesOuter);

    const edgesInner = new THREE.EdgesGeometry(new THREE.BoxGeometry(caseS - 0.05, caseS - 0.05, caseS - 0.05));
    const linesInner = new THREE.LineSegments(
      edgesInner,
      new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 1 })
    );
    this.vaultGroup.add(linesInner);

    // Open Door panel pivoted right
    const doorGroup = new THREE.Group();
    doorGroup.position.set(caseS / 2, 0, caseS / 2);
    doorGroup.rotation.y = 0.55;

    const doorPanelGeo = new THREE.BoxGeometry(caseS, caseS, 0.04);
    const doorPanel = new THREE.Mesh(doorPanelGeo, caseMat);
    doorPanel.position.set(-caseS / 2, 0, 0);
    doorGroup.add(doorPanel);

    const doorEdges = new THREE.LineSegments(new THREE.EdgesGeometry(doorPanelGeo), linesOuter.material);
    doorEdges.position.set(-caseS / 2, 0, 0);
    doorGroup.add(doorEdges);

    // Gear Lock
    const gearGeo = new THREE.TorusGeometry(0.30, 0.04, 8, 32);
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.9, roughness: 0.1 });
    const gear = new THREE.Mesh(gearGeo, gearMat);
    gear.position.set(-caseS / 2, 0, 0.04);
    doorGroup.add(gear);

    const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12);
    const axle = new THREE.Mesh(axleGeo, gearMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(-caseS / 2, 0, 0.04);
    doorGroup.add(axle);

    this.vaultGroup.add(doorGroup);

    // ── Nested Procedural AI energy Core ──
    // Layer 1: Emissive inner core sphere
    const coreSphereGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const coreSphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.innerEnergy = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    this.vaultGroup.add(this.innerEnergy);

    // Layer 2: Faceted translucent mid core (Icosahedron)
    const facetedGeo = new THREE.IcosahedronGeometry(0.52, 0);
    const facetedMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.95,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    this.midFaceted = new THREE.Mesh(facetedGeo, facetedMat);
    this.vaultGroup.add(this.midFaceted);

    const midEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(facetedGeo),
      new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 })
    );
    this.midFaceted.add(midEdges);

    // Layer 3: Larger outer faceted core (Icosahedron 1 level recursion)
    const outerFacetedGeo = new THREE.IcosahedronGeometry(0.70, 1);
    const outerFacetedMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.20,
      roughness: 0.08,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    this.outerFaceted = new THREE.Mesh(outerFacetedGeo, outerFacetedMat);
    this.vaultGroup.add(this.outerFaceted);

    const outerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(outerFacetedGeo),
      new THREE.LineBasicMaterial({ color: 0xc084fc, linewidth: 1 })
    );
    this.outerFaceted.add(outerEdges);

    // ── Orbiting Hexagonal security Badge Nodes ──
    const nodes = [
      { type: 'shield',      color: '#3b82f6', orbitR: 1.15, phase: 0.00,  yOff: -0.3 },
      { type: 'fingerprint', color: '#06b6d4', orbitR: 0.98, phase: 1.05, yOff:  0.4 },
      { type: 'neural',      color: '#8b5cf6', orbitR: 1.08, phase: 2.10, yOff: -0.2 },
      { type: 'chip',        color: '#06b6d4', orbitR: 0.90,  phase: 3.15, yOff:  0.3 },
      { type: 'database',    color: '#3b82f6', orbitR: 1.02, phase: 4.20, yOff: -0.4 },
      { type: 'lock',        color: '#8b5cf6', orbitR: 1.10, phase: 5.25, yOff:  0.1 },
    ];

    nodes.forEach(node => {
      const tex = this.createNodeTexture(node.type, node.color);
      const nodeGeo = new THREE.PlaneGeometry(0.32, 0.32);
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
    const linePositions = new Float32Array(nodes.length * 2 * 3);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    
    this.connectionLines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 })
    );
    this.vaultGroup.add(this.connectionLines);

    // ── Concentric Base Platform Rings ──
    const ringGeo = new THREE.TorusGeometry(1.8, 0.015, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.35 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -caseS / 2 - 0.22;
    this.vaultGroup.add(ring1);
    this.rings.push(ring1);

    const ringGeo2 = new THREE.TorusGeometry(1.4, 0.01, 8, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.25 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -caseS / 2 - 0.22;
    this.vaultGroup.add(ring2);
    this.rings.push(ring2);

    // ── Drifting Particles ──
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i]     = (Math.random() - 0.5) * 7.5;
      pos[i + 1] = (Math.random() - 0.5) * 6.0;
      pos[i + 2] = (Math.random() - 0.5) * 5.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.018,
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
    topBeam.position.y = caseS / 2 + 1.25;
    topBeam.rotation.x = Math.PI;
    this.vaultGroup.add(topBeam);

    // Handle Resize
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(pEl);
  }

  // Draw hexagonal node badge textures with clean security vector icons
  private createNodeTexture(type: string, colorHex: string): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cx = 64, cy = 64, r = 52;

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(6, 12, 38, 0.90)';
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(64, 32);
      ctx.lineTo(84, 40);
      ctx.lineTo(84, 66);
      ctx.quadraticCurveTo(84, 88, 64, 98);
      ctx.quadraticCurveTo(44, 88, 44, 66);
      ctx.lineTo(44, 40);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'fingerprint') {
      ctx.beginPath();
      ctx.arc(64, 64, 24, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 64, 14, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 64, 4, Math.PI, Math.PI * 2);  ctx.stroke();
    } else if (type === 'neural') {
      ctx.fillRect(60, 36, 8, 8);
      ctx.fillRect(40, 72, 8, 8);
      ctx.fillRect(80, 72, 8, 8);
      ctx.beginPath();
      ctx.moveTo(64, 40); ctx.lineTo(44, 76);
      ctx.moveTo(64, 40); ctx.lineTo(84, 76);
      ctx.stroke();
    } else if (type === 'chip') {
      ctx.beginPath();
      ctx.rect(44, 44, 40, 40);
      ctx.stroke();
      const pins = [32, 40, 48, 80, 88, 96];
      pins.forEach(p => {
        ctx.fillRect(p - 2, 34, 4, 10);
        ctx.fillRect(p - 2, 84, 4, 10);
        ctx.fillRect(34, p - 2, 10, 4);
        ctx.fillRect(84, p - 2, 10, 4);
      });
    } else if (type === 'database') {
      ctx.beginPath();
      this.drawEllipse(ctx, 64, 44, 20, 8); ctx.stroke();
      this.drawEllipse(ctx, 64, 64, 20, 8); ctx.stroke();
      this.drawEllipse(ctx, 64, 84, 20, 8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(44, 44); ctx.lineTo(44, 84);
      ctx.moveTo(84, 44); ctx.lineTo(84, 84);
      ctx.stroke();
    } else if (type === 'lock') {
      ctx.beginPath();
      ctx.rect(42, 54, 44, 32);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 54, 16, Math.PI, 0);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  private drawEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    ctx.scale(rx / ry, 1);
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.restore();
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

    if (!this.isTabActive) return;

    const t = performance.now() * 0.001;

    // Mouse parallax eased camera interpolation
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.05;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.05;

    // Eased camera positioning & slow zoom breathing drift
    if (this.camera) {
      this.camera.position.x = Math.sin(t * 0.4) * 0.4 + this.currentMouseX * 1.5;
      this.camera.position.y = Math.cos(t * 0.3) * 0.3 + this.currentMouseY * 1.0;
      this.camera.position.z = 8.2 + Math.sin(t * 0.2) * 0.25;
      this.camera.lookAt(0, 0.1, 0);
    }

    // Vault float bobbing
    if (this.vaultGroup) {
      this.vaultGroup.rotation.y = t * 0.06;
      this.vaultGroup.rotation.x = -0.10;
      this.vaultGroup.position.y = Math.sin(t * 1.6) * 0.11;
    }

    // Nested core rotations (Mid core CW, Outer core CCW)
    if (this.midFaceted) {
      this.midFaceted.rotation.y = t * 0.20;
      this.midFaceted.rotation.z = Math.sin(t * 0.5) * 0.08;
    }
    if (this.outerFaceted) {
      this.outerFaceted.rotation.y = -t * 0.12;
      this.outerFaceted.rotation.x = Math.cos(t * 0.6) * 0.1;
    }

    // Inner emissive core breath scaling
    if (this.innerEnergy) {
      const scaleVal = 0.95 + Math.sin(t * 4.0) * 0.15;
      this.innerEnergy.scale.set(scaleVal, scaleVal, scaleVal);
    }

    // Concentric base energy rings
    this.rings.forEach((ring, idx) => {
      ring.rotation.z = t * (idx === 0 ? 0.20 : -0.15);
    });

    // Update connection lines vertex array
    const linePositions = this.connectionLines.geometry.attributes.position.array;

    // Animate badge nodes (3D orbits inside vault)
    this.orbitNodes.forEach((node, idx) => {
      const angle = t * 0.28 + node.phase;
      node.mesh.position.x = Math.cos(angle) * node.orbitR;
      node.mesh.position.z = Math.sin(angle) * node.orbitR;
      node.mesh.position.y = node.yOff + Math.sin(t * 1.4 + node.phase) * 0.08;
      
      // Keep hex node cards facing the camera
      node.mesh.quaternion.copy(this.camera.quaternion);

      // Line vertices (start: core (0,0,0), end: node)
      const pIdx = idx * 6;
      linePositions[pIdx]     = 0;
      linePositions[pIdx + 1] = 0;
      linePositions[pIdx + 2] = 0;
      
      linePositions[pIdx + 3] = node.mesh.position.x;
      linePositions[pIdx + 4] = node.mesh.position.y;
      linePositions[pIdx + 5] = node.mesh.position.z;
    });

    this.connectionLines.geometry.attributes.position.needsUpdate = true;

    // Pulse inner core point light
    if (this.pointLight) {
      this.pointLight.intensity = 5.0 + Math.sin(t * 4.0) * 1.5;
    }

    // Slow drifting nebula particles
    if (this.particles) {
      const posArr = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < posArr.length; i += 3) {
        posArr[i] -= 0.002;
        if (posArr[i] < -2.8) {
          posArr[i] = 2.8;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y = t * 0.010;
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
