import { useRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PLAY_SECONDS, useCanvasLoop } from '../useCanvasLoop';

function Loop({ draw }: { draw: (t: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(ref, (_c, _w, _h, t) => draw(t));
  return <canvas ref={ref} />;
}

afterEach(() => vi.restoreAllMocks());

test('a motif plays for PLAY_SECONDS, slows to a stop, then stops asking for frames', () => {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save() {}, restore() {}, clearRect() {}, setTransform() {},
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 100 } as DOMRect);

  const times: number[] = [];
  render(<Loop draw={(t) => times.push(t)} />);

  // Step 60 fps well past the limit.
  let now = 0;
  for (let i = 0; i < (PLAY_SECONDS + 5) * 60 && frames.length; i++) {
    now += 1000 / 60;
    frames.shift()!(now);
  }
  expect(frames).toHaveLength(0); // no more frames requested
  const end = times[times.length - 1];
  expect(end - times[0]).toBeLessThan(PLAY_SECONDS); // eased, so the clock ran less than wall time
  expect(end - times[times.length - 2]).toBeLessThan(0.002); // came to rest, not frozen mid-move
});
