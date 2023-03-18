import fs from "fs";

const wasmModule = require("./ext/acropalypse") as AcropalypseModule;

interface AcropalypseModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  cwrap(name: string, returnType: any, argTypes: any[]): Function;
  //   _acropalypse_decode(
  //     inputPtr: number,
  //     inputSize: number,
  //     outputPtr: number,
  //     width: number,
  //     height: number
  //   ): number;

  HEAPU8: Uint8Array;

  postRun:
    | Array<(module: AcropalypseModule) => void>
    | ((module: AcropalypseModule) => void)
    | undefined;
}

const acropalypse_recover = wasmModule.cwrap("acropalypse_recover", Number, [
  Number,
  Number,
  Number,
  Number,
  Number,
]);

console.log(wasmModule);

export interface AcropalypseOptions {
  /** Width of the phone's screen */
  width: number;

  /** Height of the phone's screen */
  height: number;
}

enum AcropalypseError {
  OK = 0,
  INVALID_PNG_HEADER = -1,
  INVALID_PNG_CHUNK = -2,
  INVALID_PNG_CRC = -3,
  INVALID_PNG_IHDR = -4,
  UNKNOWN_ERROR = -5,
}

// console.log(wasmModule);
export function acropalypseCheck(
  imageBuffer: Buffer,
  options: AcropalypseOptions
): AcropalypseError {
  const inputLen = imageBuffer.length;
  const outputLen = (options.width * 3 + 1) * options.height;

  const inputPtr = wasmModule._malloc(inputLen);
  const outputPtr = wasmModule._malloc(outputLen);

  const input = wasmModule.HEAPU8.subarray(inputPtr, inputPtr + inputLen);
  const output = wasmModule.HEAPU8.subarray(outputPtr, outputPtr + outputLen);

  input.set(imageBuffer);

  const result = acropalypse_recover(
    inputPtr,
    inputLen,
    outputPtr,
    options.width,
    options.height
  );

  wasmModule._free(inputPtr);
  wasmModule._free(outputPtr);

  if (result < -4) {
    return AcropalypseError.UNKNOWN_ERROR;
  }

  if (result > 0) {
    return AcropalypseError.OK;
  }

  return result as AcropalypseError;
}

export function containsExtraDecodableImage(
  imageBuffer: Buffer,
  options: AcropalypseOptions
): boolean {
  return (
    acropalypseCheck(imageBuffer, options) !==
    AcropalypseError.INVALID_PNG_CHUNK
  );
}

export const deviceMap: { [name: string]: AcropalypseOptions } = {
  "Pixel 3": { width: 1080, height: 2160 },
  "Pixel 3 XL": { width: 1440, height: 2960 },
  "Pixel 3a": { width: 1080, height: 2220 },
  "Pixel 3a XL": { width: 1080, height: 2160 },
  "Pixel 4": { width: 1080, height: 2280 },
  "Pixel 4 XL": { width: 1440, height: 3040 },
  "Pixel 4a": { width: 1080, height: 2340 },
  "Pixel 5": { width: 1080, height: 2340 },
  "Pixel 5a": { width: 1080, height: 2400 },
  "Pixel 6": { width: 1080, height: 2400 },
  "Pixel 6 Pro": { width: 1440, height: 3120 },
  "Pixel 6a": { width: 1080, height: 2400 },
  "Pixel 7": { width: 1080, height: 2400 },
  "Pixel 7 Pro": { width: 1440, height: 3120 },
};

export function getDeviceOptions(deviceName: string): AcropalypseOptions {
  if (Object.keys(deviceMap).includes(deviceName)) {
    return deviceMap[deviceName];
  }
  throw new Error(`Device ${deviceName} not found`);
}

export function getDeviceNames(): string[] {
  return Object.keys(deviceMap);
}
