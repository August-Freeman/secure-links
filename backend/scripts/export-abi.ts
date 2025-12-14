import { promises as fs } from "fs";
import * as path from "path";

async function main() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "SecureLinks.sol",
    "SecureLinks.json"
  );
  const outDir = path.join(__dirname, "..", "shared", "abi");
  const outFile = path.join(outDir, "SecureLinks.json");

  const artifactRaw = await fs.readFile(artifactPath, "utf-8");
  const artifact = JSON.parse(artifactRaw);

  const abi = artifact.abi;
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(abi, null, 2), "utf-8");
  console.log("ABI exported to:", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


