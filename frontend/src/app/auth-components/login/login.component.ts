import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AuthService } from "../../services/auth/auth.service";
import { Router } from "@angular/router";
import { StorageService } from "../../services/storage/storage.service";
import { AuthRequest } from "../../models/user.model";
import { Oauth2Service } from "../../services/oauth2/oauth2.service";
import { Oauth2SessionService } from "../../services/oauth2/oauth2-session.service";
import * as THREE from 'three';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent  implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('loginCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Three.js properties
  private renderer!: THREE.WebGLRenderer;
  private animFrameId!: number;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private resizeHandler!: () => void;

  private books: THREE.Group[] = [];
  private graduationCap!: THREE.Group;
  private orbitRing!: THREE.Line;
  private knowledgeParticles!: THREE.Points;
  private starParticles!: THREE.Points;
  private glowSphere!: THREE.Mesh;
  private connectionLines: THREE.Line[] = [];
  private floatingDots: { mesh: THREE.Mesh; speed: number; offset: number; radius: number }[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private oauth2Service: Oauth2Service,
    private oauth2SessionService: Oauth2SessionService,
    private router: Router,
    private storageService: StorageService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngAfterViewInit(): void {
    this.initScene(this.canvasRef.nativeElement);
  }

  // ─── COMPONENT LOGIC ───────────────────────────────────────────────────────

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const request: AuthRequest = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(request).subscribe({
      next: (response) => {
        console.log('Login successful, response received:', {
          requires_role_selection: response.requires_role_selection,
          roles: response.roles
        });

        this.storageService.setUserInfo(response.user_id || '', response.email || '');

        // Verify token is stored before navigation
        const token = this.storageService.getAccessToken();
        console.log('Token after login:', {
          hasToken: !!token,
          tokenLength: token ? token.length : 0
        });

        if (response.requires_role_selection) {
          console.log('Navigating to role-selection');
          this.router.navigate(['/role-selection']);
        } else {
          // User already has a role selected, route them based on their role
          const roles = response.roles || [];
          console.log('User roles:', roles);

          let navigationPath = '/student-dashboard';
          if (roles.includes('ROLE_TEACHER')) {
            navigationPath = '/teacher-dashboard';
          }
          console.log('Navigating to:', navigationPath);
          this.router.navigate([navigationPath]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Login failed. Please try again.';
        console.error('Login error:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  get emailError(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) return 'Email is required';
    if (emailControl?.hasError('email')) return 'Please enter a valid email address';
    return '';
  }

  get passwordError(): string {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required')) return 'Password is required';
    if (passwordControl?.hasError('minlength')) return 'Password must be at least 6 characters';
    return '';
  }

  loginWithGoogle(): void {
    if (this.isCtrlOrShiftPressed) {
      if (confirm('Switch to a different Google account?')) {
        this.oauth2SessionService.switchGoogleAccount();
      }
    } else {
      this.oauth2Service.initiateOAuth2Login('google');
    }
  }

  loginWithGitHub(): void   { this.oauth2Service.initiateOAuth2Login('github'); }
  loginWithFacebook(): void { this.oauth2Service.initiateOAuth2Login('facebook'); }

  private isCtrlOrShiftPressed = false;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.isCtrlOrShiftPressed = event.ctrlKey || event.shiftKey;
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    this.isCtrlOrShiftPressed = event.ctrlKey || event.shiftKey;
  }

  // ─── THREE.JS SCENE ────────────────────────────────────────────────────────

  private initScene(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c1a);
    this.scene.fog = new THREE.FogExp2(0x080c1a, 0.04);

    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0.5, 7);

    this.buildLighting();
    this.buildStarfield();
    this.buildKnowledgeParticles();
    this.buildGlowSphere();
    this.buildBooks();
    this.buildGraduationCap();
    this.buildOrbitRing();
    this.buildFloatingDots();
    this.buildConnectionNetwork();

    this.resizeHandler = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeHandler);

    this.animate();
  }

  private buildLighting(): void {
    const ambient = new THREE.AmbientLight(0x1a1a3e, 0.8);
    this.scene.add(ambient);

    const keyLight = new THREE.PointLight(0xfbbf24, 3, 18);
    keyLight.position.set(3, 4, 2);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x6366f1, 2, 14);
    fillLight.position.set(-4, 1, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x06b6d4, 1.5, 12);
    rimLight.position.set(0, -3, -2);
    this.scene.add(rimLight);

    const successLight = new THREE.PointLight(0x10b981, 1.2, 10);
    successLight.position.set(-2, -2, 4);
    this.scene.add(successLight);
  }

  private buildStarfield(): void {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 30 + Math.random() * 20;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 1.5 + 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xc7d2fe,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    }));
    this.scene.add(this.starParticles);
  }

  private buildKnowledgeParticles(): void {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const goldColor  = new THREE.Color(0xfbbf24);
    const indigoColor = new THREE.Color(0x818cf8);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      const c = Math.random() > 0.5 ? goldColor : indigoColor;
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.knowledgeParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    }));
    this.scene.add(this.knowledgeParticles);
  }

  private buildGlowSphere(): void {
    const geo = new THREE.SphereGeometry(0.45, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: 0x4338ca,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    this.glowSphere = new THREE.Mesh(geo, mat);
    this.glowSphere.position.set(0, 0.2, 0);

    const glowGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowSphere.add(glowMesh);

    this.scene.add(this.glowSphere);
  }

  private buildBooks(): void {
    const bookConfigs = [
      { color: 0xef4444, spineColor: 0xdc2626, w: 0.5, h: 0.7, d: 0.12 },
      { color: 0x3b82f6, spineColor: 0x2563eb, w: 0.45, h: 0.65, d: 0.10 },
      { color: 0x10b981, spineColor: 0x059669, w: 0.55, h: 0.72, d: 0.13 },
      { color: 0xf59e0b, spineColor: 0xd97706, w: 0.48, h: 0.68, d: 0.11 },
    ];

    bookConfigs.forEach((cfg, i) => {
      const book = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      book.add(body);

      const coverGeo = new THREE.BoxGeometry(cfg.w + 0.02, cfg.h + 0.02, 0.015);
      const coverMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.4,
        emissive: cfg.color,
        emissiveIntensity: 0.15
      });
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.z = cfg.d / 2 + 0.007;
      book.add(cover);

      const spineGeo = new THREE.BoxGeometry(0.03, cfg.h + 0.02, cfg.d + 0.015);
      const spineMat = new THREE.MeshStandardMaterial({
        color: cfg.spineColor,
        roughness: 0.4,
        emissive: cfg.spineColor,
        emissiveIntensity: 0.2
      });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.x = -(cfg.w / 2 + 0.015);
      book.add(spine);

      const angle = (i / bookConfigs.length) * Math.PI * 2;
      const radius = 2.2;
      book.position.set(Math.cos(angle) * radius, Math.sin(angle * 0.5) * 0.6, Math.sin(angle) * radius * 0.6);
      book.rotation.y = angle + Math.PI / 4;
      book.rotation.z = (Math.random() - 0.5) * 0.3;

      this.books.push(book);
      this.scene.add(book);
    });
  }

  private buildGraduationCap(): void {
    this.graduationCap = new THREE.Group();
    const boardGeo = new THREE.BoxGeometry(1.0, 0.06, 1.0);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      emissive: 0x312e81,
      emissiveIntensity: 0.3
    });
    const board = new THREE.Mesh(boardGeo, capMat);
    board.position.y = 0.22;
    this.graduationCap.add(board);

    const domeGeo = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, capMat);
    this.graduationCap.add(dome);

    const tasselMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), tasselMat);
    tassel.position.set(0.3, 0.02, 0);
    this.graduationCap.add(tassel);

    const tasselEnd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), tasselMat);
    tasselEnd.position.set(0.3, -0.18, 0);
    this.graduationCap.add(tasselEnd);

    this.graduationCap.position.set(0, 1.8, 0);
    this.scene.add(this.graduationCap);
  }

  private buildOrbitRing(): void {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 2.2, Math.sin(angle * 0.5) * 0.3, Math.sin(angle) * 2.2 * 0.6));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.orbitRing = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.25 }));
    this.scene.add(this.orbitRing);
  }

  private buildFloatingDots(): void {
    const dotColors = [0xfbbf24, 0x818cf8, 0x34d399, 0xf87171, 0x60a5fa];
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 8);
      const color = dotColors[i % dotColors.length];
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
      const dot = new THREE.Mesh(geo, mat);
      const radius = 1.6 + Math.random() * 1.8;
      dot.position.set(radius, 0, 0);
      this.scene.add(dot);
      this.floatingDots.push({ mesh: dot, speed: 0.3 + Math.random() * 0.4, offset: (i / 12) * Math.PI * 2, radius });
    }
  }

  private buildConnectionNetwork(): void {
    const positions = this.books.map(b => b.position);
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const points = [positions[i].clone(), this.glowSphere.position.clone(), positions[j].clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.1 }));
        this.connectionLines.push(line);
        this.scene.add(line);
      }
    }
  }

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    this.camera.position.x = Math.sin(t * 0.08) * 0.6;
    this.camera.position.y = 0.5 + Math.sin(t * 0.12) * 0.2;
    this.camera.lookAt(0, 0.2, 0);

    this.knowledgeParticles.rotation.y = t * 0.03;
    this.starParticles.rotation.y = t * 0.005;

    const pulse = 1 + Math.sin(t * 2.0) * 0.08;
    this.glowSphere.scale.setScalar(pulse);
    this.glowSphere.rotation.y = t * 0.5;
    (this.glowSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 2.0) * 0.4;

    this.books.forEach((book, i) => {
      const angle = (i / this.books.length) * Math.PI * 2 + t * 0.18;
      book.position.x = Math.cos(angle) * 2.2;
      book.position.y = Math.sin(t * 0.4 + i * 1.2) * 0.4;
      book.position.z = Math.sin(angle) * 2.2 * 0.6;
      book.rotation.y = angle + Math.PI / 4 + Math.sin(t * 0.3 + i) * 0.15;
    });

    this.graduationCap.position.y = 1.8 + Math.sin(t * 0.7) * 0.2;
    this.graduationCap.rotation.y = t * 0.25;

    this.floatingDots.forEach((dot, i) => {
      const angle = dot.offset + t * dot.speed;
      dot.mesh.position.x = Math.cos(angle) * dot.radius;
      dot.mesh.position.y = Math.sin(t * 0.5 + i * 0.4) * 0.5;
      dot.mesh.position.z = Math.sin(angle) * dot.radius * 0.55;
      dot.mesh.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.25);
    });

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.renderer?.dispose();
    window.removeEventListener('resize', this.resizeHandler);
  }
}
