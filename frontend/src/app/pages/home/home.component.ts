import {AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router} from "@angular/router";
import * as THREE from 'three';
import {TranslateService} from "@ngx-translate/core";
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroCanvas') heroCanvasRef!: ElementRef<HTMLCanvasElement>;

  isScrolled = false;
  currentLang = 'en';
  isRTL = false;

  curX = 0; curY = 0; ringX = 0; ringY = 0;
  private cursorRaf!: number;
  private renderer: any; private scene: any; private camera: any; private clock: any;
  private animRaf!: number; private resizeObs!: ResizeObserver;
  private atomGroup: any; private nucleus: any; private electrons: any[] = [];
  private dnaGroup: any; private bookGroup: any; private capGroup: any;
  private planetGroup: any; private planet: any; private sparkMesh: any;
  private pl1: any; private pl2: any;
  private tRX = 0; private tRY = 0; private cRX = 0; private cRY = 0;
  private revealObs!: IntersectionObserver;
  techDots = Array.from({ length: 28 }, (_, i) => i);

  constructor(private router: Router, private zone: NgZone, public translate: TranslateService) {
    translate.addLangs(['en', 'fr', 'ar']);
    const browserLang = translate.getBrowserLang() ?? 'en';
    this.switchLang(['en', 'fr', 'ar'].includes(browserLang) ? browserLang : 'en');
  }

  ngOnInit(): void { this.initCursor(); this.initScrollReveal(); }
  ngAfterViewInit(): void { this.initThree(); }
  ngOnDestroy(): void {
    cancelAnimationFrame(this.cursorRaf); cancelAnimationFrame(this.animRaf);
    this.revealObs?.disconnect(); this.resizeObs?.disconnect();
    if (this.renderer) this.renderer.dispose();
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  switchLang(lang: string): void {
    this.currentLang = lang;
    this.isRTL = lang === 'ar';
    this.translate.use(lang);
    document.documentElement.setAttribute('dir', this.isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }

  navigateToLogin(): void { this.router.navigate(['/login']); }
  navigateToRegister(): void { this.router.navigate(['/register']); }

  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled = window.scrollY > 20; }

  private initCursor(): void {
    document.addEventListener('mousemove', this.onMouseMove);
    const tick = () => { this.ringX += (this.curX - this.ringX) * 0.1; this.ringY += (this.curY - this.ringY) * 0.1; this.cursorRaf = requestAnimationFrame(tick); };
    tick();
  }
  private onMouseMove = (e: MouseEvent) => { this.curX = e.clientX; this.curY = e.clientY; this.tRX = (e.clientY / window.innerHeight - 0.5) * 0.3; this.tRY = (e.clientX / window.innerWidth - 0.5) * 0.4; };

  private initScrollReveal(): void {
    this.revealObs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); this.revealObs.unobserve(e.target); } }), { threshold: 0.12 });
    setTimeout(() => document.querySelectorAll('.reveal').forEach((el) => this.revealObs.observe(el)), 100);
  }

  private mat(color: number, emissive = 0x000000, shine = 60): any { return new THREE.MeshPhongMaterial({ color, emissive, shininess: shine, specular: 0xffffff }); }

  private initThree(): void {
    const canvas = this.heroCanvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100); this.camera.position.set(0, 0, 9); this.clock = new THREE.Clock();
    this.resize(); this.resizeObs = new ResizeObserver(() => this.resize()); this.resizeObs.observe(canvas.parentElement!);
    this.addLights(); this.buildAtom(); this.buildDNA(); this.buildBook(); this.buildCap(); this.buildPlanet(); this.buildSparkles();
    this.zone.runOutsideAngular(() => this.tick());
  }
  private resize(): void { const canvas = this.heroCanvasRef?.nativeElement; if (!canvas || !this.renderer) return; const w = canvas.parentElement!.clientWidth, h = canvas.parentElement!.clientHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private addLights(): void { this.scene.add(new THREE.AmbientLight(0xffffff, 0.7)); const sun = new THREE.DirectionalLight(0xfff0d0, 1.4); sun.position.set(6, 8, 6); this.scene.add(sun); this.pl1 = new THREE.PointLight(0x4f7fff, 2.5, 15); this.pl1.position.set(-4, 3, 4); this.scene.add(this.pl1); this.pl2 = new THREE.PointLight(0xff9b4f, 1.8, 12); this.pl2.position.set(4, -2, 3); this.scene.add(this.pl2); const pl3 = new THREE.PointLight(0x4fefbf, 1.5, 10); pl3.position.set(0, 4, -2); this.scene.add(pl3); }
  private buildAtom(): void { this.atomGroup = new THREE.Group(); this.atomGroup.position.set(-1.8, 0.5, 0); this.nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), this.mat(0xff6b35, 0x441100, 80)); this.atomGroup.add(this.nucleus); const oc = [{rx:1.4,ry:0.5,rotX:0,rotY:0,color:0x2563eb,eColor:0x60a5fa},{rx:1.4,ry:0.5,rotX:Math.PI/3,rotY:0,color:0x7c3aed,eColor:0xa78bfa},{rx:1.4,ry:0.5,rotX:-Math.PI/3,rotY:Math.PI/4,color:0x0d9488,eColor:0x34d399}]; oc.forEach((cfg) => { const pts=[]; for(let i=0;i<=64;i++){const a=(i/64)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*cfg.rx,Math.sin(a)*cfg.ry,0));} const ring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),64,0.012,6,true),new THREE.MeshBasicMaterial({color:cfg.color,transparent:true,opacity:0.35})); ring.rotation.x=cfg.rotX;ring.rotation.y=cfg.rotY;this.atomGroup.add(ring); const eMesh=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12),this.mat(cfg.eColor,cfg.eColor,100)); this.atomGroup.add(eMesh);this.electrons.push({mesh:eMesh,cfg,t:Math.random()*Math.PI*2}); }); this.scene.add(this.atomGroup); }
  private buildDNA(): void { this.dnaGroup=new THREE.Group();this.dnaGroup.position.set(2.2,0,0); const dc=[[0x2563eb,0x60a5fa],[0xe11d48,0xfb7185],[0x16a34a,0x4ade80],[0x7c3aed,0xa78bfa]]; const sA:any[]=[],sB:any[]=[]; for(let i=0;i<=40;i++){const t=i/40,y=-2.1+t*4.2,angle=t*3*Math.PI*2,xA=Math.cos(angle)*0.65,zA=Math.sin(angle)*0.65,xB=Math.cos(angle+Math.PI)*0.65,zB=Math.sin(angle+Math.PI)*0.65,ci=Math.floor(i/3)%dc.length; const sa=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),this.mat(dc[ci][0],dc[ci][0],80));sa.position.set(xA,y,zA);this.dnaGroup.add(sa);sA.push(sa); const sb=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),this.mat(dc[ci][1],dc[ci][1],80));sb.position.set(xB,y,zB);this.dnaGroup.add(sb);sB.push(sb); if(i%2===0&&i<40){const rl=new THREE.Vector3(xB-xA,0,zB-zA).length(),rm=new THREE.Vector3((xA+xB)/2,y,(zA+zB)/2),rMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,rl,6),this.mat(0xccddff,0,20));rMesh.position.copy(rm);rMesh.lookAt(new THREE.Vector3(xB,y,zB));rMesh.rotateX(Math.PI/2);this.dnaGroup.add(rMesh);} } for(let i=0;i<sA.length-1;i++)this.dnaGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([sA[i].position.clone(),sA[i+1].position.clone()]),4,0.03,4),this.mat(0x93c5fd,0,20))); for(let i=0;i<sB.length-1;i++)this.dnaGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([sB[i].position.clone(),sB[i+1].position.clone()]),4,0.03,4),this.mat(0xfca5a5,0,20))); this.scene.add(this.dnaGroup); }
  private buildBook(): void { this.bookGroup=new THREE.Group();this.bookGroup.position.set(-3.0,-2.2,1); this.bookGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.0,1.3,0.2),this.mat(0x2563eb,0x0a1f5c,40))); const sp=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.3,0.22),this.mat(0x1d4ed8,0x0a1440,40));sp.position.x=-0.56;this.bookGroup.add(sp); const pg=new THREE.Mesh(new THREE.BoxGeometry(0.86,1.2,0.16),this.mat(0xfffbf5,0,10));pg.position.x=0.06;this.bookGroup.add(pg); for(let i=0;i<5;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.015,0.001),this.mat(0xdde5f0,0,5));l.position.set(0.06,0.35-i*0.15,0.09);this.bookGroup.add(l);} const st=new THREE.Mesh(new THREE.CircleGeometry(0.15,5),this.mat(0xfbbf24,0xaa5500,80));st.position.set(0.06,0.2,0.11);st.rotation.z=Math.PI/10;this.bookGroup.add(st); this.bookGroup.rotation.y=0.4;this.bookGroup.rotation.x=-0.1;this.scene.add(this.bookGroup); }
  private buildCap(): void { this.capGroup=new THREE.Group();this.capGroup.position.set(3.5,2.2,0.5);this.capGroup.scale.setScalar(0.85); this.capGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,1.2),this.mat(0x0f172a,0,10))); const h=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.38,0.3,16),this.mat(0x1e293b,0,10));h.position.y=-0.18;this.capGroup.add(h); const tb=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,8),this.mat(0xfbbf24,0xff8800,80));tb.position.set(0.5,0.04,0.5);this.capGroup.add(tb); this.capGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.5,0.04,0.5),new THREE.Vector3(0.7,-0.3,0.7)]),4,0.018,4),this.mat(0xfbbf24,0xff8800,60))); const te=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),this.mat(0xfbbf24,0xff8800,80));te.position.set(0.7,-0.3,0.7);this.capGroup.add(te); this.capGroup.rotation.y=-0.5;this.capGroup.rotation.x=0.2;this.scene.add(this.capGroup); }
  private buildPlanet(): void { this.planetGroup=new THREE.Group();this.planetGroup.position.set(0,-0.5,-2); this.planet=new THREE.Mesh(new THREE.SphereGeometry(1.0,32,32),new THREE.MeshPhongMaterial({color:0x1d4ed8,emissive:0x061240,shininess:60,transparent:true,opacity:0.7}));this.planetGroup.add(this.planet); const rg=new THREE.Mesh(new THREE.TorusGeometry(1.55,0.06,6,80),this.mat(0x60a5fa,0x082060,40));rg.rotation.x=Math.PI*0.35;this.planetGroup.add(rg); const cc=[0x16a34a,0x15803d,0x22c55e]; for(let i=0;i<6;i++){const cs=0.18+Math.random()*0.22,th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI,c=new THREE.Mesh(new THREE.SphereGeometry(cs,8,8),this.mat(cc[i%3],0,20));c.position.set(Math.sin(ph)*Math.cos(th)*1.02,Math.cos(ph)*1.02,Math.sin(ph)*Math.sin(th)*1.02);this.planetGroup.add(c);} this.scene.add(this.planetGroup); }
  private buildSparkles(): void { const g=new THREE.BufferGeometry(),p=new Float32Array(1800),c=new Float32Array(1800),bc=[[0.15,0.39,0.92],[0.49,0.23,0.93],[0.05,0.58,0.53],[0.96,0.62,0.07],[0.88,0.11,0.28]]; for(let i=0;i<600;i++){p[i*3]=(Math.random()-0.5)*20;p[i*3+1]=(Math.random()-0.5)*14;p[i*3+2]=(Math.random()-0.5)*8-3;const cl=bc[Math.floor(Math.random()*bc.length)];c[i*3]=cl[0];c[i*3+1]=cl[1];c[i*3+2]=cl[2];} g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3)); this.sparkMesh=new THREE.Points(g,new THREE.PointsMaterial({size:0.04,vertexColors:true,transparent:true,opacity:0.7}));this.scene.add(this.sparkMesh); }

  private tick = () => {
    this.animRaf = requestAnimationFrame(this.tick);
    const t = this.clock.getElapsedTime();
    this.cRX += (this.tRX - this.cRX) * 0.04; this.cRY += (this.tRY - this.cRY) * 0.04;
    this.atomGroup.rotation.y = t*0.3+this.cRY; this.atomGroup.rotation.x = this.cRX*0.5;
    this.nucleus.scale.setScalar(1+Math.sin(t*2)*0.06);
    this.electrons.forEach((e) => { e.t+=0.024; const lp=new THREE.Vector3(Math.cos(e.t)*e.cfg.rx,Math.sin(e.t)*e.cfg.ry,0); const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(e.cfg.rotX,e.cfg.rotY,0)); lp.applyQuaternion(q); e.mesh.position.copy(lp); });
    this.dnaGroup.rotation.y=t*0.2+this.cRY*0.5; this.dnaGroup.position.y=Math.sin(t*0.6)*0.2;
    this.bookGroup.rotation.y=0.4+Math.sin(t*0.8)*0.15+this.cRY*0.3; this.bookGroup.position.y=-2.2+Math.sin(t*0.7)*0.1;
    this.capGroup.rotation.y=-0.5+Math.sin(t*0.5)*0.2+this.cRY*0.4; this.capGroup.position.y=2.2+Math.sin(t*0.9)*0.12;
    this.planetGroup.rotation.y=t*0.12; this.planetGroup.rotation.x=this.cRX*0.3; this.planet.rotation.y=t*0.18;
    this.sparkMesh.rotation.y=t*0.02;
    this.pl1.position.x=Math.sin(t*0.5)*5; this.pl1.position.y=Math.cos(t*0.4)*4;
    this.pl2.position.x=Math.cos(t*0.6)*4; this.pl2.position.z=Math.sin(t*0.7)*3+2;
    this.renderer.render(this.scene, this.camera);
  };
}
