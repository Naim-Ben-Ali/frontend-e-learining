import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import { AuthService } from "../../services/auth/auth.service";
import { Router } from "@angular/router";
import { RegisterRequest } from "../../models/user.model";
import { Oauth2Service } from "../../services/oauth2/oauth2.service";
import * as THREE from 'three';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('registerCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  private renderer!: THREE.WebGLRenderer;
  private animFrameId!: number;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private resizeHandler!: () => void;

  // Scene objects
  private helixPoints: { mesh: THREE.Mesh; side: number; index: number }[] = [];
  private helixConnectors: THREE.Line[] = [];
  private risingStars: { mesh: THREE.Mesh; speed: number; startY: number; x: number; z: number }[] = [];
  private teacherBoard!: THREE.Group;
  private pencil!: THREE.Group;
  private successRings: THREE.Mesh[] = [];
  private backgroundParticles!: THREE.Points;
  private glowOrbs: THREE.Mesh[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private oauth2Service: Oauth2Service,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName:  ['', [Validators.required, Validators.minLength(2)]],
        email:     ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s\-\+\(\)]+$/)]],
        password:  ['', [Validators.required, Validators.minLength(8), this.passwordValidator()]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator() }
    );
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngAfterViewInit(): void {
    this.initScene(this.canvasRef.nativeElement);
  }

  // ─── THREE.JS SCENE ────────────────────────────────────────────────────────

  private initScene(canvas: HTMLCanvasElement): void {
    // ── Renderer ──────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // ── Scene ─────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a18);
    this.scene.fog = new THREE.FogExp2(0x060a18, 0.035);

    // ── Camera ────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    // ── Lighting ──────────────────────────────────────────────
    this.buildLighting();

    // ── Scene objects ─────────────────────────────────────────
    this.buildBackgroundParticles();
    this.buildKnowledgeDNAHelix();
    this.buildTeachingBoard();
    this.buildPencil();
    this.buildSuccessRings();
    this.buildRisingStars();
    this.buildGlowOrbs();

    // ── Resize ────────────────────────────────────────────────
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
    const ambient = new THREE.AmbientLight(0x0f1a3a, 1.0);
    this.scene.add(ambient);

    // Teaching spotlight — like a teacher's lamp over a blackboard
    const teachLight = new THREE.SpotLight(0xfde68a, 3, 20, Math.PI / 5, 0.4);
    teachLight.position.set(-2, 5, 3);
    teachLight.castShadow = true;
    this.scene.add(teachLight);

    // Knowledge helix glow — cool blue-violet
    const helixLight = new THREE.PointLight(0x7c3aed, 2.5, 12);
    helixLight.position.set(2, 0, 2);
    this.scene.add(helixLight);

    // Success accent — bright teal-green from below
    const successLight = new THREE.PointLight(0x10b981, 2, 14);
    successLight.position.set(0, -4, 3);
    this.scene.add(successLight);

    // Warm right fill
    const warmFill = new THREE.PointLight(0xf97316, 1.5, 10);
    warmFill.position.set(4, 2, 1);
    this.scene.add(warmFill);
  }

  private buildBackgroundParticles(): void {
    // Deep space particles
    const count = 2500;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(0x7c3aed),
      new THREE.Color(0x0ea5e9),
      new THREE.Color(0x10b981),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0xec4899),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.backgroundParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true
    }));
    this.scene.add(this.backgroundParticles);
  }

  private buildKnowledgeDNAHelix(): void {
    // DNA double helix — represents learning building blocks / knowledge structure
    const totalPoints = 40;
    const helixRadius = 0.7;
    const helixHeight = 6.0;
    const turns = 3;

    const strand1Color = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3
    });
    const strand2Color = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3
    });
    const connectorMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5
    });

    const sphereGeo = new THREE.SphereGeometry(0.07, 10, 10);

    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * turns * Math.PI * 2;
      const y = t * helixHeight - helixHeight / 2;

      // Strand 1
      const s1 = new THREE.Mesh(sphereGeo, strand1Color);
      s1.position.set(
        Math.cos(angle) * helixRadius + 2.0,
        y,
        Math.sin(angle) * helixRadius * 0.5
      );
      this.scene.add(s1);
      this.helixPoints.push({ mesh: s1, side: 0, index: i });

      // Strand 2 (opposite)
      const s2 = new THREE.Mesh(sphereGeo, strand2Color);
      s2.position.set(
        Math.cos(angle + Math.PI) * helixRadius + 2.0,
        y,
        Math.sin(angle + Math.PI) * helixRadius * 0.5
      );
      this.scene.add(s2);
      this.helixPoints.push({ mesh: s2, side: 1, index: i });

      // Connector rungs (every 2 nodes)
      if (i % 2 === 0) {
        const connGeo = new THREE.BufferGeometry().setFromPoints([
          s1.position.clone(),
          s2.position.clone()
        ]);
        const conn = new THREE.Line(connGeo, connectorMat);
        this.helixConnectors.push(conn);
        this.scene.add(conn);
      }
    }
  }

  private buildTeachingBoard(): void {
    // Stylized blackboard/whiteboard — the core teaching metaphor
    this.teacherBoard = new THREE.Group();

    // Board surface
    const boardGeo = new THREE.BoxGeometry(2.4, 1.6, 0.06);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x0f2027,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0x0c3547,
      emissiveIntensity: 0.3
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    this.teacherBoard.add(board);

    // Board frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.6,
      metalness: 0.1
    });

    // Top/bottom frame bars
    [0.83, -0.83].forEach(y => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.1), frameMat);
      bar.position.y = y;
      this.teacherBoard.add(bar);
    });

    // Left/right frame bars
    [-1.25, 1.25].forEach(x => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.1), frameMat);
      bar.position.x = x;
      this.teacherBoard.add(bar);
    });

    // "Writing" lines on the board (chalk text simulation)
    const chalkMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });

    // Three lines of "text"
    [[0.5, 0.3], [0.7, 0.0], [0.4, -0.3]].forEach(([len, y]) => {
      const pts = [
        new THREE.Vector3(-len / 2, y, 0.04),
        new THREE.Vector3(len / 2, y, 0.04)
      ];
      this.teacherBoard.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), chalkMat
      ));
    });

    // Formula "=" and other symbols
    const formulaMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8
    });
    const formulaPts = [
      new THREE.Vector3(-0.1, 0.3, 0.04),
      new THREE.Vector3(0.1, 0.3, 0.04)
    ];
    this.teacherBoard.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(formulaPts), formulaMat
    ));

    this.teacherBoard.position.set(-2.2, 0.2, 0);
    this.teacherBoard.rotation.y = 0.25;
    this.scene.add(this.teacherBoard);
  }

  private buildPencil(): void {
    // Floating pencil — teaching / writing instrument
    this.pencil = new THREE.Group();

    // Pencil body
    const bodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.pencil.add(body);

    // Pencil tip (cone)
    const tipGeo = new THREE.ConeGeometry(0.05, 0.2, 6);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.5 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = -0.6;
    this.pencil.add(tip);

    // Eraser (pink cylinder)
    const eraserGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.12, 6);
    const eraserMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.8 });
    const eraser = new THREE.Mesh(eraserGeo, eraserMat);
    eraser.position.y = 0.56;
    this.pencil.add(eraser);

    this.pencil.position.set(-0.8, 1.5, 1.5);
    this.pencil.rotation.z = -Math.PI / 5;
    this.pencil.rotation.x = Math.PI / 8;
    this.scene.add(this.pencil);
  }

  private buildSuccessRings(): void {
    // Expanding success rings — achievement / goal completion
    const ringColors = [0x10b981, 0x6366f1, 0xf59e0b];
    ringColors.forEach((color, i) => {
      const geo = new THREE.TorusGeometry(0.6 + i * 0.4, 0.02, 8, 60);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.7 - i * 0.15,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(-3.5, -1.5, 0.5);
      ring.rotation.x = Math.PI / 3;
      this.successRings.push(ring);
      this.scene.add(ring);
    });
  }

  private buildRisingStars(): void {
    // Stars rising upward — success, achievement, progress
    const starColors = [0xfbbf24, 0xfde68a, 0x10b981, 0x818cf8, 0xf87171];
    for (let i = 0; i < 18; i++) {
      // Build a 5-pointed star shape via LatheGeometry approximation
      // Using a small octahedron scaled to look like a star/diamond
      const geo = new THREE.OctahedronGeometry(0.06 + Math.random() * 0.05, 0);
      const color = starColors[i % starColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.5
      });
      const star = new THREE.Mesh(geo, mat);
      const x = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 4;
      star.position.set(x, -6 - Math.random() * 4, z);
      this.scene.add(star);
      this.risingStars.push({
        mesh: star,
        speed: 0.4 + Math.random() * 0.8,
        startY: -6 - Math.random() * 4,
        x,
        z
      });
    }
  }

  private buildGlowOrbs(): void {
    // Floating colored orbs — represent different subjects / disciplines
    const orbData = [
      { color: 0xef4444, pos: [-3.0,  1.5, -1.0] as [number, number, number] },  // Math (red)
      { color: 0x3b82f6, pos: [ 3.5,  2.0,  0.5] as [number, number, number] },  // Science (blue)
      { color: 0x8b5cf6, pos: [-1.5, -2.5, -0.5] as [number, number, number] },  // Arts (purple)
      { color: 0x10b981, pos: [ 3.0, -1.5, -1.0] as [number, number, number] },  // Nature (green)
    ];

    orbData.forEach(({ color, pos }) => {
      const geo = new THREE.SphereGeometry(0.18, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.0,
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85
      });
      const orb = new THREE.Mesh(geo, mat);
      orb.position.set(...pos);
      this.glowOrbs.push(orb);
      this.scene.add(orb);
    });
  }

  // ─── ANIMATION LOOP ────────────────────────────────────────────────────────

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Camera gently orbits — like a student exploring the classroom
    this.camera.position.x = Math.sin(t * 0.07) * 0.8;
    this.camera.position.y = Math.sin(t * 0.1) * 0.3;
    this.camera.lookAt(0, 0, 0);

    // Background particles drift
    this.backgroundParticles.rotation.y = t * 0.008;
    this.backgroundParticles.rotation.x = Math.sin(t * 0.015) * 0.04;

    // DNA helix rotates — knowledge building
    const helixGroupOffset = t * 0.35;
    this.helixPoints.forEach(({ mesh, side, index }) => {
      const baseT = index / (this.helixPoints.length / 2);
      const angle = baseT * 3 * Math.PI * 2 + helixGroupOffset + (side === 1 ? Math.PI : 0);
      const y = baseT * 6.0 - 3.0;
      mesh.position.x = Math.cos(angle) * 0.7 + 2.0;
      mesh.position.y = y;
      mesh.position.z = Math.sin(angle) * 0.35;
      // Glow pulse per bead
      const pulse = 0.5 + Math.sin(t * 2 + index * 0.4) * 0.3;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    });

    // Rebuild connector lines dynamically
    this.helixConnectors.forEach((conn, ci) => {
      const i = ci * 2;
      if (i + 2 < this.helixPoints.length) {
        const p1 = this.helixPoints[i].mesh.position;
        const p2 = this.helixPoints[i + 1].mesh.position;
        const pts = [p1.clone(), p2.clone()];
        conn.geometry.setFromPoints(pts);
        conn.geometry.attributes['position'].needsUpdate = true;
      }
    });

    // Teaching board subtle sway — teacher enthusiasm
    this.teacherBoard.rotation.y = 0.25 + Math.sin(t * 0.4) * 0.04;
    this.teacherBoard.position.y = 0.2 + Math.sin(t * 0.35) * 0.05;

    // Pencil writing motion — elliptical writing gesture
    this.pencil.position.x = -0.8 + Math.sin(t * 1.5) * 0.3;
    this.pencil.position.y = 1.5 + Math.cos(t * 1.5) * 0.15;
    this.pencil.rotation.z = -Math.PI / 5 + Math.sin(t * 1.5) * 0.1;

    // Success rings pulse outward and rotate
    this.successRings.forEach((ring, i) => {
      ring.rotation.z = t * (0.3 + i * 0.15);
      ring.rotation.x = Math.PI / 3 + Math.sin(t * 0.5 + i) * 0.1;
      const scale = 1 + Math.sin(t * 1.2 + i * 1.2) * 0.08;
      ring.scale.setScalar(scale);
      (ring.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.6 + Math.sin(t * 2 + i) * 0.4;
    });

    // Stars rise upward endlessly — continuous achievement
    this.risingStars.forEach(star => {
      star.mesh.position.y += star.speed * 0.012;
      star.mesh.rotation.y += 0.03;
      star.mesh.rotation.x += 0.02;
      // Reset when gone off-screen top
      if (star.mesh.position.y > 6) {
        star.mesh.position.y = star.startY;
        star.mesh.position.x = (Math.random() - 0.5) * 10;
      }
      // Twinkle
      const twinkle = 0.8 + Math.sin(Date.now() * 0.003 + star.x) * 0.4;
      star.mesh.scale.setScalar(twinkle);
    });

    // Glow orbs float — subjects floating in the mind
    this.glowOrbs.forEach((orb, i) => {
      orb.position.y += Math.sin(t * 0.6 + i * 1.5) * 0.005;
      orb.position.x += Math.cos(t * 0.4 + i * 1.2) * 0.003;
      const pulse = 0.7 + Math.sin(t * 2.5 + i * 0.8) * 0.3;
      (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
      (orb.material as THREE.MeshStandardMaterial).opacity = 0.7 + Math.sin(t + i) * 0.15;
    });

    this.renderer.render(this.scene, this.camera);
  }

  // ─── COMPONENT LOGIC (unchanged from your original) ───────────────────────

  private passwordValidator(): any {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      const hasUpperCase  = /[A-Z]/.test(value);
      const hasLowerCase  = /[a-z]/.test(value);
      const hasNumeric    = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      if (!(hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar)) {
        return { weakPassword: { hasUpperCase, hasLowerCase, hasNumeric, hasSpecialChar } };
      }
      return null;
    };
  }

  private passwordMatchValidator(): any {
    return (group: AbstractControl): ValidationErrors | null => {
      const pw  = group.get('password')?.value;
      const cpw = group.get('confirmPassword')?.value;
      if (!pw || !cpw) return null;
      return pw === cpw ? null : { passwordMismatch: true };
    };
  }

  hasUpperCase(): boolean  { return /[A-Z]/.test(this.registerForm.get('password')?.value || ''); }
  hasLowerCase(): boolean  { return /[a-z]/.test(this.registerForm.get('password')?.value || ''); }
  hasNumber(): boolean     { return /[0-9]/.test(this.registerForm.get('password')?.value || ''); }
  hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.registerForm.get('password')?.value || '');
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'password') this.showPassword = !this.showPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: RegisterRequest = {
      firstName:       this.registerForm.get('firstName')?.value,
      lastName:        this.registerForm.get('lastName')?.value,
      email:           this.registerForm.get('email')?.value,
      phoneNumber:     this.registerForm.get('phoneNumber')?.value,
      password:        this.registerForm.get('password')?.value,
      confirmPassword: this.registerForm.get('confirmPassword')?.value
    };

    this.authService.register(request).subscribe({
      next: () => {
        this.successMessage = 'Registration successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
        console.error('[v0] Register error:', error);
      },
      complete: () => { this.isLoading = false; }
    });
  }

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (!control || !control.touched || !control.errors) return '';
    const e = control.errors;
    switch (field) {
      case 'firstName': case 'lastName':
        if (e['required'])  return `${field === 'firstName' ? 'First' : 'Last'} name is required`;
        if (e['minlength']) return `${field === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters`;
        break;
      case 'email':
        if (e['required'])  return 'Email is required';
        if (e['email'])     return 'Please enter a valid email address';
        break;
      case 'phoneNumber':
        if (e['required'])  return 'Phone number is required';
        if (e['pattern'])   return 'Please enter a valid phone number';
        break;
      case 'password':
        if (e['required'])     return 'Password is required';
        if (e['minlength'])    return 'Password must be at least 8 characters';
        if (e['weakPassword']) return 'Must contain uppercase, lowercase, number and special character';
        break;
      case 'confirmPassword':
        if (e['required'])  return 'Confirm password is required';
        break;
    }
    return '';
  }

  registerWithGoogle(): void   { this.oauth2Service.initiateOAuth2Login('google'); }
  registerWithGitHub(): void   { this.oauth2Service.initiateOAuth2Login('github'); }
  registerWithFacebook(): void { this.oauth2Service.initiateOAuth2Login('facebook'); }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.renderer?.dispose();
    window.removeEventListener('resize', this.resizeHandler);
  }
}
