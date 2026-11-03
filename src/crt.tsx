import { useEffect, useRef, useState } from "react";

/**
 * 封面与序章共用的显像管外框资源：
 * - #mm-screen-clip：微鼓的屏幕轮廓（.mm-screen / .mm-tv::after 引用）
 * - #mm-crt-barrel：桶形畸变（鱼眼）滤镜，作用在比屏幕略大的 bend 层上
 * 同一时刻只会挂载封面或序章其中之一，因此沿用同一组 id。
 */
export function CrtDefs({ width, height }: { width: number; height: number }) {
  return (
    <svg className="mm-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="mm-screen-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.03,0.014 Q0.5,-0.014 0.97,0.014 Q0.99,0.018 0.99,0.05 Q1.01,0.5 0.99,0.95 Q0.99,0.982 0.97,0.986 Q0.5,1.014 0.03,0.986 Q0.01,0.982 0.01,0.95 Q-0.01,0.5 0.01,0.05 Q0.01,0.018 0.03,0.014 Z" />
        </clipPath>
        {width > 0 && (
          <filter
            id="mm-crt-barrel"
            x="0"
            y="0"
            width={width}
            height={height}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={barrelMap} x="0" y="0" width={width} height={height} preserveAspectRatio="none" result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={Math.round(width * 0.075)}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        )}
      </defs>
    </svg>
  );
}

export const barrelFilterStyle = (width: number) => (width > 0 ? { filter: "url(#mm-crt-barrel)" } : undefined);

const barrelMap = createBarrelMap();

/** 生成 CRT 桶形畸变位移图：R/G 通道分别编码 x/y 偏移，边缘越远偏移越大。 */
function createBarrelMap() {
  if (typeof document === "undefined") return "";
  const width = 320;
  const height = 180;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const v = ((y + 0.5) / height) * 2 - 1;
    for (let x = 0; x < width; x += 1) {
      const u = ((x + 0.5) / width) * 2 - 1;
      const r2 = u * u + v * v;
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(127.5 + 127.5 * (u * r2) / 2);
      image.data[offset + 1] = Math.round(127.5 + 127.5 * (v * r2) / 2);
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
