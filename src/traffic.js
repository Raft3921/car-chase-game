import * as THREE from "three";

export class TrafficCar {
  constructor(texture, lane, offset, direction, speed) {
    this.lane = lane;
    this.direction = direction;
    this.speed = speed;
    this.radius = 1.15;
    this.position = new THREE.Vector3(lane, 0.04, offset);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.9), material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.rotation.z = direction > 0 ? Math.PI : 0;
    this.mesh.position.copy(this.position);
  }

  update(dt, wrap) {
    this.position.z += this.direction * this.speed * dt;
    if (this.position.z > wrap) this.position.z = -wrap;
    if (this.position.z < -wrap) this.position.z = wrap;
    this.mesh.position.copy(this.position);
  }
}
