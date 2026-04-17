import * as THREE from "three";

export class PoliceCar {
  constructor(texture, position, speed) {
    this.position = position.clone();
    this.speed = speed;
    this.radius = 1.25;
    this.cooldown = Math.random() * 0.5;
    this.crashTimer = 0;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.1), material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.copy(this.position);
  }

  update(dt, targetPosition, others) {
    if (this.crashTimer > 0) {
      this.crashTimer -= dt;
      this.mesh.position.copy(this.position);
      this.mesh.rotation.z += dt * 4;
      return this.position.distanceTo(targetPosition);
    }

    const desired = targetPosition.clone().sub(this.position);
    desired.y = 0;
    const distance = desired.length();
    if (distance > 0.01) {
      desired.normalize();
    }

    const separation = new THREE.Vector3();
    for (const other of others) {
      if (other === this) continue;
      const away = this.position.clone().sub(other.position);
      away.y = 0;
      const gap = away.length();
      if (gap > 0.001 && gap < 4) {
        separation.addScaledVector(away.normalize(), (4 - gap) / 4);
      }
    }

    desired.addScaledVector(separation, 1.4).normalize();
    this.position.addScaledVector(desired, this.speed * dt);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.z = -Math.atan2(desired.x, desired.z);

    return distance;
  }

  crash() {
    this.crashTimer = 1.2;
  }
}
