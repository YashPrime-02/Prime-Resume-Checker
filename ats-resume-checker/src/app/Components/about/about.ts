import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  imports: [CommonModule],
  styleUrls: ['./about.scss']
})
export class AboutComponent implements AfterViewInit {

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles: THREE.Points | undefined;
  private particlePositions: Float32Array | undefined;

  private scrollY = 0; // track scroll position

  ngAfterViewInit(): void {
    this.init3D();
    this.animate();
    this.revealSections(); // initial check for sections in view
  }

  init3D() {
    const canvas = document.getElementById('techno-bg') as HTMLCanvasElement;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Particle system
    const particleCount = 8000;
    this.particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 200;
      this.particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const material = new THREE.PointsMaterial({ color: 0x00ffe0, size: 0.8 });
    this.particles = new THREE.Points(geometry, material);

    this.scene.add(this.particles);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    if (this.particles) {
      const positions = this.particles.geometry.attributes['position'].array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.1; // move particles down
        if (positions[i + 1] < -100) positions[i + 1] = 100;
      }

      this.particles.geometry.attributes['position'].needsUpdate = true;

      // Rotation + Parallax
      this.particles.rotation.y += 0.001;
      this.particles.rotation.x = this.scrollY * 0.0002;
      this.camera.position.y = -this.scrollY * 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  };

  // Scroll tracking for parallax + section reveal
  @HostListener('window:scroll')
  onScroll() {
    this.scrollY = window.scrollY;
    this.revealSections();
  }

  private revealSections() {
    const sections = document.querySelectorAll('.about-section');
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight - 100) {
        section.classList.add('reveal');
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }


technologies = [
  {
    name: 'Angular',
    logo: 'https://angular.io/assets/images/logos/angular/angular.svg',
    description: 'Robust frontend framework for dynamic web apps.'
  },
  {
    name: 'TypeScript',
    logo: 'https://www.typescriptlang.org/assets/images/icons/apple-touch-icon.png',
    description: 'Typed superset of JavaScript for scalable code.'
  },
  {
    name: 'CSS3',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/62/CSS3_logo.svg',
    description: 'Styling and responsive design using modern CSS.'
  },
  {
    name: 'Node.js',
    logo: 'https://nodejs.org/static/images/logo.svg',
    description: 'Server-side JavaScript runtime powering the backend.'
  },
  {
    name: 'Vite',
    logo: 'https://vitejs.dev/logo.svg',
    description: 'Next generation frontend tooling and bundling.'
  }
];


}
