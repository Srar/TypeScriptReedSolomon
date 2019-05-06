import Galois from "./Galois";
import Matrix from "./Matrix";
import InputOutputByteTableCodingLoop from "./InputOutputByteTableCodingLoop";

export default class ReedSolomon {

    private matrix: Matrix;
    private totalShardCount: number;
    private parityRows: Buffer[] = [];

    constructor(private dataShardCount: number, private parityShardCount: number) {
        // We can have at most 256 shards total, as any more would
        // lead to duplicate rows in the Vandermonde matrix, which
        // would then lead to duplicate rows in the built matrix
        // below. Then any subset of the rows containing the duplicate
        // rows would be singular.
        this.totalShardCount = this.dataShardCount + this.parityShardCount;
        if (256 < this.totalShardCount) {
            throw new Error("too many shards - max is 256");
        }

        this.matrix = ReedSolomon.buildMatrix(dataShardCount, this.totalShardCount);
        for (let i = 0; i < this.parityShardCount; i++) {
            this.parityRows[i] = this.matrix.getRow(dataShardCount + i);
        }
    }

    /**
     * Create the matrix to use for encoding, given the number of
     * data shards and the number of total shards.
     *
     * The top square of the matrix is guaranteed to be an identity
     * matrix, which means that the data shards are unchanged after
     * encoding.
     */
    private static buildMatrix(dataShards: number, totalShards: number): Matrix {
        // Start with a Vandermonde matrix.  This matrix would work,
        // in theory, but doesn't have the property that the data
        // shards are unchanged after encoding.
        const vandermonde: Matrix = ReedSolomon.vandermonde(totalShards, dataShards);

        // Multiple by the inverse of the top square of the matrix.
        // This will make the top square be the identity matrix, but
        // preserve the property that any square subset of rows is
        // invertible.
        const top: Matrix = vandermonde.submatrix(0, 0, dataShards, dataShards);
        
        return vandermonde.times(top.invert());
    }

    public encodeParity(shards: Buffer[], offset: number, byteCount: number) {
        // this.checkBuffersAndSizes(shards, offset, byteCount);

        let outputs: Buffer[] = [];
        for (let index = 0; index < this.parityShardCount; index++) {
            outputs.push(shards[index + this.dataShardCount]);
        }

        new InputOutputByteTableCodingLoop().codeSomeShards(
            this.parityRows,
            shards, this.dataShardCount,
            outputs, this.parityShardCount,
            offset, byteCount
        );
    }

    private checkBuffersAndSizes(shards: number[][], offset: number, byteCount: number) {
        if (shards.length !== this.totalShardCount) {
            throw new RangeError(`wrong number of shards: ${shards.length}`);
        }

        if (offset < 0) {
            throw new RangeError(`offset is negative: ${offset}`);
        }

        if (byteCount < 0) {
            throw new RangeError(`byteCount is negative: ${byteCount}`);
        }
    }

    public static vandermonde(rows: number, columns: number): Matrix {
        const result: Matrix = new Matrix(rows, columns);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                result.set(r, c, Galois.exp(r, c));
            }
        }
        return result;
    }

}