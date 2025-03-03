import * as _ from "./globalConstants.js";
export default async function catImage(imagePath, { width, height }) {
  const base64 = await execAsync(["base64", "-w", "0", imagePath]);

  let offset = 0;
  let chunk = base64.substring(offset, 4096);
  let more = base64.length > 4096 ? 1 : 0;

  STD.out.printf(`\x1b_Ga=T,f=100,m=${more};${chunk}\x1b\\`);
  STD.out.flush();
  offset += 4096;

  // Loop for subsequent chunks (only with m=1 or m=0)
  while (offset < base64.length) {
    chunk = base64.substring(offset, offset + 4096);
    more = offset + 4096 < base64.length ? 1 : 0;
    STD.out.printf(`\x1b_Gm=${more};${chunk}\x1b\\`);
    STD.out.flush();
    offset += 4096;
  }
}
