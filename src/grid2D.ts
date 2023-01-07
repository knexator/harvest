////////////////////////////////
//****************************//
// Tiny 2D array library
interface vec2 {
    x: number,
    y: number,
}

export class Grid2D<T> {
    // 0 1 2
    // 3 4 5
    // 6 7 8
    constructor(
        public width: number,
        public height: number,
        private data: T[]) { }

    get(i: number, j: number): T;
    get<S>(i: number, j: number, outOfBounds: S): T | S;
    get<S>(i: number, j: number, outOfBounds?: S): T | S {
        if (!this.inBounds(i, j)) {
            if (arguments.length === 3) {
                return outOfBounds!;
            }
            throw new Error("get was out of bounds, and no default argument was given");
        }
        return this.data[i + j * this.width];
    }

    getV<S>(pos: vec2): T;
    getV<S>(pos: vec2, outOfBounds: S): T | S;
    getV<S>(pos: vec2, outOfBounds?: S): T | S {
        if (arguments.length === 2) {
            return this.get(pos.x, pos.y, outOfBounds!);
        } else {
            return this.get(pos.x, pos.y);
        }
    }

    set(i: number, j: number, value: T): void {
        if (!this.inBounds(i, j)) {
            throw new Error("can't set; out of bounds");
        }
        this.data[i + j * this.width] = value;
    }

    setV(pos: vec2, value: T): void {
        return this.set(pos.x, pos.y, value);
    }

    inBounds(i: number, j: number): boolean {
        return i >= 0 && i < this.width && j >= 0 && j < this.height;
    }

    inBoundsV(pos: vec2): boolean {
        return this.inBounds(pos.x, pos.y);
    }

    forEach(callback: (i: number, j: number, element: T) => void): void {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                callback(i, j, this.data[i + j * this.width]);
            }
        }
    }

    filter(discriminator: (i: number, j: number, element: T) => boolean): T[] {
        let result: T[] = [];
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (discriminator(i, j, this.data[i + j * this.width])) {
                    result.push(this.data[i + j * this.width]);
                }
            }
        }
        return result;
    }

    static init<T>(width: number, height: number, fillFunc: (i: number, j: number) => T) {
        let buffer: T[] = [];
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                buffer.push(fillFunc(i, j));
            }
        }
        return new Grid2D(width, height, buffer);
    }
}
//****************************//
////////////////////////////////