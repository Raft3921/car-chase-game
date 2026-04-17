export const difficulties = [
  {
    id: "easy",
    label: "イージー",
    duration: 60 * 60,
    demoDuration: 90,
    policeSpeed: 15,
    trafficCount: 10,
    description: "1時間逃げ切り。まずは街に慣れる。",
  },
  {
    id: "normal",
    label: "ノーマル",
    duration: 10 * 60 * 60,
    demoDuration: 150,
    policeSpeed: 18,
    trafficCount: 16,
    description: "10時間逃げ切り。追跡も交通量も本番。",
  },
  {
    id: "hard",
    label: "ハード",
    duration: 20 * 60 * 60,
    demoDuration: 210,
    policeSpeed: 21,
    trafficCount: 22,
    description: "20時間逃げ切り。タイトル通りの地獄。",
  },
];

export const vehicles = [
  {
    id: "sedan",
    label: "乗用車",
    maxSpeed: 25,
    acceleration: 18,
    turnSpeed: 2.6,
    drag: 0.985,
    radius: 1.2,
    taunt: "クラクションで煽った！",
    description: "標準性能。扱いやすい。",
    color: "#2f7de9",
  },
  {
    id: "moped",
    label: "原付",
    maxSpeed: 20,
    acceleration: 20,
    turnSpeed: 3.8,
    drag: 0.975,
    radius: 0.8,
    taunt: "ベルを連打して煽った！",
    description: "小回り最強。狭い道に強い。",
    color: "#ffd34d",
  },
  {
    id: "dump",
    label: "ダンプカー",
    maxSpeed: 18,
    acceleration: 12,
    turnSpeed: 1.8,
    drag: 0.99,
    radius: 1.7,
    taunt: "爆音ホーンで煽った！",
    description: "重くて頑丈。曲がるのは苦手。",
    color: "#e68b2e",
  },
  {
    id: "offroad",
    label: "オフロード車",
    maxSpeed: 23,
    acceleration: 17,
    turnSpeed: 3.0,
    drag: 0.982,
    radius: 1.25,
    taunt: "泥を飛ばして煽った！",
    description: "悪路に強いバランス型。",
    color: "#43b66f",
  },
];

export const introLines = [
  "そこの車、止まってください。",
  "お前、髪型が気に食わんから逮捕。",
  "……いや待て、今すぐ逃げろ！",
];

export const world = {
  size: 180,
  roadHalfWidth: 6,
  blockSpacing: 30,
};
