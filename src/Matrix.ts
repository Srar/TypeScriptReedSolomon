import Galois from "./Galois";

export default class Matrix {

    private data: Buffer[] = [];

    constructor(private rows: number, private columns: number) {
        for (let i = 0; i < rows; i++) {
            this.data.push(Buffer.alloc(columns));
        }
    }

    /**
     * 创建一个指定大小的单位矩阵.
     */
    public static createIdentity(size: number): Matrix {
        const result: Matrix = new Matrix(size, size);
        for (let i = 0; i < size; i++) {
            result.set(i, i, 1);
        }
        return result;
    }

    /**
     * Returns a part of this matrix.
     * 返回矩阵的一部分
     */
    public submatrix(rmin: number, cmin: number, rmax: number, cmax: number): Matrix {
        let result: Matrix = new Matrix(rmax - rmin, cmax - cmin);
        for (let r = rmin; r < rmax; r++) {
            for (let c = cmin; c < cmax; c++) {
                result.data[r - rmin][c - cmin] = this.data[r][c];
            }
        }
        return result;
    }

    /**
     * Returns the value at row r, column c.
     * 返回指定矩阵中的行列值.
     */
    public get(row: number, column: number): number {
        if (row < 0 || this.rows <= row) {
            throw new RangeError("Row index out of range: " + row)
        }
        if (column < 0 || this.columns <= column) {
            throw new RangeError("Column index out of range: " + column);
        }
        return this.data[row][column];
    }

    /**
    * Sets the value at row r, column c.
    * 设定指定矩阵中的行列值.
    */
    public set(row: number, column: number, value: number) {
        if (row < 0 || this.rows <= row) {
            throw new RangeError("Row index out of range: " + row)
        }
        if (column < 0 || this.columns <= column) {
            throw new RangeError("Column index out of range: " + column);
        }
        if (value < 0) {
            value += 256;
        }
        if (value < 0 || value > 255) {
            throw new RangeError("Value out of range: " + value);
        }
        this.data[row][column] = value;;
    }

    /**
     * Multiplies this matrix (the one on the left) by another
     * matrix (the one on the right).
     * 两个矩阵相乘。
     */
    public times(right: Matrix): Matrix {
        if (this.getColumns() !== right.getRows()) {
            throw new RangeError(`Columns on left(${this.getColumns()}) is different than rows on right (${this.getRows})`);
        }

        console.log();
        console.log("times:");
        console.log(this.data);
        console.log(right.data);

        const result: Matrix = new Matrix(this.getRows(), right.getColumns());
        for (let r = 0; r < this.getRows(); r++) {
            for (let c = 0; c < right.getColumns(); c++) {
                let value: number = 0;
                for (let i = 0; i < this.getColumns(); i++) {
                    value ^= Galois.multiply(this.data[r][i], right.get(i, c));
                }

                result.set(r, c, value);
            }
        }

        console.log();
        return result;
    }

    /**
    * Exchanges two rows in the matrix.
    * 交换矩阵的两行
    */
    public swapRows(r1: number, r2: number): void {
        if (r1 < 0 || this.getRows() <= r1 || r2 < 0 || this.getRows() <= r2) {
            throw new RangeError("Row index out of range");
        }
        let tmp: Buffer = this.data[r1];
        this.data[r1] = this.data[r2];
        this.data[r2] = tmp;
    }

    /**
     * 扩增矩阵
     */
    public augment(right: Matrix): Matrix {
        if (this.getRows() !== right.getRows()) {
            throw new RangeError("Matrices don't have the same number of rows");
        }

        const localRows: number = this.getRows();
        const loacalColumns: number = this.getColumns();
        const result = new Matrix(localRows, loacalColumns + right.getColumns());
        for (let r = 0; r < localRows; r++) {
            for (let c = 0; c < loacalColumns; c++) {
                result.data[r][c] = this.data[r][c];
            }
            for (let c = 0; c < right.getColumns(); c++) {
                result.data[r][loacalColumns + c] = right.data[r][c];
            }
        }
        return result;
    }

    /**
     * Does the work of matrix inversion.
     *
     * Assumes that this is an r by 2r matrix.
     */
    public gaussianElimination() {
        const rows: number = this.getRows();
        // Clear out the part below the main diagonal and scale the main
        // diagonal to be 1.
        for (let r = 0; r < rows; r++) {
            // If the element on the diagonal is 0, find a row below
            // that has a non-zero and swap them.
            if (this.data[r][r] === 0) {
                for (let rowBelow = r + 1; rowBelow < rows; rowBelow++) {
                    if (this.data[rowBelow][r] !== 0) {
                        this.swapRows(rowBelow, r);
                        break;
                    }
                }
            }

            // If we couldn't find one, the matrix is singular.
            if (this.data[r][r] === 0) {
                throw new TypeError(`Matrix is singular`);
            }

            // Scale to 1.
            if (this.data[r][r] !== 1) {
                const scale = Galois.divide(1, this.data[r][r]);
                for (let c = 0; c < this.getColumns(); c++) {
                    this.set(r, c, Galois.multiply(this.data[r][c], scale));
                }
            }

            // Make everything below the 1 be a 0 by subtracting
            // a multiple of it.  (Subtraction and addition are
            // both exclusive or in the Galois field.)
            for (let rowBelow = r + 1; rowBelow < this.getRows(); rowBelow++) {
                if (this.data[rowBelow][r] !== 0) {
                    const scale: number = this.data[rowBelow][r];
                    for (let c = 0; c < this.getColumns(); c++) {
                        this.set(rowBelow, c, this.data[rowBelow][c] ^ Galois.multiply(scale, this.data[r][c]));
                    }
                }
            }
        }

        // Now clear the part above the main diagonal.
        for (let d = 0; d < this.getRows(); d++) {
            for (let rowAbove = 0; rowAbove < d; rowAbove++) {
                if (this.data[rowAbove][d] != 0) {
                    const scale: number = this.data[rowAbove][d];
                    for (let c = 0; c < this.getColumns(); c++) {
                        this.set(rowAbove, c, this.data[rowAbove][c] ^ Galois.multiply(scale, this.data[d][c]));
                    }
                }
            }
        }
    }

    /**
     * 矩阵求逆
     */
    public invert(): Matrix {
        if (this.getRows() !== this.getColumns()) {
            throw new RangeError(`Only square matrices can be inverted`);
        }
        let work: Matrix = this.augment(Matrix.createIdentity(this.getRows()));
        work.gaussianElimination();
        return work.submatrix(0, this.getRows(), this.getColumns(), this.getColumns() * 2);
    }

    public getRow(row: number): Buffer {
        let result: Buffer = Buffer.alloc(this.getColumns());
        for (let c = 0; c < this.getColumns(); c++) {
            result[c] = this.data[row][c];
        }
        return result;
    }

    public getRows(): number {
        return this.rows;
    }

    public getColumns(): number {
        return this.columns;
    }

}