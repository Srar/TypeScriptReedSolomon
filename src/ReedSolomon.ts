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

    public decodeMissing(rawShards: Buffer[], offset: number, byteCount: number): Buffer[] {
        if (this.totalShardCount === rawShards.length) {
            const result: Buffer[] = [];
            for (const rawShard of rawShards) {
                const shardOffset: number = rawShard[0];
                const shardData: Buffer = rawShard.slice(1);
                if(shardOffset >= this.dataShardCount) {
                    continue;
                }
                result[shardOffset] = shardData;
            }
            return result;
        }

        if (rawShards.length < this.dataShardCount) {
            throw new Error("Not enough shards present");
        }

        let shards: Buffer[] = [];
        let shardSize: number = 0;
        let shardPresent: boolean[] = new Array(this.totalShardCount).fill(false);
        for (let index = 0; index < this.totalShardCount; index++) {
            if (rawShards[index]) {
                shardSize = rawShards[index].length - 1;
                shards[rawShards[index][0]] = rawShards[index].slice(1);
                shardPresent[rawShards[index][0]] = true;
            }
        }
        for (let index = 0; index < this.totalShardCount; index++) {
            if (shards[index] === undefined) {
                shards[index] = Buffer.alloc(shardSize);
            }
        }

        // Pull out the rows of the matrix that correspond to the
        // shards that we have and build a square matrix.  This
        // matrix could be used to generate the shards that we have
        // from the original data.
        //
        // Also, pull out an array holding just the shards that
        // correspond to the rows of the submatrix.  These shards
        // will be the input to the decoding process that re-creates
        // the missing data shards.
        const subMatrix: Matrix = new Matrix(this.dataShardCount, this.dataShardCount);
        let subShards: Buffer[] = [];
        {
            let subMatrixRow: number = 0;
            for (let matrixRow = 0; matrixRow < this.totalShardCount && subMatrixRow < this.dataShardCount; matrixRow++) {
                if (shardPresent[matrixRow]) {
                    for (let c = 0; c < this.dataShardCount; c++) {
                        subMatrix.set(subMatrixRow, c, this.matrix.get(matrixRow, c));
                    }
                    subShards.push(shards[matrixRow]);
                    subMatrixRow++;
                }
            }
        }

        // Invert the matrix, so we can go from the encoded shards
        // back to the original data.  Then pull out the row that
        // generates the shard that we want to decode.  Note that
        // since this matrix maps back to the orginal data, it can
        // be used to create a data shard, but not a parity shard.
        const dataDecodeMatrix: Matrix = subMatrix.invert();

        // Re-create any data shards that were missing.
        //
        // The input to the coding is all of the shards we actually
        // have, and the output is the missing data shards.  The computation
        // is done using the special decode matrix we just built.
        let outputs: Buffer[] = [];
        let matrixRows: Buffer[] = [];
        let outputCount: number = 0;
        for (let iShard = 0; iShard < this.dataShardCount; iShard++) {
            if (!shardPresent[iShard]) {
                outputs[outputCount] = shards[iShard];
                matrixRows[outputCount] = dataDecodeMatrix.getRow(iShard);
                outputCount++;
            }
        }

        new InputOutputByteTableCodingLoop().codeSomeShards(
            matrixRows,
            subShards, this.dataShardCount,
            outputs, outputCount,
            offset, byteCount
        );

        // Now that we have all of the data shards intact, we can
        // compute any of the parity that is missing.
        //
        // The input to the coding is ALL of the data shards, including
        // any that we just calculated.  The output is whichever of the
        // data shards were missing.
        outputCount = 0;
        for (let iShard = this.dataShardCount; iShard < this.totalShardCount; iShard++) {
            if (!shardPresent[iShard]) {
                outputs[outputCount] = shards[iShard];
                matrixRows[outputCount] = this.parityRows[iShard - this.dataShardCount];
                outputCount += 1;
            }
        }

        new InputOutputByteTableCodingLoop().codeSomeShards(
            matrixRows,
            shards, this.dataShardCount,
            outputs, outputCount,
            offset, byteCount);

        return shards.slice(0, this.dataShardCount);
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