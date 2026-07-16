/**
 * app.component.ts — Main App Component (Phase 10.6 WebGL Optimized)
 *
 * Implements a background WebGL scene using Three.js with complete rendering optimizations:
 *  - Disables antialiasing and limits precision to 'mediump' to reduce GPU load.
 *  - WebGL execution runs entirely outside Angular Zone.
 *  - Removed all scroll event listeners so scrolling never triggers renderer adjustments or GPU syncs.
 *  - Replaced dynamic BufferGeometry position updates with static Line Trails and pivot Groups.
 *  - Eliminated object allocations inside the render loop.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

declare const window: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'LifeVault';
  isWelcomePage = false;

  @ViewChild('backgroundCanvas', { static: true }) backgroundCanvas!: ElementRef<HTMLDivElement>;

  // Three.js instances
  private renderer: any;
  private scene: any;
  private camera: any;
  private orbGroup: any;
  
  // Scene elements
  private innerCore: any;
  private outerWireframe: any;
  private particleSystem: any;
  private ringGroups: any[] = [];
  private documentCards: any[] = [];
  
  // Animation loop frame control
  private animationFrameId!: number;
  private isTabActive = true;

  // Interactivity values
  private targetMouseX = 0;
  private targetMouseY = 0;
  private currentMouseX = 0;
  private currentMouseY = 0;

  // Frame control state
  private lastFrameTime = 0;
  private lastMouseUpdateTime = 0;

  private visibilityListener = (): void => {
    this.isTabActive = document.visibilityState === 'visible' && document.hasFocus();
  };

  private onMouseMoveThrottled = (event: MouseEvent): void => {
    const now = performance.now();
    if (now - this.lastMouseUpdateTime >= 50) {
      this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      this.targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      this.lastMouseUpdateTime = now;
    }
  };

  constructor(
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isWelcomePage = event.urlAfterRedirects.includes('/welcome');
    });
  }

  ngOnInit(): void {
    this.loadThreeJs().then(() => {
      this.ngZone.runOutsideAngular(() => {
        this.initThree();
        
        // Manual mouse and visibility listeners outside Angular Zone
        window.addEventListener('mousemove', this.onMouseMoveThrottled);
        document.addEventListener('visibilitychange', this.visibilityListener);
        window.addEventListener('focus', this.visibilityListener);
        window.addEventListener('blur', this.visibilityListener);

        this.lastFrameTime = performance.now();
        this.animate();
      });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('mousemove', this.onMouseMoveThrottled);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    window.removeEventListener('focus', this.visibilityListener);
    window.removeEventListener('blur', this.visibilityListener);
    this.cleanupThree();
  }

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

  // Generates glass document card textures
  private createCardTexture(title: string, colorHex: string): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 256, 340);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
      grad.addColorStop(1, 'rgba(79, 124, 255, 0.05)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = 24;
      ctx.moveTo(r, 0);
      ctx.lineTo(256 - r, 0);
      ctx.quadraticCurveTo(256, 0, 256, r);
      ctx.lineTo(256, 340 - r);
      ctx.quadraticCurveTo(256, 340, 256 - r, 340);
      ctx.lineTo(r, 340);
      ctx.quadraticCurveTo(0, 340, 0, 340 - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      // Border outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Color accent dot
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(32, 36, 8, 0, Math.PI * 2);
      ctx.fill();

      // Card Header title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(title, 50, 42);

      // Subtitle details
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '11px sans-serif';
      ctx.fillText('Secure Cloud Storage', 32, 75);

      // Content mockup
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(32, 105, 192, 8);
      ctx.fillRect(32, 125, 192, 8);
      ctx.fillRect(32, 145, 140, 8);
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Generates smooth rounded point textures
  private createParticleTexture(): any {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.3, 'rgba(98, 199, 255, 0.6)');
      gradient.addColorStop(0.6, 'rgba(79, 124, 255, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }

    return new THREE.CanvasTexture(canvas);
  }

  private initThree(): void {
    const THREE = window.THREE;
    const container = this.backgroundCanvas.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene with space fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03050c, 0.015);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    // 3. Renderer with high performance flags and disabled antialias
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      precision: "mediump",
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. Core group (position it in the top-right background)
    this.orbGroup = new THREE.Group();
    this.orbGroup.position.set(5.2, 3.0, -1.0);
    this.scene.add(this.orbGroup);

    // A. Glass Core Sphere
    const coreGeo = new THREE.SphereGeometry(3.6, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x4f7cff,
      transparent: true,
      opacity: 0.22,
    });
    this.innerCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbGroup.add(this.innerCore);

    // B. Rotating Wireframe Globe (AI Core Outer Wire)
    const wireGeo = new THREE.IcosahedronGeometry(4.6, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x62c7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    this.outerWireframe = new THREE.Mesh(wireGeo, wireMat);
    this.orbGroup.add(this.outerWireframe);

    // C. Static Torus Rings
    const torMat = new THREE.MeshBasicMaterial({
      color: 0x6a5bff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 3; i++) {
      const rSize = 5.2 + i * 0.8;
      const torGeo = new THREE.TorusGeometry(rSize, 0.03, 8, 48);
      const ringMesh = new THREE.Mesh(torGeo, torMat);
      
      const pivot = new THREE.Group();
      pivot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      pivot.add(ringMesh);
      this.orbGroup.add(pivot);
      this.ringGroups.push(pivot);
    }

    // D. Orbiting Document Cards via pivot Group hierarchy (avoids CPU calculations and GPU vertex updates)
    const cardTitles = [
      { name: 'Passport', color: '#ff6b6b' },
      { name: 'Aadhaar', color: '#62c7ff' },
      { name: 'PAN Card', color: '#2ecc71' },
      { name: 'Resume', color: '#9b59b6' },
      { name: 'Certificate', color: '#f39c12' }
    ];

    const cardGeo = new THREE.PlaneGeometry(0.8, 1.1);

    cardTitles.forEach((info, idx) => {
      const texture = this.createCardTexture(info.name, info.color);
      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(cardGeo, cardMat);
      const orbitRadius = 6.5 + idx * 0.5;
      const initialAngle = (idx * Math.PI * 2) / cardTitles.length;
      const heightOffset = (idx - 2) * 0.4;

      // Pivot Group orbiting Y-axis
      const pivot = new THREE.Group();
      pivot.rotation.y = initialAngle;
      this.orbGroup.add(pivot);

      // Static position inside pivot Group coordinate space
      mesh.position.set(orbitRadius, heightOffset, 0);
      pivot.add(mesh);

      // Light Trail Line statically placed inside pivot Group (never requires dynamic buffer updates)
      const trailMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(info.color),
        transparent: true,
        opacity: 0.10
      });
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(orbitRadius, heightOffset, 0)];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineTrail = new THREE.Line(trailGeo, trailMat);
      pivot.add(lineTrail);

      this.documentCards.push({
        pivot,
        mesh,
        speed: 0.25 + idx * 0.05
      });
    });

    // 5. Star Dust / Floating Particles
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 4.0 + Math.random() * 12.0;

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pTex = this.createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      map: pTex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x4f7cff, 3.5, 30);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    if (!this.backgroundCanvas || !this.renderer || !this.camera) return;
    const container = this.backgroundCanvas.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.isTabActive || this.isWelcomePage) return;

    const now = performance.now();
    const frameInterval = 1000 / 60; // Smooth 60 FPS target render loop
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= frameInterval) {
      this.lastFrameTime = now - (elapsed % frameInterval);
      this.renderFrame();
    }
  };

  private renderFrame(): void {
    if (!window.THREE || !this.renderer) return;
    const time = Date.now() * 0.0008;

    // Parallax mouse position updates with smooth easing interpolation
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.05;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.05;

    // Centerpiece parent rotation and floating updates
    if (this.orbGroup) {
      this.orbGroup.rotation.y = time * 0.08 + this.currentMouseX * 0.15;
      this.orbGroup.rotation.x = Math.sin(time * 0.06) * 0.1 + this.currentMouseY * 0.12;
      this.orbGroup.position.y = 3.0 + Math.sin(time * 0.8) * 0.15;
    }

    // Breathing pulse for core glow
    if (this.innerCore) {
      const pulse = 1.0 + Math.sin(time * 2.5) * 0.04;
      this.innerCore.scale.set(pulse, pulse, pulse);
    }

    // Wireframe counter-rotation
    if (this.outerWireframe) {
      this.outerWireframe.rotation.y = -time * 0.1;
      this.outerWireframe.rotation.z = time * 0.05;
    }

    // Update document card rotations (faces camera using lookAt)
    this.documentCards.forEach((card) => {
      card.pivot.rotation.y += 0.0012 * card.speed;
      card.mesh.lookAt(this.camera.position);
    });

    // Drifting star field rotation
    if (this.particleSystem) {
      this.particleSystem.rotation.y = -time * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private cleanupThree(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);

    try {
      if (this.renderer) {
        this.renderer.dispose();
      }
      
      this.scene.traverse((object: any) => {
        if (!object.isMesh && !object.isPoints && !object.isLine) return;
        
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: any) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(object.material);
          }
        }
      });
    } catch (e) {
      console.warn('Three.js cleanup error:', e);
    }
  }

  private disposeMaterial(material: any): void {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
  }
}
