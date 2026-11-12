import * as THREE from "three";

export interface TextStyle {
  bg?: string;            // background fill ('' = transparent)
  fg?: string;            // text color
  font?: string;          // CSS font family
  weight?: string;
  size?: number;          // font size in px relative to canvas height 256
  lineHeight?: number;
  align?: CanvasTextAlign;
  border?: string;        // border color
  borderWidth?: number;
  round?: boolean;        // circular mask (round screens)
  scanlines?: boolean;
}

/** A canvas-backed texture you can redraw text onto. */
export class TextTexture {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private last = "";

  constructor(public width = 256, public height = 256) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  /** Draw lines of text. Skips work when nothing changed. */
  draw(lines: string | string[], style: TextStyle = {}) {
    const arr = Array.isArray(lines) ? lines : lines.split("\n");
    const key = JSON.stringify([arr, style]);
    if (key === this.last) return;
    this.last = key;
    const { ctx, width: w, height: h } = this;
    const s = h / 256;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (style.round) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    if (style.bg !== "") {
      ctx.fillStyle = style.bg ?? "#111";
      ctx.fillRect(0, 0, w, h);
    }
    if (style.border) {
      ctx.strokeStyle = style.border;
      ctx.lineWidth = (style.borderWidth ?? 8) * s;
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    }
    const size = (style.size ?? 40) * s;
    const lh = size * (style.lineHeight ?? 1.15);
    ctx.font = `${style.weight ?? "800"} ${size}px ${style.font ?? "'Arial Black', Impact, sans-serif"}`;
    ctx.fillStyle = style.fg ?? "#fff";
    ctx.textAlign = style.align ?? "center";
    ctx.textBaseline = "middle";
    const x = ctx.textAlign === "left" ? 16 * s : ctx.textAlign === "right" ? w - 16 * s : w / 2;
    const y0 = h / 2 - ((arr.length - 1) * lh) / 2;
    arr.forEach((line, i) => {
      // shrink to fit width
      let fs = size;
      while (ctx.measureText(line).width > w * 0.9 && fs > 8) {
        fs -= 2;
        ctx.font = `${style.weight ?? "800"} ${fs}px ${style.font ?? "'Arial Black', Impact, sans-serif"}`;
      }
      ctx.fillText(line, x, y0 + i * lh);
      ctx.font = `${style.weight ?? "800"} ${size}px ${style.font ?? "'Arial Black', Impact, sans-serif"}`;
    });
    if (style.scanlines) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let yy = 0; yy < h; yy += 4 * s) ctx.fillRect(0, yy, w, 2 * s);
    }
    ctx.restore();
    this.texture.needsUpdate = true;
  }

  /** Free-form drawing access. Call `commit()` afterwards. */
  paint(fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
    this.last = "";
    fn(this.ctx, this.width, this.height);
    this.texture.needsUpdate = true;
  }
}

/** A flat plane showing text (signs, banners, billboards). */
export function textPlane(lines: string | string[], w: number, h: number, style: TextStyle = {}, px = 256) {
  const tt = new TextTexture(Math.round((px * w) / h), px);
  tt.draw(lines, style);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tt.texture,
      transparent: style.bg === "" || !!style.round,
      // transparent text must not occlude what's behind its empty pixels
      depthWrite: !(style.bg === "" || !!style.round),
      side: THREE.DoubleSide,
    }),
  );
  return Object.assign(m, { tt });
}
