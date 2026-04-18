import * as THREE from "three";
import { difficulties, introLines, vehicles, world } from "./config.js";
import { Player } from "./player.js";
import { PoliceCar } from "./police.js";
import { TrafficCar } from "./traffic.js";

const SAVE_KEY = "carChaseGame.save.v1";
const SAVE_INTERVAL = 2;

export class Game {
  constructor(canvas, input, ui) {
    this.canvas = canvas;
    this.input = input;
    this.ui = ui;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x079fd0);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.textures = createTextures();
    this.billboards = [];
    this.police = [];
    this.traffic = [];
    this.state = "title";
    this.taunts = 0;
    this.arrest = 0;
    this.elapsed = 0;
    this.maxPolice = 0;
    this.saveTimer = 0;
    this.isPaused = false;

    this.createWorld();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.renderer.setAnimationLoop(() => this.tick());
  }

  showAttract() {
    this.state = "attract";
    this.isPaused = false;
    this.clearSave();
    this.ui.show("title");
    this.camera.position.set(24, 28, 34);
    this.camera.lookAt(0, 0, 0);
  }

  chooseDifficulty() {
    this.clearSave();
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
    this.isPaused = false;
    this.scene.rotation.set(0, 0, 0);
    this.ui.show("play");
    this.saveRun();
    this.clock.getDelta();
  }

  resetRun() {
    this.clearActors();
    this.player = new Player(this.vehicle, this.textures[this.vehicle.id]);
    this.scene.add(this.player.mesh);
    this.addBillboard(this.player.mesh);
    this.player.reset();
    this.spawnPolice(new THREE.Vector3(0, 0.05, -18));
    this.spawnTraffic(this.difficulty.trafficCount);
    this.taunts = 0;
    this.arrest = 0;
    this.elapsed = 0;
    this.maxPolice = this.police.length;
    this.saveTimer = 0;
  }

  clearActors() {
    if (this.player) this.scene.remove(this.player.mesh);
    for (const car of this.police) this.scene.remove(car.mesh);
    for (const car of this.traffic) this.scene.remove(car.mesh);
    this.police = [];
    this.traffic = [];
    this.billboards = this.billboards.filter((mesh) => mesh.userData.staticBillboard);
  }

  tick() {
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === "playing") {
      this.update(rawDt);
    } else if (this.state === "paused") {
      const input = this.input.snapshot();
      if (input.pause) {
        this.resume();
      }
    } else if (this.state === "attract") {
      this.scene.rotation.y = Math.sin(performance.now() * 0.00008) * 0.025;
    }
    this.faceBillboards();
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const input = this.input.snapshot();
    if (input.pause) {
      this.pause();
      return;
    }
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
    this.updateCamera();
    this.elapsed += dt;
    this.saveTimer += dt;
    if (this.saveTimer >= SAVE_INTERVAL) {
      this.saveTimer = 0;
      this.saveRun();
    }

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
    const speed = this.vehicle?.maxSpeed ?? 20;
    const car = new PoliceCar(this.textures.police, position, speed);
    this.police.push(car);
    this.scene.add(car.mesh);
    this.addBillboard(car.mesh);
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
        car.position.set(offset, 0.04, lane);
        car.update = function update(dt, wrap) {
          this.position.x += this.direction * this.speed * dt;
          if (this.position.x > wrap) this.position.x = -wrap;
          if (this.position.x < -wrap) this.position.x = wrap;
          this.syncMesh();
        };
      }
      this.traffic.push(car);
      this.scene.add(car.mesh);
      this.addBillboard(car.mesh);
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

  updateCamera() {
    const back = new THREE.Vector3(-Math.sin(this.player.heading), 0, -Math.cos(this.player.heading));
    const forward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading));
    const target = this.player.position.clone().addScaledVector(back, 13).add(new THREE.Vector3(0, 7.5, 0));
    this.camera.position.copy(target);
    const lookAt = this.player.position.clone().addScaledVector(forward, 8).add(new THREE.Vector3(0, 2.2, 0));
    this.camera.lookAt(lookAt);
  }

  finish(won) {
    this.state = "result";
    this.clearSave();
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
      new THREE.MeshBasicMaterial({ color: 0xd64c00 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0xc9895f });
    const roadGeo = new THREE.PlaneGeometry(world.roadHalfWidth * 2, world.size);
    const road = new THREE.Mesh(roadGeo, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    this.scene.add(road);

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf7f0d5 });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, world.size), lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, 0);
    this.scene.add(line);

    for (let x = -100; x <= 100; x += world.propSpacing) {
      for (let z = -100; z <= 100; z += world.propSpacing) {
        if (Math.abs(x) <= 14) {
          continue;
        }
        this.addDesertProp(x, z);
      }
    }

    const light = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
    this.scene.add(light);
  }

  addDesertProp(x, z) {
    const height = 3 + Math.random() * 4;
    const material = new THREE.MeshBasicMaterial({
      map: Math.random() > 0.45 ? this.textures.cactus : this.textures.rock,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.9, height), material);
    mesh.position.set(x + Math.random() * 8 - 4, height / 2, z + Math.random() * 8 - 4);
    mesh.userData.staticBillboard = true;
    this.scene.add(mesh);
    this.addBillboard(mesh);
  }

  addBillboard(mesh) {
    if (!this.billboards.includes(mesh)) {
      this.billboards.push(mesh);
    }
  }

  faceBillboards() {
    for (const mesh of this.billboards) {
      mesh.lookAt(this.camera.position);
    }
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.isPaused = true;
    this.saveRun();
    this.ui.showPause();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.isPaused = false;
    this.saveRun();
    this.ui.show("play");
    this.clock.getDelta();
  }

  resumeSavedRun() {
    const save = this.loadSave();
    if (!save) return false;

    const difficulty = difficulties.find((item) => item.id === save.difficultyId);
    const vehicle = vehicles.find((item) => item.id === save.vehicleId);
    if (!difficulty || !vehicle) {
      this.clearSave();
      return false;
    }

    this.difficulty = difficulty;
    this.vehicle = vehicle;
    this.resetRun();
    this.elapsed = THREE.MathUtils.clamp(save.elapsed ?? 0, 0, difficulty.duration);
    this.taunts = save.taunts ?? 0;
    this.arrest = THREE.MathUtils.clamp(save.arrest ?? 0, 0, 1);
    this.maxPolice = Math.max(save.maxPolice ?? 1, 1);

    if (save.player) {
      this.player.position.fromArray(save.player.position ?? [0, 0.05, 0]);
      this.player.heading = save.player.heading ?? 0;
      this.player.speed = save.player.speed ?? 0;
      this.player.syncMesh();
    }

    for (const car of this.police) this.scene.remove(car.mesh);
    this.police = [];
    this.billboards = this.billboards.filter((mesh) => (
      mesh.userData.staticBillboard ||
      mesh === this.player.mesh ||
      this.traffic.some((car) => car.mesh === mesh)
    ));
    for (const item of save.police ?? []) {
      this.spawnPolice(new THREE.Vector3().fromArray(item.position ?? [0, 0.05, -18]));
    }
    if (this.police.length === 0) {
      this.spawnPolice(new THREE.Vector3(0, 0.05, -18));
    }

    this.updateCamera();
    this.ui.updateHud({
      remaining: this.difficulty.duration - this.elapsed,
      policeCount: this.police.length,
      taunts: this.taunts,
      arrest: this.arrest,
    });

    if (save.paused) {
      this.state = "paused";
      this.isPaused = true;
      this.ui.showPause();
    } else {
      this.state = "playing";
      this.isPaused = false;
      this.ui.show("play");
    }
    this.clock.getDelta();
    return true;
  }

  saveRun() {
    if (!this.difficulty || !this.vehicle || !this.player || this.state === "result") return;
    const data = {
      difficultyId: this.difficulty.id,
      vehicleId: this.vehicle.id,
      elapsed: this.elapsed,
      taunts: this.taunts,
      arrest: this.arrest,
      maxPolice: this.maxPolice,
      paused: this.state === "paused" || this.isPaused,
      player: {
        position: this.player.position.toArray(),
        heading: this.player.heading,
        speed: this.player.speed,
      },
      police: this.police.map((car) => ({
        position: car.position.toArray(),
      })),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable in restrictive browser modes.
    }
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage can be unavailable in restrictive browser modes.
    }
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
    cactus: cactusTexture(),
    rock: rockTexture(),
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

function cactusTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#006c1d";
  roundRect(ctx, 86, 26, 28, 206, 12);
  ctx.fill();
  roundRect(ctx, 44, 94, 24, 80, 10);
  ctx.fill();
  roundRect(ctx, 124, 74, 24, 92, 10);
  ctx.fill();
  ctx.fillRect(62, 146, 34, 20);
  ctx.fillRect(108, 120, 32, 20);
  ctx.fillStyle = "#005015";
  ctx.fillRect(72, 232, 48, 10);
  return new THREE.CanvasTexture(canvas);
}

function rockTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8e7f6d";
  ctx.beginPath();
  ctx.moveTo(28, 132);
  ctx.lineTo(48, 70);
  ctx.lineTo(92, 36);
  ctx.lineTo(146, 62);
  ctx.lineTo(170, 132);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b0a18c";
  ctx.beginPath();
  ctx.moveTo(54, 76);
  ctx.lineTo(92, 44);
  ctx.lineTo(126, 62);
  ctx.lineTo(88, 88);
  ctx.closePath();
  ctx.fill();
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
