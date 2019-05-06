export interface CodingLoopBase {
    /**
     * Multiplies a subset of rows from a coding matrix by a full set of
     * input shards to produce some output shards.
     *
     * @param matrixRows The rows from the matrix to use.
     * @param inputs An array of byte arrays, each of which is one input shard.
     *               The inputs array may have extra buffers after the ones
     *               that are used.  They will be ignored.  The number of
     *               inputs used is determined by the length of the
     *               each matrix row.
     * @param inputCount The number of input byte arrays.
     * @param outputs Byte arrays where the computed shards are stored.  The
     *                outputs array may also have extra, unused, elements
     *                at the end.  The number of outputs computed, and the
     *                number of matrix rows used, is determined by
     *                outputCount.
     * @param outputCount The number of outputs to compute.
     * @param offset The index in the inputs and output of the first byte
     *               to process.
     * @param byteCount The number of bytes to process.
     */
    codeSomeShards(
        matrixRows: Buffer[],
        inputs: Buffer[],
        inputCount: number,
        outputs: Buffer[],
        outputCount: number,
        offset: number,
        byteCount: number
    ): void

    checkSomeShards(
        matrixRows: Buffer[],
        inputs: Buffer[], inputCount: number,
        toCheck: Buffer[], checkCount: number,
        offset: number, byteCount: number,
        tempBuffer: number[]
    ): boolean
}

export default CodingLoopBase;