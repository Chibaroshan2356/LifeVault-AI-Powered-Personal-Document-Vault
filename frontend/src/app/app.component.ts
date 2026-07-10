import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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

  ngOnInit(): void {
    this.loadThreeJs().then(() => {
      this.initThree();
      this.animate();
      this.setupVisibilityListener();
    });
  }

  ngOnDestroy(): void {
    this.cleanupThree();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // Only capture small offset angle mapping (a few degrees rotation)
    this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
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
      // Rounded card fill
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

      // Dummy content details
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

    // 1. Scene with subtle space fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03050c, 0.015);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 4. Core group (position it in the top-right background, partially behind hero)
    this.orbGroup = new THREE.Group();
    this.orbGroup.position.set(5.2, 3.0, -1.0);
    this.scene.add(this.orbGroup);

    // A. Glass Core Sphere (Scaled up 2.25x)
    const coreGeo = new THREE.SphereGeometry(3.6, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x4f7cff,
      transparent: true,
      opacity: 0.22, // Faint 22% opacity signature glow
    });
    this.innerCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbGroup.add(this.innerCore);

    // B. Rotating Wireframe Globe (Scaled up 2.2x)
    const wireGeo = new THREE.IcosahedronGeometry(4.6, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x62c7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12 // Reduced wireframe clutter
    });
    this.outerWireframe = new THREE.Mesh(wireGeo, wireMat);
    this.orbGroup.add(this.outerWireframe);

    // C. Halo Torus Rings (Scaled up 2x, line thickness adjusted)
    const torMat = new THREE.MeshBasicMaterial({
      color: 0x6a5bff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 3; i++) {
      const rSize = 5.2 + i * 0.8;
      const torGeo = new THREE.TorusGeometry(rSize, 0.03, 16, 100);
      const ringMesh = new THREE.Mesh(torGeo, torMat);
      
      const pivot = new THREE.Group();
      pivot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      pivot.add(ringMesh);
      this.orbGroup.add(pivot);
      this.ringGroups.push(pivot);
    }

    // D. Orbiting Document Cards (translucent & glowing)
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
        opacity: 0.22, // Faint ghost documents
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(cardGeo, cardMat);
      const orbitRadius = 6.5 + idx * 0.5; // Orbit path scaled out to bypass core sphere
      const initialAngle = (idx * Math.PI * 2) / cardTitles.length;

      mesh.position.set(Math.cos(initialAngle) * orbitRadius, 0, Math.sin(initialAngle) * orbitRadius);
      this.orbGroup.add(mesh);

      // Light Trail Line
      const trailMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(info.color),
        transparent: true,
        opacity: 0.10
      });
      const trailPoints = [new THREE.Vector3(0, 0, 0), mesh.position.clone()];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
      const lineTrail = new THREE.Line(trailGeo, trailMat);
      this.orbGroup.add(lineTrail);

      this.documentCards.push({
        mesh,
        radius: orbitRadius,
        speed: 0.25 + idx * 0.05,
        angle: initialAngle,
        heightOffset: (idx - 2) * 0.4,
        lineTrail
      });
    });

    // 5. Star Dust / Floating Particles
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Spawn particles spherically around centerpiece
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
      size: 0.12,
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

  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = document.visibilityState === 'visible';
    });
  }

  private animate = (): void => {
    // Only perform WebGL rendering calculations if tab is active (saves CPU/GPU when inactive)
    if (this.isTabActive) {
      this.renderFrame();
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private renderFrame(): void {
    if (!window.THREE || !this.renderer) return;
    const time = Date.now() * 0.0008;

    // Parallax mouse position updates with smooth easing interpolation
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.05;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.05;

    // Small, subtle rotation of centerpiece based on mouse (only a few degrees)
    if (this.orbGroup) {
      this.orbGroup.rotation.y = time * 0.08 + this.currentMouseX * 0.15;
      this.orbGroup.rotation.x = Math.sin(time * 0.06) * 0.1 + this.currentMouseY * 0.12;
      
      // Gentle floating up and down offset relative to its new top-right position
      this.orbGroup.position.y = 3.0 + Math.sin(time * 0.8) * 0.15;
    }

    // Breathing pulse for core glow
    if (this.innerCore) {
      const pulse = 1.0 + Math.sin(time * 2.5) * 0.04;
      this.innerCore.scale.set(pulse, pulse, pulse);
    }

    // Wireframe slow counter-rotation
    if (this.outerWireframe) {
      this.outerWireframe.rotation.y = -time * 0.1;
      this.outerWireframe.rotation.z = time * 0.05;
    }

    // Individual torus rings spin
    this.ringGroups.forEach((pivot, idx) => {
      pivot.rotation.x += 0.0015 * (idx + 1);
      pivot.rotation.y += 0.0008 * (idx + 1);
    });

    // Orbiting document cards rotation and coordinate trails recalculations
    this.documentCards.forEach((card) => {
      card.angle += 0.006 * card.speed;
      const newX = Math.cos(card.angle) * card.radius;
      const newZ = Math.sin(card.angle) * card.radius;
      const newY = Math.sin(card.angle * 2.2) * 0.3 + card.heightOffset;
      
      card.mesh.position.set(newX, newY, newZ);
      
      // Face camera vector
      card.mesh.lookAt(this.camera.position);

      if (card.lineTrail) {
        const positions = card.lineTrail.geometry.attributes.position.array;
        positions[3] = newX;
        positions[4] = newY;
        positions[5] = newZ;
        card.lineTrail.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Drifting background star field
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
      
      // Traverse scene and dispose geometries, materials and textures
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
