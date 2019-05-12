import * as fs from "fs";
import * as path from "path";
import ReedSolomon from "./ReedSolomon";

const DATA_SHARDS: number = 4;
const PARITY_SHARDS: number = 2;
const BYTES_IN_INT: number = 4;

const TOTAL_SHARDS: number = DATA_SHARDS + PARITY_SHARDS;

const shards: Buffer[] = [
    new Buffer([0x00, 0x00, 0x00, 0x00, 0x09]),
    new Buffer([0x01, 0x31, 0x32, 0x33, 0x34]),
    new Buffer([0x02, 0x35, 0x36, 0x37, 0x38]),
    new Buffer([0x03, 0x39, 0x00, 0x00, 0x00]),
    new Buffer([0x04, 0x28, 0x69, 0x67, 0x1e]),
    new Buffer([0x05, 0x97, 0x43, 0x4c, 0x3d]),
];

const shardCount: number = shards.length;
const shardSize: number = shards[0].length;

console.log(`shardSize: ${shardSize}`);
console.log(`shardCount: ${shardCount}`);
console.log("shards:");
console.log(shards);
console.log();

const reedSolomon: ReedSolomon = new ReedSolomon(DATA_SHARDS, PARITY_SHARDS);
const decodedShards: Buffer[] = reedSolomon.decodeMissing(shards, 0, shards[0].length);

console.log("decodedShards:");
console.log(decodedShards);

const originBytes: Buffer = Buffer.concat(decodedShards);

const originFileSize: number = originBytes.readUInt32BE(0)
const originFileContent: Buffer = originBytes.slice(BYTES_IN_INT, BYTES_IN_INT + originFileSize);
console.log("originFileContent:");
console.log(originFileContent.toString());