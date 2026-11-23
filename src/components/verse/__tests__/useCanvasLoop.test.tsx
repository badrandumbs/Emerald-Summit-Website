import { useRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useCanvasLoop } from '../useCanvasLoop';

function Loop({ draw }: { draw: (t: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(ref, (_c, _w, _h, t) => draw(t));
  return <canvas ref={ref} />;
}

afterEach(() => vi.restoreAllMocks());

test('the border keeps moving at full speed while on screen, never easing to a stop', () => {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save() {}, restore() {}, clearRect() {}, setTransform() {},
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 100 } as DOMRect);

  const times: number[] = [];
  render(<Loop draw={(t) => times.push(t)} />);

  // Twenty seconds at 60 fps.
  let now = 0;
  for (let i = 0; i < 20 * 60 && frames.length; i++) {
    now += 1000 / 60;
    frames.shift()!(now);
  }
  expect(frames.length).toBeGreaterThan(0); // still asking for frames
  const end = times[times.length - 1];
  expect(end - times[times.length - 2]).toBeCloseTo(1 / 60, 4); // still at full speed
});
