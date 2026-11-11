import type { SceneSlug } from "@/lib/story/scenes";
import type { SceneMotionBuilder } from "./scene-kit";
import { motionCayMa } from "./scenes/cay-ma";
import { motionDenTayKhach } from "./scenes/den-tay-khach";
import { motionDongGoi } from "./scenes/dong-goi";
import { motionGat } from "./scenes/gat";
import { motionMamCom } from "./scenes/mam-com";
import { motionNangMuaGio } from "./scenes/nang-mua-gio";
import { motionSay } from "./scenes/say";
import { motionXayXat } from "./scenes/xay-xat";

export type { SceneMotion } from "./scene-kit";

/** The motion of each scene, laid over its sketch (decision 0017). */
export const SCENE_MOTIONS: Record<SceneSlug, SceneMotionBuilder> = {
  "cay-ma": motionCayMa,
  "nang-mua-gio": motionNangMuaGio,
  gat: motionGat,
  say: motionSay,
  "xay-xat": motionXayXat,
  "dong-goi": motionDongGoi,
  "den-tay-khach": motionDenTayKhach,
  "mam-com": motionMamCom,
};
