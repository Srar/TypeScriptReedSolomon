import Galois from "./Galois";
import CodingLoopBase from "./CodingLoopBase";

export default class InputOutputByteTableCodingLoop implements CodingLoopBase  {
    
    checkSomeShards(matrixRows: Buffer[], inputs: Buffer[], inputCount: number, toCheck: Buffer[], checkCount: number, offset: number, byteCount: number, tempBuffer: number[]): boolean {
        throw new Error("Method not implemented.");
    }
    
    codeSomeShards(
        matrixRows: Buffer[], 
        inputs: Buffer[], 
        inputCount: number, 
        outputs: Buffer[], 
        outputCount: number, 
        offset: number, 
        byteCount: number
    ): void {
        console.log("codeSomeShards");
        const table: Buffer[] = Galois.MULTIPLICATION_TABLE;
    
        let iInput: number = 0;
        let inputShard: Buffer = inputs[iInput];

        for (let iOutput = 0; iOutput < outputCount; iOutput++) {
            let outputShard: Buffer = outputs[iOutput];
            let matrixRow: Buffer = matrixRows[iOutput];
            let multTableRow: Buffer = table[matrixRow[iInput] & 0xFF];
            console.log(outputShard);
            console.log(matrixRow);
            for (let iByte = offset; iByte < offset + byteCount; iByte++) {
                outputShard[iByte] = multTableRow[inputShard[iByte] & 0xFF];
            }
        }

        console.log();

        for (let iInput = 1; iInput < inputCount; iInput++) {
            let inputShard: Buffer = inputs[iInput];
            for (let iOutput = 0; iOutput < outputCount; iOutput++) {
                let outputShard: Buffer = outputs[iOutput];
                let matrixRow: Buffer = matrixRows[iOutput];
                let multTableRow: Buffer = table[matrixRow[iInput] & 0xFF];
                for (let iByte = offset; iByte < offset + byteCount; iByte++) {
                    outputShard[iByte] ^= multTableRow[inputShard[iByte] & 0xFF];
                }
            }
        }

        // console.log();
        // console.log(inputs);

        // process.exit(0);
        
    }

}