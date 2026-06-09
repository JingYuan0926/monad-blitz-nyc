import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MemonadsModule", (m) => {
  const memonads = m.contract("Memonads");
  return { memonads };
});
