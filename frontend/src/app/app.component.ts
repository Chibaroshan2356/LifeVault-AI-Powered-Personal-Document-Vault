/**
 * app.component.ts — Main App Component (Phase 10.6 Redesigned Background)
 *
 * Implements a lightweight, hardware-friendly background layer:
 *  - Removed fullscreen Three.js WebGL rendering completely from inner pages.
 *  - Added a 2D HTML Canvas particles layer running at capped 30 FPS inside requestAnimationFrame.
 *  - Relies on optimized CSS glowing auroras for visual completeness.
 *  - All calculations run completely outside the Angular Zone.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'LifeVault';
  isWelcomePage = false;

  @ViewChild('bgCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private particles: Particle[] = [];
  private animationFrameId!: number;
  private isTabActive = true;
  private lastFrameTime = 0;

  private visibilityListener = (): void => {
    this.isTabActive = document.visibilityState === 'visible' && document.hasFocus();
  };

  private onWindowResize = (): void => {
    this.resizeCanvas();
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
    // Listen to visibility and focus outside Angular
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', this.visibilityListener);
      window.addEventListener('focus', this.visibilityListener);
      window.addEventListener('blur', this.visibilityListener);
      window.addEventListener('resize', this.onWindowResize);
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.resizeCanvas();
      this.initParticles();
      this.lastFrameTime = performance.now();
      this.animate();
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    window.removeEventListener('focus', this.visibilityListener);
    window.removeEventListener('blur', this.visibilityListener);
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private resizeCanvas(): void {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private initParticles(): void {
    this.particles = [];
    const count = 40; // Subtle volumetric particle count
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        size: Math.random() * 1.5 + 0.6,
        alpha: Math.random() * 0.35 + 0.15,
      });
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    if (!this.isTabActive || this.isWelcomePage) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    // Throttle rendering to exactly 30 FPS to minimize main thread workload
    if (elapsed >= 33) {
      this.lastFrameTime = now - (elapsed % 33);
      this.renderParticles();
    }
  };

  private renderParticles(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap boundaries
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Render particle with soft glowing circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(98, 199, 255, ${p.alpha})`;
      ctx.fill();
    });
  }
}
