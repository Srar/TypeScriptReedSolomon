import * as fs from "fs";
import * as path from "path";
import ReedSolomon from "./ReedSolomon";

const DATA_SHARDS: number = 4;
const PARITY_SHARDS: number = 2;
const TOTAL_SHARDS: number = DATA_SHARDS + PARITY_SHARDS;

const BYTES_IN_INT: number = 4;

if (process.argv.length !== 3) {
    console.log("Usage: ts-node SampleEncoder.ts <fileName>");
    process.exit(0);
}

const filePath: string = path.join(process.cwd(), process.argv[2]);

if (!fs.existsSync(filePath)) {
    console.log(`File is not exist: ${filePath}`);
    process.exit(0);
}

// Get the size of the input file.  (Files bigger that
// Integer.MAX_VALUE will fail here!)
const fileBytes: Buffer = fs.readFileSync(filePath);
const fileSize: number = fileBytes.length;

console.log(`File size: ${fileSize}`);

// Figure out how big each shard will be.  The total size stored
// will be the file size (8 bytes) plus the file.
const storedSize: number = fileSize + BYTES_IN_INT; // 13
const shardSize: number = (storedSize + DATA_SHARDS - 1) / DATA_SHARDS;

console.log(`Shard size: ${shardSize}`);

// Create a buffer holding the file size, followed by
// the contents of the file.
const bufferSize: number = shardSize * DATA_SHARDS;
const allBytes: Buffer = Buffer.alloc(bufferSize);

allBytes[0] = (fileSize >> 24);
allBytes[1] = (fileSize >> 16);
allBytes[2] = (fileSize >> 8);
allBytes[3] = fileSize;
fileBytes.forEach((e, i) => allBytes[4 + i] = e);

console.log("File bytes:");
console.log(fileBytes);

console.log("Data bytes:");
console.log(allBytes);

console.log("Shards bytes:");
const shards: Buffer[] = [];
for (let i = 0; i < TOTAL_SHARDS; i++) {
    if(i < DATA_SHARDS) {
        shards[i] = allBytes.slice(i * shardSize, i * shardSize + shardSize);
    } else {
        shards[i] = Buffer.alloc(shardSize);
    }
}
console.log(shards);

console.log();
let reedSolomon: ReedSolomon = new ReedSolomon(DATA_SHARDS, PARITY_SHARDS);
reedSolomon.encodeParity(shards, 0, shardSize);
console.log(shards);


