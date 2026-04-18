import * as THREE from "three";

export class Player {
  constructor(vehicle, texture) {
    this.vehicle = vehicle;
    this.position = new THREE.Vector3(0, 0.05, 0);
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.radius = vehicle.radius;
    this.visualHeight = 2.4;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, this.visualHeight), material);
    this.syncMesh();
  }

  reset() {
    this.position.set(0, 0.05, 0);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.speed = 0;
    this.syncMesh();
  }

  update(dt, input, bounds) {
    const turnInfluence = THREE.MathUtils.clamp(Math.abs(this.speed) / 10, 0.25, 1);
    this.heading += input.steer * this.vehicle.turnSpeed * turnInfluence * dt;

    this.speed += input.throttle * this.vehicle.acceleration * dt;
    this.speed = THREE.MathUtils.clamp(this.speed, -this.vehicle.maxSpeed * 0.45, this.vehicle.maxSpeed);
    this.speed *= Math.pow(this.vehicle.drag, dt * 60);

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(forward).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x, -bounds, bounds);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -bounds, bounds);

    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.visualHeight / 2, this.position.z);
  }
}
