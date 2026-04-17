import * as THREE from "three";
import { introLines, world } from "./config.js";
import { Player } from "./player.js";
import { PoliceCar } from "./police.js";
import { TrafficCar } from "./traffic.js";

export class Game {
  constructor(canvas, input, ui) {
    this.canvas = canvas;
    this.input = input;
    this.ui = ui;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x151a18);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.textures = createTextures();
    this.police = [];
    this.traffic = [];
    this.state = "title";
    this.taunts = 0;
    this.arrest = 0;
    this.elapsed = 0;
    this.maxPolice = 0;
    this.demoTimeScale = 1;

    this.createWorld();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.tick());
  }

  showAttract() {
    this.state = "attract";
    this.ui.show("title");
    this.camera.position.set(24, 28, 34);
    this.camera.lookAt(0, 0, 0);
  }

  chooseDifficulty() {
    this.ui.show("difficulty");
  }

  chooseVehicle(difficulty) {
    this.difficulty = difficulty;
    this.ui.show("vehicle");
  }

  async startIntro(vehicle) {
    this.vehicle = vehicle;
    this.resetRun();
    this.ui.show("intro");

    for (const line of introLines) {
      this.ui.setDialogue(line, line.includes("逃げろ") ? "逃げる" : "進む");
      await this.ui.waitDialogue();
    }

    this.startRun();
  }

  startRun() {
    this.state = "playing";
    this.ui.show("play");
    this.clock.getDelta();
  }

  resetRun() {
    this.clearActors();
    this.player = new Player(this.vehicle, this.textures[this.vehicle.id]);
    this.scene.add(this.player.mesh);
    this.player.reset();
    this.spawnPolice(new THREE.Vector3(0, 0.05, -18));
    this.spawnTraffic(this.difficulty.trafficCount);
    this.taunts = 0;
    this.arrest = 0;
    this.elapsed = 0;
    this.maxPolice = this.police.length;
    this.demoTimeScale = this.difficulty.duration / this.difficulty.demoDuration;
  }

  clearActors() {
    if (this.player) this.scene.remove(this.player.mesh);
    for (const car of this.police) this.scene.remove(car.mesh);
    for (const car of this.traffic) this.scene.remove(car.mesh);
    this.police = [];
    this.traffic = [];
  }

  tick() {
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === "playing") {
      this.update(rawDt);
    } else if (this.state === "attract") {
      this.scene.rotation.y = Math.sin(performance.now() * 0.00008) * 0.025;
    }
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const input = this.input.snapshot();
    if (input.taunt) {
      this.taunt();
    }

    this.player.update(dt, input, world.size / 2 - 4);

    let nearestPolice = Infinity;
    for (const car of this.police) {
      nearestPolice = Math.min(nearestPolice, car.update(dt, this.player.position, this.police));
    }

    for (const car of this.traffic) {
      car.update(dt, world.size / 2);
      this.resolveTrafficCollision(car);
    }

    this.resolvePoliceTrafficAccidents();

    this.updateArrest(dt, nearestPolice);
    this.updateCamera(dt);
    this.elapsed += dt * this.demoTimeScale;

    const remaining = this.difficulty.duration - this.elapsed;
    this.ui.updateHud({
      remaining,
      policeCount: this.police.length,
      taunts: this.taunts,
      arrest: this.arrest,
    });

    if (remaining <= 0) {
      this.finish(true);
    } else if (this.arrest >= 1) {
      this.finish(false);
    }
  }

  taunt() {
    this.taunts += 1;
    const angle = Math.random() * Math.PI * 2;
    const distance = 22 + Math.random() * 10;
    const position = this.player.position.clone().add(new THREE.Vector3(Math.sin(angle) * distance, 0, Math.cos(angle) * distance));
    position.x = THREE.MathUtils.clamp(position.x, -world.size / 2, world.size / 2);
    position.z = THREE.MathUtils.clamp(position.z, -world.size / 2, world.size / 2);
    this.spawnPolice(position);
  }

  spawnPolice(position) {
    const speed = this.difficulty?.policeSpeed ?? 16;
    const car = new PoliceCar(this.textures.police, position, speed + Math.random() * 2);
    this.police.push(car);
    this.scene.add(car.mesh);
    this.maxPolice = Math.max(this.maxPolice, this.police.length);
  }

  spawnTraffic(count) {
    const lanes = [-4, 4, -34, 34];
    for (let i = 0; i < count; i += 1) {
      const vertical = i % 2 === 0;
      const lane = lanes[i % lanes.length];
      const offset = -world.size / 2 + Math.random() * world.size;
      const direction = i % 3 === 0 ? -1 : 1;
      const car = new TrafficCar(this.textures.traffic, lane, offset, direction, 8 + Math.random() * 7);
      if (!vertical) {
        car.mesh.rotation.z += Math.PI / 2;
        car.position.set(offset, 0.04, lane);
        car.update = function update(dt, wrap) {
          this.position.x += this.direction * this.speed * dt;
          if (this.position.x > wrap) this.position.x = -wrap;
          if (this.position.x < -wrap) this.position.x = wrap;
          this.mesh.position.copy(this.position);
        };
      }
      this.traffic.push(car);
      this.scene.add(car.mesh);
    }
  }

  resolveTrafficCollision(car) {
    const distance = car.position.distanceTo(this.player.position);
    if (distance < car.radius + this.player.radius) {
      const push = this.player.position.clone().sub(car.position).normalize();
      this.player.position.addScaledVector(push, 0.18);
      this.player.speed *= 0.92;
      this.arrest = Math.min(1, this.arrest + 0.015);
    }
  }

  resolvePoliceTrafficAccidents() {
    for (const policeCar of this.police) {
      if (policeCar.crashTimer > 0) continue;
      for (const trafficCar of this.traffic) {
        const distance = policeCar.position.distanceTo(trafficCar.position);
        if (distance < policeCar.radius + trafficCar.radius) {
          policeCar.crash();
          break;
        }
      }
    }
  }

  updateArrest(dt, nearestPolice) {
    if (nearestPolice < 4.2) {
      this.arrest += dt * 0.22;
    } else if (nearestPolice < 8) {
      this.arrest += dt * 0.08;
    } else {
      this.arrest -= dt * 0.065;
    }
    this.arrest = THREE.MathUtils.clamp(this.arrest, 0, 1);
  }

  updateCamera(dt) {
    const back = new THREE.Vector3(-Math.sin(this.player.heading), 0, -Math.cos(this.player.heading));
    const target = this.player.position.clone().addScaledVector(back, 18).add(new THREE.Vector3(0, 18, 0));
    this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
    const lookAt = this.player.position.clone().add(new THREE.Vector3(0, 0, 8));
    this.camera.lookAt(lookAt);
  }

  finish(won) {
    this.state = "result";
    this.ui.showResult({
      won,
      difficulty: this.difficulty,
      taunts: this.taunts,
      maxPolice: this.maxPolice,
      survived: Math.min(this.elapsed, this.difficulty.duration),
    });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  createWorld() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(world.size, world.size),
      new THREE.MeshBasicMaterial({ color: 0x274434 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x303331 });
    const roadGeo = new THREE.PlaneGeometry(world.roadHalfWidth * 2, world.size);
    for (const x of [-30, 0, 30]) {
      const road = new THREE.Mesh(roadGeo, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.x = x;
      road.position.y = 0.01;
      this.scene.add(road);
    }
    const crossGeo = new THREE.PlaneGeometry(world.size, world.roadHalfWidth * 2);
    for (const z of [-30, 0, 30]) {
      const road = new THREE.Mesh(crossGeo, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.z = z;
      road.position.y = 0.012;
      this.scene.add(road);
    }

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf2d160 });
    for (const x of [-30, 0, 30]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, world.size), lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, 0);
      this.scene.add(line);
    }

    for (let x = -75; x <= 75; x += world.blockSpacing) {
      for (let z = -75; z <= 75; z += world.blockSpacing) {
        if (Math.abs(x) <= 8 || Math.abs(z) <= 8 || Math.abs(x - 30) <= 8 || Math.abs(z - 30) <= 8 || Math.abs(x + 30) <= 8 || Math.abs(z + 30) <= 8) {
          continue;
        }
        this.addBuilding(x, z);
      }
    }

    const light = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
    this.scene.add(light);
  }

  addBuilding(x, z) {
    const height = 8 + Math.random() * 12;
    const material = new THREE.MeshBasicMaterial({
      map: this.textures.building,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, height), material);
    mesh.position.set(x + Math.random() * 8 - 4, height / 2, z + Math.random() * 8 - 4);
    mesh.rotation.y = Math.random() > 0.5 ? 0 : Math.PI / 2;
    this.scene.add(mesh);
  }
}

function createTextures() {
  return {
    sedan: carTexture("#2f7de9", "乗"),
    moped: carTexture("#ffd34d", "原"),
    dump: carTexture("#e68b2e", "ダ"),
    offroad: carTexture("#43b66f", "オ"),
    police: carTexture("#f8f4e8", "警", "#e9362f"),
    traffic: carTexture("#8a94a6", "NPC"),
    building: buildingTexture(),
  };
}

function carTexture(body, label, accent = "#11130f") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(28, 118, 200, 18);
  ctx.fillStyle = body;
  roundRect(ctx, 30, 34, 196, 82, 18);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(62, 48, 132, 20);
  ctx.fillStyle = "#f8f4e8";
  ctx.font = "800 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 84);
  return new THREE.CanvasTexture(canvas);
}

function buildingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#545f68";
  ctx.fillRect(18, 8, 156, 360);
  ctx.fillStyle = "#9ed0d8";
  for (let y = 34; y < 330; y += 44) {
    for (let x = 42; x < 150; x += 42) {
      ctx.fillRect(x, y, 22, 24);
    }
  }
  ctx.fillStyle = "#2a2f35";
  ctx.fillRect(0, 360, 192, 24);
  return new THREE.CanvasTexture(canvas);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
