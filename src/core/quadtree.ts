/**
 * Hierarchical QuadTree Spatial Index for Universe Engine V2.
 * 
 * Provides O(log N) spatial queries, viewport frustum culling, 
 * and demand-driven Level of Detail (LOD) spatial partitioning.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  radius?: number;
  data?: any;
}

export class QuadTree<T extends SpatialItem> {
  public bounds: BoundingBox;
  public capacity: number;
  public maxDepth: number;
  public depth: number;

  public items: T[] = [];
  public divided: boolean = false;

  public nw?: QuadTree<T>;
  public ne?: QuadTree<T>;
  public sw?: QuadTree<T>;
  public se?: QuadTree<T>;

  constructor(bounds: BoundingBox, capacity = 16, maxDepth = 8, depth = 0) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  public clear(): void {
    this.items = [];
    this.divided = false;
    this.nw = undefined;
    this.ne = undefined;
    this.sw = undefined;
    this.se = undefined;
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const hw = width / 2;
    const hh = height / 2;

    this.nw = new QuadTree<T>({ x, y, width: hw, height: hh }, this.capacity, this.maxDepth, this.depth + 1);
    this.ne = new QuadTree<T>({ x: x + hw, y, width: hw, height: hh }, this.capacity, this.maxDepth, this.depth + 1);
    this.sw = new QuadTree<T>({ x, y: y + hh, width: hw, height: hh }, this.capacity, this.maxDepth, this.depth + 1);
    this.se = new QuadTree<T>({ x: x + hw, y: y + hh, width: hw, height: hh }, this.capacity, this.maxDepth, this.depth + 1);

    this.divided = true;

    // Move existing items into children if needed
    const existing = this.items;
    this.items = [];
    for (const item of existing) {
      this.insertToChild(item);
    }
  }

  private insertToChild(item: T): boolean {
    if (this.nw?.contains(item) && this.nw.insert(item)) return true;
    if (this.ne?.contains(item) && this.ne.insert(item)) return true;
    if (this.sw?.contains(item) && this.sw.insert(item)) return true;
    if (this.se?.contains(item) && this.se.insert(item)) return true;
    
    // If it spans across boundaries, keep in parent node
    this.items.push(item);
    return true;
  }

  public contains(item: T): boolean {
    const r = item.radius || 0;
    return (
      item.x - r >= this.bounds.x &&
      item.x + r <= this.bounds.x + this.bounds.width &&
      item.y - r >= this.bounds.y &&
      item.y + r <= this.bounds.y + this.bounds.height
    );
  }

  public insert(item: T): boolean {
    if (!this.contains(item) && this.depth === 0) {
      // Root level handles bounds expansion or keeping item
      this.items.push(item);
      return true;
    }

    if (this.items.length < this.capacity || this.depth >= this.maxDepth) {
      this.items.push(item);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return this.insertToChild(item);
  }

  public queryRange(range: BoundingBox, found: T[] = []): T[] {
    if (!this.intersects(this.bounds, range)) {
      return found;
    }

    for (const item of this.items) {
      if (this.itemIntersectsRange(item, range)) {
        found.push(item);
      }
    }

    if (this.divided) {
      this.nw?.queryRange(range, found);
      this.ne?.queryRange(range, found);
      this.sw?.queryRange(range, found);
      this.se?.queryRange(range, found);
    }

    return found;
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      b.x > a.x + a.width ||
      b.x + b.width < a.x ||
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }

  private itemIntersectsRange(item: T, range: BoundingBox): boolean {
    const r = item.radius || 0;
    return !(
      item.x + r < range.x ||
      item.x - r > range.x + range.width ||
      item.y + r < range.y ||
      item.y - r > range.y + range.height
    );
  }
}
