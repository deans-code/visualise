import type { Shape } from './communities'

/** A centred marker. Shape, not just colour, tells groups apart. `r` is the radius of the circumscribed circle. */
export function ShapeMark({ shape, r = 10, className }: { shape: Shape; r?: number; className?: string }) {
  const props = { className }
  switch (shape) {
    case 'circle':
      return <circle r={r} {...props} />
    case 'square':
      return <rect x={-r * 0.85} y={-r * 0.85} width={r * 1.7} height={r * 1.7} rx={2} {...props} />
    case 'diamond':
      return <polygon points={`0,${-r * 1.15} ${r * 1.15},0 0,${r * 1.15} ${-r * 1.15},0`} {...props} />
    case 'triangle':
      return <polygon points={`0,${-r * 1.1} ${r * 1.05},${r * 0.85} ${-r * 1.05},${r * 0.85}`} {...props} />
    case 'hexagon':
      return (
        <polygon
          points={[0, 1, 2, 3, 4, 5]
            .map((i) => `${(r * Math.cos((Math.PI / 3) * i)).toFixed(2)},${(r * Math.sin((Math.PI / 3) * i)).toFixed(2)}`)
            .join(' ')}
          {...props}
        />
      )
    case 'cross': {
      const a = r * 0.4
      return (
        <polygon
          points={`${-a},${-r} ${a},${-r} ${a},${-a} ${r},${-a} ${r},${a} ${a},${a} ${a},${r} ${-a},${r} ${-a},${a} ${-r},${a} ${-r},${-a} ${-a},${-a}`}
          {...props}
        />
      )
    }
  }
}

export const groupClass = (slot: 0 | 1 | 2 | 3 | undefined) =>
  slot === undefined || slot === 0 ? 'group-other' : `group-${slot}`
