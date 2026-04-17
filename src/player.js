import * as THREE from "three";

export class Player {
  constructor(vehicle, texture) {
    this.vehicle = vehicle;
    this.position = new THREE.Vector3(0, 0.05, 0);
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.radius = vehicle.radius;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.copy(this.position);
  }

  reset() {
    this.position.set(0, 0.05, 0);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.speed = 0;
    this.mesh.position.copy(this.position);
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

    this.mesh.position.copy(this.position);
    this.mesh.rotation.z = -this.heading;
  }
}
